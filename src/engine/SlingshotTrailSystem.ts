import * as THREE from 'three';
import { CONFIG } from '../config';
import type { PlayerTaxi } from './PlayerTaxi';

/**
 * Continuous boost beams from player taillights.
 * While boost is active, two long neon lines stay visible from each taillight toward screen bottom (−Z).
 */
export class SlingshotTrailSystem {
  readonly group = new THREE.Group();

  private readonly beams: {
    mesh: THREE.Mesh;
    material: THREE.MeshBasicMaterial;
  }[] = [];

  private readonly tailL = new THREE.Vector3();
  private readonly tailR = new THREE.Vector3();
  private boostActive = false;

  constructor() {
    this.group.name = 'SlingshotTrail';

    const w = CONFIG.SLINGSHOT_TRAIL_WIDTH * 0.75;
    const h = Math.max(0.04, CONFIG.SLINGSHOT_TRAIL_BOX_HEIGHT * 0.6);
    const len = Math.max(12, CONFIG.SLINGSHOT_TRAIL_LENGTH * 9);
    const geo = new THREE.BoxGeometry(w, h, len);
    geo.translate(0, 0, -len * 0.5);

    for (const color of [CONFIG.PALETTE.NEON_PINK, CONFIG.PALETTE.NEON_BLUE]) {
      const m = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geo, m);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 10;
      this.group.add(mesh);
      this.beams.push({ mesh, material: m });
    }
  }

  reset(): void {
    this.boostActive = false;
    for (const b of this.beams) {
      b.mesh.visible = false;
      b.material.opacity = 0;
    }
  }

  setBoostActive(active: boolean): void {
    this.boostActive = active;
  }

  private updateBeamAnchors(player: PlayerTaxi): void {
    player.getTailLightsWorldPositions(this.tailL, this.tailR);
    const left = this.beams[0]!;
    const right = this.beams[1]!;
    left.mesh.position.copy(this.tailL);
    right.mesh.position.copy(this.tailR);
    // No angle/random yaw: perfectly straight beams toward -Z.
    left.mesh.rotation.set(0, 0, 0);
    right.mesh.rotation.set(0, 0, 0);
  }

  update(delta: number, _scrollDz: number, player: PlayerTaxi): void {
    if (!this.boostActive) {
      for (const b of this.beams) {
        b.mesh.visible = false;
        b.material.opacity = Math.max(0, b.material.opacity - delta * 7);
      }
      return;
    }

    this.updateBeamAnchors(player);
    const pulse = 0.82 + 0.16 * Math.sin(performance.now() * 0.02);
    for (const b of this.beams) {
      b.mesh.visible = true;
      b.material.opacity = pulse;
    }
  }
}
