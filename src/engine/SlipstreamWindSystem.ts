import * as THREE from 'three';
import { CONFIG } from '../config';
import type { TrafficSpawner } from './TrafficSpawner';

/**
 * Side strips of the slipstream box: spawn at the bumper, stream toward −Z (screen bottom).
 */
export class SlipstreamWindSystem {
  readonly group = new THREE.Group();

  private readonly positions: Float32Array;
  /**
   * Per particle: offset X from vehicle center, offset Z from rear bumper
   * (lz = 0 at bumper, lz = −zd at far end of slipstream box).
   */
  private readonly offsetXZ: Float32Array;
  /** −1 = left strip, +1 = right strip (wind shearing past resistance at sides). */
  private readonly sideSign: Int8Array;
  /** Stable height above road (set when slot seeds; avoids Y flicker). */
  private readonly particleY: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;
  private readonly material: THREE.PointsMaterial;
  private readonly particlesPerVehicle: number;
  private readonly poolSlots: number;
  private readonly slotSeeded: boolean[];

  constructor() {
    this.group.name = 'SlipstreamWind';
    this.poolSlots = CONFIG.VEHICLE_POOL_SIZE;
    this.particlesPerVehicle = CONFIG.SLIPSTREAM_WIND_PARTICLES_PER_VEHICLE;
    const n = this.poolSlots * this.particlesPerVehicle;
    this.positions = new Float32Array(n * 3);
    this.offsetXZ = new Float32Array(n * 2);
    this.sideSign = new Int8Array(n);
    this.particleY = new Float32Array(n);
    this.slotSeeded = new Array(this.poolSlots).fill(false);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry = geometry;

    this.material = new THREE.PointsMaterial({
      color: CONFIG.SLIPSTREAM_WIND_COLOR,
      size: CONFIG.SLIPSTREAM_WIND_POINT_SIZE,
      transparent: true,
      opacity: CONFIG.SLIPSTREAM_WIND_OPACITY,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 2;
    this.group.add(this.points);

    this.hideAll();
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }

  reset(): void {
    this.slotSeeded.fill(false);
    this.hideAll();
  }

  private hideAll(): void {
    const n = this.poolSlots * this.particlesPerVehicle;
    const pos = this.positions;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      pos[j] = 0;
      pos[j + 1] = -400;
      pos[j + 2] = 0;
    }
    const attr = this.geometry.attributes.position;
    if (attr) attr.needsUpdate = true;
  }

  private randomLXInStrip(halfZW: number, side: -1 | 1): number {
    const inset = CONFIG.SLIPSTREAM_WIND_X_INSET;
    const strip = CONFIG.SLIPSTREAM_WIND_SIDE_STRIP_WIDTH;
    const outer = halfZW - inset;
    const inner = Math.max(0.02, outer - strip);
    const t = Math.random();
    const mag = inner + t * (outer - inner);
    return side * mag;
  }

  private clampLX(lx: number, halfZW: number, side: -1 | 1): number {
    const inset = CONFIG.SLIPSTREAM_WIND_X_INSET;
    const strip = CONFIG.SLIPSTREAM_WIND_SIDE_STRIP_WIDTH;
    const outer = halfZW - inset;
    const inner = Math.max(0.02, outer - strip);
    if (side < 0) {
      return Math.min(-inner, Math.max(-outer, lx));
    }
    return Math.min(outer, Math.max(inner, lx));
  }

  /** Spawn near rear bumper (lz ~ 0); sides only. */
  private seedSlot(slot: number, halfZW: number, zd: number): void {
    const K = this.particlesPerVehicle;
    const base = slot * K;
    const y0 = CONFIG.SLIPSTREAM_WIND_Y;
    const ySpread = CONFIG.SLIPSTREAM_WIND_Y_SPREAD;
    for (let k = 0; k < K; k++) {
      const i = base + k;
      const j = i * 2;
      const side = (k % 2 === 0 ? -1 : 1) as -1 | 1;
      this.sideSign[i] = side;
      this.offsetXZ[j] = this.randomLXInStrip(halfZW, side);
      this.offsetXZ[j + 1] = -Math.random() * 0.22 * zd;
      this.particleY[i] = y0 + (Math.random() * 2 - 1) * ySpread;
    }
  }

  /**
   * When playing, advances particles along −Z in the wake; when not playing, hides all points.
   */
  update(delta: number, playing: boolean, traffic: TrafficSpawner): void {
    if (!playing) {
      this.points.visible = false;
      return;
    }
    this.points.visible = true;

    const zw = CONFIG.SLIPSTREAM_ZONE_WIDTH;
    const zd = CONFIG.SLIPSTREAM_ZONE_DEPTH;
    const halfZW = zw / 2;
    const down = CONFIG.SLIPSTREAM_WIND_DOWN_SPEED * delta;
    const turb = CONFIG.SLIPSTREAM_WIND_TURBULENCE * delta;
    const K = this.particlesPerVehicle;
    const pos = this.positions;
    const off = this.offsetXZ;

    traffic.forEachPoolWindSlot((slot, active, cx, cz, hz) => {
      const base = slot * K;
      if (!active) {
        this.slotSeeded[slot] = false;
        for (let k = 0; k < K; k++) {
          const j = (base + k) * 3;
          pos[j] = 0;
          pos[j + 1] = -400;
          pos[j + 2] = 0;
        }
        return;
      }

      const rearZ = cz - hz;

      if (!this.slotSeeded[slot]) {
        this.seedSlot(slot, halfZW, zd);
        this.slotSeeded[slot] = true;
      }

      for (let k = 0; k < K; k++) {
        const pi = base + k;
        const oj = pi * 2;
        const side = this.sideSign[pi]! as -1 | 1;
        let lx = off[oj]!;
        let lz = off[oj + 1]!;

        lx += (Math.random() * 2 - 1) * turb;
        lz -= down + (Math.random() * 2 - 1) * turb * 0.12;

        lx = this.clampLX(lx, halfZW, side);

        if (lz < -zd) {
          lz = -Math.random() * 0.2 * zd;
          lx = this.randomLXInStrip(halfZW, side);
        }
        if (lz > 0.03) {
          lz = -Math.random() * 0.08 * zd;
        }

        off[oj] = lx;
        off[oj + 1] = lz;

        const pj = pi * 3;
        pos[pj] = cx + lx;
        pos[pj + 1] = this.particleY[pi]!;
        pos[pj + 2] = rearZ + lz;
      }
    });

    const attr = this.geometry.attributes.position;
    if (attr) attr.needsUpdate = true;
  }
}
