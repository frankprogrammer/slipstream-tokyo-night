import * as THREE from 'three';
import type { GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CONFIG } from '../config';

/**
 * Procedural dark asphalt albedo map (CanvasTexture, tiled on road planes).
 * Engine uses CONFIG.PALETTE only — no image assets.
 */
function createAsphaltTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('RoadManager: 2D canvas context unavailable');

  const base = new THREE.Color(CONFIG.PALETTE.ROAD_DARK);
  ctx.fillStyle = `#${base.getHexString()}`;
  ctx.fillRect(0, 0, size, size);

  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22;
    d[i] = Math.max(0, Math.min(255, d[i]! + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1]! + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2]! + n));
  }
  ctx.putImageData(img, 0, 0);

  ctx.globalAlpha = 0.06;
  ctx.fillStyle = '#000000';
  for (let y = 0; y < size; y += 6 + Math.floor(Math.random() * 8)) {
    ctx.fillRect(0, y, size, 1 + Math.random());
  }
  ctx.globalAlpha = 1;

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Scale + pivot imported road mesh to `ROAD_SEGMENT_VISUAL_WIDTH` × `ROAD_SEGMENT_LENGTH` (XZ) and sit on y=0.
 * Gameplay lanes still use `ROAD_WIDTH` (typically narrower, centered).
 */
function fitRoadGltfToSegment(gltf: GLTF): THREE.Group {
  const wrapper = new THREE.Group();
  const node = gltf.scene.clone(true);
  wrapper.add(node);

  node.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(node);
  const size = new THREE.Vector3();
  box.getSize(size);
  if (size.x < 1e-4 || size.z < 1e-4) {
    console.warn('RoadManager: GLB has very small bounds; skipping scale fit');
    return wrapper;
  }

  const widthRef =
    CONFIG.ROAD_SEGMENT_GLB_WIDTH > 0
      ? CONFIG.ROAD_SEGMENT_GLB_WIDTH
      : size.x;
  const depthRef =
    CONFIG.ROAD_SEGMENT_GLB_DEPTH > 0
      ? CONFIG.ROAD_SEGMENT_GLB_DEPTH
      : size.z;
  if (widthRef < 1e-4 || depthRef < 1e-4) {
    console.warn('RoadManager: GLB width/depth refs invalid; skipping scale fit');
    return wrapper;
  }

  const sx = CONFIG.ROAD_SEGMENT_VISUAL_WIDTH / widthRef;
  const sz = CONFIG.ROAD_SEGMENT_LENGTH / depthRef;
  const sy = (sx + sz) * 0.5;
  node.scale.set(sx, sy, sz);
  node.updateMatrixWorld(true);

  const box2 = new THREE.Box3().setFromObject(node);
  const center = new THREE.Vector3();
  box2.getCenter(center);
  node.position.x -= center.x;
  node.position.z -= center.z;
  node.position.y -= box2.min.y;
  node.updateMatrixWorld(true);

  wrapper.name = 'RoadSegmentGLB';
  return wrapper;
}

/**
 * RoadManager — Infinite road from recycling segments.
 * Procedural asphalt + markings, or cloned `CONFIG.ROAD_SEGMENT_GLB` per segment.
 */
export class RoadManager {
  readonly group = new THREE.Group();

  private readonly segments: {
    root: THREE.Group;
    zCenter: number;
  }[] = [];

  private readonly playerZ: number;
  private readonly recycleBehind = 40;

  /** Use `create()` — loads GLB when `CONFIG.ROAD_SEGMENT_GLB` is set. */
  private constructor(playerZ: number, glbTemplate: THREE.Group | null) {
    this.playerZ = playerZ;
    this.group.name = 'RoadGroup';

    if (glbTemplate) {
      this.buildGlbSegments(glbTemplate);
    } else {
      this.buildProceduralSegments();
    }
  }

  static async create(playerZ: number): Promise<RoadManager> {
    const path = CONFIG.ROAD_SEGMENT_GLB;
    if (path && path.length > 0) {
      try {
        const loader = new GLTFLoader();
        const gltf = await loader.loadAsync(path);
        const template = fitRoadGltfToSegment(gltf);
        return new RoadManager(playerZ, template);
      } catch (e) {
        console.warn(
          'RoadManager: failed to load ROAD_SEGMENT_GLB; using procedural road',
          e
        );
      }
    }
    return new RoadManager(playerZ, null);
  }

  private buildGlbSegments(template: THREE.Group): void {
    const L = CONFIG.ROAD_SEGMENT_LENGTH;
    const N = CONFIG.ROAD_VISIBLE_SEGMENTS;
    const firstCenter = this.playerZ - this.recycleBehind + L * 0.5;

    for (let i = 0; i < N; i++) {
      const root = new THREE.Group();
      const zCenter = firstCenter + i * L;
      root.position.z = zCenter;

      const road = template.clone(true);
      root.add(road);

      this.group.add(root);
      this.segments.push({ root, zCenter });
    }
  }

