import * as THREE from 'three';
import { CONFIG, TRAFFIC_PAINT_COLORS } from '../config';
import type { TrafficPhase } from '../config';
import {
  COMPACT,
  TRUCK,
  buildCompactTrafficMesh,
  buildTruckTrafficMesh,
} from './TrafficVehicleVisuals';
import { playerInVehicleSlipstream } from './slipstreamOverlap';

export type TrafficCollisionBounds = {
  cx: number;
  cz: number;
  hx: number;
  hz: number;
};

type PoolEntry = {
  group: THREE.Group;
  active: boolean;
  laneIndex: number;
  speedMul: number;
  typeIndex: 0 | 1;
  tailMaterial: THREE.MeshBasicMaterial;
  tailBaseColor: THREE.Color;
};

/**
 * TrafficSpawner — Object-pooled vehicles (low-poly procedural meshes). Phase 1: no lane-change telegraph.
 */
export class TrafficSpawner {
  readonly group = new THREE.Group();

  private readonly pool: PoolEntry[] = [];
  private spawnAccMs = 0;
  private readonly despawnBehindZ = 25;
  private draftTailHighlight: PoolEntry | null = null;

  constructor() {
    this.group.name = 'TrafficGroup';
    const n = CONFIG.VEHICLE_POOL_SIZE;
    const half = Math.floor(n / 2);
    for (let i = 0; i < half; i++) this.pool.push(this.createVehicle(0, i));
    for (let i = 0; i < n - half; i++) this.pool.push(this.createVehicle(1, i + half));
  }

  private createVehicle(typeIndex: 0 | 1, paintSlotIndex: number): PoolEntry {
    const g = new THREE.Group();
    const paint =
      TRAFFIC_PAINT_COLORS[paintSlotIndex % TRAFFIC_PAINT_COLORS.length]!;
    const built =
      typeIndex === 0
        ? buildCompactTrafficMesh(COMPACT, paint)
        : buildTruckTrafficMesh(TRUCK, paint);
    g.add(built.root);
    const tailMaterial = built.tailMaterial;
    const tailBaseColor = tailMaterial.color.clone();

    g.visible = false;
    this.group.add(g);
    return {
      group: g,
      active: false,
      laneIndex: 1,
      speedMul: 1,
      typeIndex,
      tailMaterial,
      tailBaseColor,
    };
  }

  reset(): void {
    // Pre-warm so the first spawn fires on the first update (otherwise ~spawnRate ms wait).
    this.spawnAccMs = CONFIG.TRAFFIC_PHASES[0].spawnRate;
    for (const p of this.pool) {
      p.active = false;
      p.group.visible = false;
    }
  }

  private getPhase(elapsedMs: number): TrafficPhase {
    const phases = CONFIG.TRAFFIC_PHASES;
    let current = phases[0];
    for (const p of phases) {
      if (elapsedMs >= p.startTime) current = p;
    }
    return current;
  }

  private laneIndexToX(index: number): number {
    return (index - 1) * CONFIG.LANE_WIDTH;
  }

  private pickLane(phase: TrafficPhase): number {
    const lanes = phase.lanes;
    return lanes[Math.floor(Math.random() * lanes.length)]!;
  }

  /** Half depth (Z) for collision / spacing. */
  private hzFor(typeIndex: 0 | 1): number {
    const d = typeIndex === 0 ? COMPACT.d : TRUCK.d;
    return d / 2;
  }

  /**
   * Longitudinal Z interval [min, max] for vehicle body + slipstream box behind rear bumper.
   */
  private zFootprint(cz: number, hz: number): { min: number; max: number } {
    const zd = CONFIG.SLIPSTREAM_ZONE_DEPTH;
    return { min: cz - hz - zd, max: cz + hz };
  }

  private longFootprintsOverlap(
    czA: number,
    hzA: number,
    czB: number,
    hzB: number
  ): boolean {
    const buf = CONFIG.TRAFFIC_SPAWN_MIN_Z_BUFFER;
    const a = this.zFootprint(czA, hzA);
    const b = this.zFootprint(czB, hzB);
    const separated = a.max + buf <= b.min || b.max + buf <= a.min;
    return !separated;
  }

  /** Min center-Z for new car so its footprint clears **ahead** of another (same / adjacent lane). */
  private minCenterZAheadOfOther(idle: PoolEntry, other: PoolEntry): number {
    const hzO = this.hzFor(other.typeIndex);
    const hzI = this.hzFor(idle.typeIndex);
    const oz = other.group.position.z;
    return (
      oz +
      hzO +
      hzI +
      CONFIG.SLIPSTREAM_ZONE_DEPTH +
      CONFIG.TRAFFIC_SPAWN_MIN_Z_BUFFER
    );
  }

  /** Push spawn Z forward (+Z) until body+slipstream intervals do not overlap (same lane + adjacent). */
  private resolveSpawnZ(lane: number, idle: PoolEntry, z: number): number {
    const hzI = this.hzFor(idle.typeIndex);
    let zz = z;
    for (let iter = 0; iter < 40; iter++) {
      let changed = false;
      for (const o of this.pool) {
        if (!o.active || o === idle) continue;
        if (Math.abs(o.laneIndex - lane) > 1) continue;
        const hzO = this.hzFor(o.typeIndex);
        const oz = o.group.position.z;
        if (this.longFootprintsOverlap(zz, hzI, oz, hzO)) {
          const need = this.minCenterZAheadOfOther(idle, o);
          if (zz < need) {
            zz = need;
            changed = true;
          }
        }
      }
      if (!changed) break;
    }
    return zz;
  }

