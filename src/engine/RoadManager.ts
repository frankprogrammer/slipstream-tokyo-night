import * as THREE from 'three';
import { CONFIG, NEON_SIGN_COLORS } from '../config';

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

  // Subtle horizontal wear streaks
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

function hash01(n: number): number {
  const t = Math.sin(n * 12.9898) * 43758.5453123;
  return t - Math.floor(t);
}

/**
 * Roadside neon: emissive billboard + dark pole (palette colors only).
 * Deterministic per segment index + side so recycling stays stable.
 */
function addNeonSignToSegment(
  root: THREE.Group,
  segmentIndex: number,
  side: -1 | 1,
  L: number,
  halfW: number
): void {
  const seed = segmentIndex * 97 + side * 53;
  if (hash01(seed) >= CONFIG.PROP_DENSITY) return;

  const zJitter = (hash01(seed + 1) - 0.5) * (L - 5.5);
  const ci =
    Math.floor(hash01(seed + 2) * NEON_SIGN_COLORS.length) % NEON_SIGN_COLORS.length;
  const colorHex = NEON_SIGN_COLORS[ci]!;

  const xSign = side * (halfW + CONFIG.ROAD_NEON_OFFSET_X);
  const poleH = 1.35;
  const poleMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a20,
    roughness: 0.94,
    metalness: 0.18,
  });
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.085, poleH, 6),
    poleMat
  );
  pole.position.set(xSign, poleH / 2, zJitter);
  root.add(pole);

  const faceMat = new THREE.MeshStandardMaterial({
    color: colorHex,
    emissive: colorHex,
    emissiveIntensity: CONFIG.ROAD_NEON_EMISSIVE,
    roughness: 0.22,
    metalness: 0.06,
  });
  const bh = 1.28;
  const board = new THREE.Mesh(
    new THREE.BoxGeometry(1.05, bh, 0.14),
    faceMat
  );
  board.position.set(xSign + side * 0.07, poleH + bh / 2, zJitter);
  root.add(board);
}

/**
 * RoadManager — Infinite road from recycling segments.
 * Dark asphalt (procedural texture) + dashed lane dividers + solid edge lines.
 */
export class RoadManager {
  readonly group = new THREE.Group();

  private readonly segments: {
    root: THREE.Group;
    zCenter: number;
  }[] = [];

  private readonly playerZ: number;
  private readonly recycleBehind = 40;

  constructor(playerZ: number) {
    this.playerZ = playerZ;
    this.group.name = 'RoadGroup';

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

    const firstCenter = playerZ - this.recycleBehind + L * 0.5;
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

      // Solid edge lines (inset from barriers)
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

      addNeonSignToSegment(root, i, -1, L, halfW);
      addNeonSignToSegment(root, i, 1, L, halfW);

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