  private buildProceduralSegments(): void {
    const asphaltMap = createAsphaltTexture();
    const L = CONFIG.ROAD_SEGMENT_LENGTH;
    const halfW = CONFIG.ROAD_WIDTH / 2;
    asphaltMap.repeat.set(
      CONFIG.ROAD_WIDTH / CONFIG.ROAD_ASPHALT_TILE_WORLD,
      L / CONFIG.ROAD_ASPHALT_TILE_WORLD
    );
    asphaltMap.needsUpdate = true;

    const roadMat = new THREE.MeshStandardMaterial({
      color: CONFIG.PALETTE.ROAD_DARK,
      map: asphaltMap,
      roughness: 0.94,
      metalness: 0.04,
    });

    const markingColor = CONFIG.PALETTE.LANE_MARKING;
    const markingMat = new THREE.MeshStandardMaterial({
      color: markingColor,
      emissive: markingColor,
      emissiveIntensity: CONFIG.ROAD_LANE_MARKING_EMISSIVE,
      roughness: 0.45,
      metalness: 0,
    });

    const curbColor = new THREE.Color(CONFIG.PALETTE.ROAD_DARK).lerp(
      new THREE.Color(0x444458),
      0.35
    );
    const edgeMat = new THREE.MeshStandardMaterial({
      color: curbColor,
      roughness: 0.92,
      metalness: 0.08,
    });

    const N = CONFIG.ROAD_VISIBLE_SEGMENTS;
    const dashLen = CONFIG.ROAD_LANE_DASH_LENGTH;
    const gapLen = CONFIG.ROAD_LANE_DASH_GAP;
    const step = dashLen + gapLen;
    const mw = CONFIG.ROAD_LANE_MARKING_WIDTH;
    const dividerXs = [-CONFIG.LANE_WIDTH / 2, CONFIG.LANE_WIDTH / 2];

    const firstCenter = this.playerZ - this.recycleBehind + L * 0.5;
    for (let i = 0; i < N; i++) {
      const root = new THREE.Group();
      const zCenter = firstCenter + i * L;
      root.position.z = zCenter;

      const planeGeo = new THREE.PlaneGeometry(CONFIG.ROAD_WIDTH, L);
      planeGeo.rotateX(-Math.PI / 2);
      const road = new THREE.Mesh(planeGeo, roadMat);
      road.position.y = 0.01;
      root.add(road);

      const startZ = -L / 2 + 2.5;
      const endZ = L / 2 - 2.5;
      for (const x of dividerXs) {
        for (let z = startZ; z < endZ; z += step) {
          const dashGeo = new THREE.PlaneGeometry(mw, dashLen);
          dashGeo.rotateX(-Math.PI / 2);
          const dash = new THREE.Mesh(dashGeo, markingMat);
          dash.position.set(x, 0.02, z + dashLen / 2);
          root.add(dash);
        }
      }

      const edgeInset = CONFIG.ROAD_LANE_EDGE_INSET;
      const edgeW = CONFIG.ROAD_LANE_MARKING_WIDTH * 0.85;
      const edgeGeo = new THREE.PlaneGeometry(edgeW, L - 3);
      edgeGeo.rotateX(-Math.PI / 2);
      const edgeL = new THREE.Mesh(edgeGeo, markingMat);
      edgeL.position.set(-halfW + edgeInset, 0.021, 0);
      root.add(edgeL);
      const edgeR = new THREE.Mesh(edgeGeo.clone(), markingMat);
      edgeR.position.set(halfW - edgeInset, 0.021, 0);
      root.add(edgeR);

      const curbGeo = new THREE.BoxGeometry(0.15, 0.08, L);
      const leftEdge = new THREE.Mesh(curbGeo, edgeMat);
      leftEdge.position.set(-halfW, 0.05, 0);
      root.add(leftEdge);
      const rightEdge = new THREE.Mesh(curbGeo, edgeMat);
      rightEdge.position.set(halfW, 0.05, 0);
      root.add(rightEdge);

      this.group.add(root);
      this.segments.push({ root, zCenter });
    }
  }

  reset(): void {
    const L = CONFIG.ROAD_SEGMENT_LENGTH;
    const N = CONFIG.ROAD_VISIBLE_SEGMENTS;
    const firstCenter = this.playerZ - this.recycleBehind + L * 0.5;
    for (let i = 0; i < N; i++) {
      const zCenter = firstCenter + i * L;
      this.segments[i].zCenter = zCenter;
      this.segments[i].root.position.z = zCenter;
    }
  }

  /**
   * Scroll road toward -Z (world moves past the player).
   * dz is positive distance to subtract from segment z each frame.
   */
  update(dz: number): void {
    if (dz <= 0) return;
    const L = CONFIG.ROAD_SEGMENT_LENGTH;
    let maxZ = -Infinity;
    for (const s of this.segments) {
      s.zCenter -= dz;
      s.root.position.z = s.zCenter;
      if (s.zCenter > maxZ) maxZ = s.zCenter;
    }
    for (const s of this.segments) {
      if (s.zCenter < this.playerZ - this.recycleBehind) {
        s.zCenter = maxZ + L;
        s.root.position.z = s.zCenter;
        maxZ = s.zCenter;
      }
    }
  }
}