  /**
   * After movement, separate vehicles in same or adjacent lanes so Z footprints never overlap.
   */
  private separateOverlappingTraffic(): void {
    const buf = CONFIG.TRAFFIC_SPAWN_MIN_Z_BUFFER;
    const zd = CONFIG.SLIPSTREAM_ZONE_DEPTH;
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      const act = this.pool.filter(p => p.active);
      for (let i = 0; i < act.length; i++) {
        for (let j = i + 1; j < act.length; j++) {
          const a = act[i]!;
          const b = act[j]!;
          if (Math.abs(a.laneIndex - b.laneIndex) > 1) continue;
          const hzA = this.hzFor(a.typeIndex);
          const hzB = this.hzFor(b.typeIndex);
          const za = a.group.position.z;
          const zb = b.group.position.z;
          if (!this.longFootprintsOverlap(za, hzA, zb, hzB)) continue;
          // Push the ahead car (+Z) so rear footprint clears the other vehicle's front + buffer.
          if (za >= zb) {
            a.group.position.z = zb + hzB + hzA + zd + buf;
          } else {
            b.group.position.z = za + hzA + hzB + zd + buf;
          }
          changed = true;
        }
      }
      if (!changed) break;
    }
  }

  private trySpawn(elapsedMs: number): void {
    const idle = this.pool.find(p => !p.active);
    if (!idle) return;
    const phase = this.getPhase(elapsedMs);
    const lane = this.pickLane(phase);
    const variance = 1 + (Math.random() * 2 - 1) * phase.speedVariance;
    idle.laneIndex = lane;
    idle.speedMul = Math.max(0.4, variance);
    idle.active = true;
    idle.group.visible = true;
    const jitter = Math.random() * CONFIG.TRAFFIC_SPAWN_AHEAD_Z_JITTER;
    let z = CONFIG.TAXI_POSITION_Z + CONFIG.TRAFFIC_SPAWN_AHEAD_Z + jitter;
    z = this.resolveSpawnZ(lane, idle, z);
    idle.group.position.set(this.laneIndexToX(lane), 0, z);
  }

  update(deltaSec: number, elapsedMs: number, scrollPerFrame: number): void {
    const phase = this.getPhase(elapsedMs);
    const spawnInterval = phase.spawnRate;
    this.spawnAccMs += deltaSec * 1000;
    while (this.spawnAccMs >= spawnInterval) {
      this.spawnAccMs -= spawnInterval;
      this.trySpawn(elapsedMs);
    }

    const scroll = scrollPerFrame * 60 * deltaSec;

    for (const p of this.pool) {
      if (!p.active) continue;
      const forward =
        CONFIG.VEHICLE_TRAFFIC_FORWARD_SPEED * 60 * deltaSec * p.speedMul;
      const net = scroll - forward;
      p.group.position.z -= Math.max(CONFIG.VEHICLE_TRAFFIC_MIN_APPROACH, net);
      if (p.group.position.z < CONFIG.TAXI_POSITION_Z - this.despawnBehindZ) {
        p.active = false;
        p.group.visible = false;
      }
    }

    this.separateOverlappingTraffic();
  }

  /**
   * One callback per pool slot (stable index). Used by slipstream wind visuals.
   * When `active` is false, `cx`/`cz`/`hz` are unused.
   */
  forEachPoolWindSlot(
    cb: (
      slotIndex: number,
      active: boolean,
      cx: number,
      cz: number,
      hz: number
    ) => void
  ): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i]!;
      if (!p.active) {
        cb(i, false, 0, 0, 0);
        continue;
      }
      const dims = p.typeIndex === 0 ? COMPACT : TRUCK;
      cb(i, true, p.group.position.x, p.group.position.z, dims.d / 2);
    }
  }

  getActiveCollisionBounds(): TrafficCollisionBounds[] {
    const out: TrafficCollisionBounds[] = [];
    for (const p of this.pool) {
      if (!p.active) continue;
      const dims = p.typeIndex === 0 ? COMPACT : TRUCK;
      out.push({
        cx: p.group.position.x,
        cz: p.group.position.z,
        hx: dims.w / 2,
        hz: dims.d / 2,
      });
    }
    return out;
  }

  /**
   * Brightens the draft target's tail lights (shared material for both lamps).
   * Call each frame while playing; `active` false restores the previous target.
   */
  setDraftTailHighlight(
    pb: { cx: number; cz: number; hx: number; hz: number },
    active: boolean
  ): void {
    if (!active) {
      this.clearDraftTailHighlight();
      return;
    }
    const target = this.findDraftTarget(pb);
    if (target) {
      if (this.draftTailHighlight !== target) {
        this.clearDraftTailHighlight();
        this.draftTailHighlight = target;
        target.tailMaterial.color
          .copy(target.tailBaseColor)
          .multiplyScalar(CONFIG.DRAFT_TAIL_BRIGHTNESS_MUL);
      }
    } else {
      this.clearDraftTailHighlight();
    }
  }

  private clearDraftTailHighlight(): void {
    if (this.draftTailHighlight) {
      this.draftTailHighlight.tailMaterial.color.copy(
        this.draftTailHighlight.tailBaseColor
      );
      this.draftTailHighlight = null;
    }
  }

  private findDraftTarget(pb: {
    cx: number;
    cz: number;
    hx: number;
    hz: number;
  }): PoolEntry | null {
    for (const p of this.pool) {
      if (!p.active) continue;
      const dims = p.typeIndex === 0 ? COMPACT : TRUCK;
      const v: TrafficCollisionBounds = {
        cx: p.group.position.x,
        cz: p.group.position.z,
        hx: dims.w / 2,
        hz: dims.d / 2,
      };
      if (playerInVehicleSlipstream(pb, v)) return p;
    }
    return null;
  }
}
