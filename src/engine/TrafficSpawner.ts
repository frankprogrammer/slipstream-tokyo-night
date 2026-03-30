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
  headlightGroup: THREE.Group;
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
  private spawnsSinceRail = 0;
  private railPatternIndex = 0;
  private railStepIndex = 0;
  private railActive = false;

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
    const headlightGroup = built.headlightGroup;

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
      headlightGroup,
    };
  }

  reset(): void {
    // Pre-warm so the first spawn fires on the first update (otherwise ~spawnRate ms wait).
    this.spawnAccMs = CONFIG.TRAFFIC_PHASES[0].spawnRate;
    this.spawnsSinceRail = 0;
    this.railPatternIndex = 0;
    this.railStepIndex = 0;
    this.railActive = false;
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

  private startNextRail(): void {
    this.railActive = true;
    this.railStepIndex = 0;
  }

  private getCurrentRailPattern(): readonly number[] {
    const all = CONFIG.FLOW_RAILS_PATTERNS;
    return all[this.railPatternIndex % all.length] ?? [];
  }

  private resolveRailLaneToPhase(phase: TrafficPhase, desiredLane: number): number {
    if (phase.lanes.includes(desiredLane)) return desiredLane;
    let best = phase.lanes[0]!;
    let bestDist = Math.abs(best - desiredLane);
    for (const lane of phase.lanes) {
      const d = Math.abs(lane - desiredLane);
      if (d < bestDist) {
        best = lane;
        bestDist = d;
      }
    }
    return best;
  }

  private shouldStartRail(elapsedMs: number, phase: TrafficPhase): boolean {
    if (!CONFIG.FLOW_RAILS_ENABLED) return false;
    if (this.railActive) return false;
    if (CONFIG.FLOW_RAILS_PATTERNS.length === 0) return false;
    if (elapsedMs < CONFIG.FLOW_RAILS_START_MS) return false;
    if (phase.lanes.length < 2) return false;
    return this.spawnsSinceRail >= CONFIG.FLOW_RAILS_GAP_SPAWNS;
  }

  private pickLane(phase: TrafficPhase, elapsedMs: number): number {
    if (this.shouldStartRail(elapsedMs, phase)) {
      this.startNextRail();
    }
    if (this.railActive) {
      const pattern = this.getCurrentRailPattern();
      if (pattern.length > 0) {
        const rawLane = pattern[this.railStepIndex % pattern.length]!;
        return this.resolveRailLaneToPhase(phase, rawLane);
      }
    }
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
    const lane = this.pickLane(phase, elapsedMs);
    const varianceScale = this.railActive ? CONFIG.FLOW_RAILS_SPEED_VARIANCE_SCALE : 1;
    const variance = 1 + (Math.random() * 2 - 1) * phase.speedVariance * varianceScale;
    idle.laneIndex = lane;
    idle.speedMul = Math.max(0.4, variance);
    idle.active = true;
    idle.group.visible = true;
    idle.headlightGroup.visible = false;
    const jitter = Math.random() * CONFIG.TRAFFIC_SPAWN_AHEAD_Z_JITTER;
    let z = CONFIG.TAXI_POSITION_Z + CONFIG.TRAFFIC_SPAWN_AHEAD_Z + jitter;
    z = this.resolveSpawnZ(lane, idle, z);
    idle.group.position.set(this.laneIndexToX(lane), 0, z);

    if (this.railActive) {
      this.railStepIndex += 1;
      const pattern = this.getCurrentRailPattern();
      if (pattern.length === 0 || this.railStepIndex >= pattern.length) {
        this.railActive = false;
        this.railStepIndex = 0;
        this.railPatternIndex = (this.railPatternIndex + 1) % Math.max(1, CONFIG.FLOW_RAILS_PATTERNS.length);
        this.spawnsSinceRail = 0;
      }
    } else {
      this.spawnsSinceRail += 1;
    }
  }

  update(deltaSec: number, elapsedMs: number, scrollPerFrame: number): void {
    const phase = this.getPhase(elapsedMs);
    const spawnInterval =
      this.railActive
        ? phase.spawnRate * CONFIG.FLOW_RAILS_SPAWN_RATE_SCALE
        : phase.spawnRate;
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
        p.headlightGroup.visible = false;
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

  /**
   * After a successful slipstream release, turn on fake headlamps for that car.
   * Uses nearest active vehicle to the slipstream snapshot — strict XZ matching fails
   * because the car moves between the last draft frame and the release frame.
   */
  enableHeadlightsAfterSlipstream(target: TrafficCollisionBounds | null): void {
    if (!target) return;
    const p = this.findClosestActiveVehicleXZ(target.cx, target.cz);
    if (p) p.headlightGroup.visible = true;
  }

  private findClosestActiveVehicleXZ(cx: number, cz: number): PoolEntry | null {
    const maxD = CONFIG.TRAFFIC_HEADLIGHT_MATCH_MAX_DIST;
    const maxSq = maxD * maxD;
    let best: PoolEntry | null = null;
    let bestSq = Infinity;
    for (const p of this.pool) {
      if (!p.active) continue;
      const dx = p.group.position.x - cx;
      const dz = p.group.position.z - cz;
      const sq = dx * dx + dz * dz;
      if (sq < bestSq && sq <= maxSq) {
        bestSq = sq;
        best = p;
      }
    }
    return best;
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
