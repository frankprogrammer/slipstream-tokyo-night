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
   * Min |Δcz| between centers for same lane or adjacent lanes: both half-lengths + slipstream depth + buffer.
   */
  private minSpawnCenterZ(idle: PoolEntry, other: PoolEntry): number {
    return (
      this.hzFor(idle.typeIndex) +
      this.hzFor(other.typeIndex) +
      CONFIG.SLIPSTREAM_ZONE_DEPTH +
      CONFIG.TRAFFIC_SPAWN_MIN_Z_BUFFER
    );
  }

  /** Push spawn Z forward (+Z) until clear of active traffic in same or adjacent lanes. */
  private resolveSpawnZ(lane: number, idle: PoolEntry, z: number): number {
    let zz = z;
    for (let iter = 0; iter < 24; iter++) {
      let changed = false;
      for (const o of this.pool) {
        if (!o.active || o === idle) continue;
        const laneDiff = Math.abs(o.laneIndex - lane);
        if (laneDiff > 1) continue;
        const minD = this.minSpawnCenterZ(idle, o);
        const oz = o.group.position.z;
        if (Math.abs(zz - oz) < minD) {
          zz = oz + minD;
          changed = true;
        }
      }
      if (!changed) break;
    }
    return zz;
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
