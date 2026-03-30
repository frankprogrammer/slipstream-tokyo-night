import * as THREE from "three";
import { CONFIG } from "../config";

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * LaneSystem — 3-lane grid + touch + keyboard.
 * Lane centers: -LANE_WIDTH, 0, +LANE_WIDTH for indices 0,1,2.
 * Touch: pointerdown left/right of player position = one lane step; pointermove maps X to three lane columns.
 */
export class LaneSystem {
  private readonly target: HTMLElement;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly _tmpWorld = new THREE.Vector3();
  private _laneIndex = 1;
  private _fromLane = 1;
  private _fromX = 0;
  private _toLane = 1;
  private _switching = false;
  private _switchStartMs = 0;
  /** After slide ends: spring roll back to 0 with easeOutBack overshoot. */
  private _rollSpringing = false;
  private _springStartMs = 0;
  private _springDir: -1 | 1 = 1;
  private _pointerId: number | null = null;
  private _enabled = true;

  constructor(target: HTMLElement, camera: THREE.PerspectiveCamera) {
    this.target = target;
    this.camera = camera;
    this._fromX = this.laneIndexToX(1);
    this.bindPointer();
    this.bindKeyboard();
  }

  set enabled(enabled: boolean) {
    this._enabled = enabled;
  }

  get laneIndex(): number {
    return this._switching ? this._toLane : this._laneIndex;
  }

  reset(): void {
    this._laneIndex = 1;
    this._fromLane = 1;
    this._fromX = this.laneIndexToX(1);
    this._toLane = 1;
    this._switching = false;
    this._rollSpringing = false;
    this._pointerId = null;
  }

  laneIndexToX(index: number): number {
    return (index - 1) * CONFIG.LANE_WIDTH;
  }

  getLaneX(nowMs: number): number {
    if (!this._switching) return this.laneIndexToX(this._laneIndex);
    const raw = Math.min(
      1,
      (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION,
    );
    const e = easeOutBack(raw);
    const x0 = this._fromX;
    const x1 = this.laneIndexToX(this._toLane);
    if (raw >= 1) {
      this._springDir = this._toLane > this._fromLane ? 1 : -1;
      this._rollSpringing = true;
      this._springStartMs = nowMs;
      this._switching = false;
      this._laneIndex = this._toLane;
    }
    return x0 + (x1 - x0) * e;
  }

  /**
   * Roll about Z: lean into the lane change during slide, then spring back with overshoot.
   */
  getBodyRollRad(nowMs: number): number {
    const amp = DEG2RAD * CONFIG.TAXI_BODY_ROLL;

    if (this._switching) {
      const raw = Math.min(
        1,
        (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION,
      );
      const dir = Math.sign(this._toLane - this._fromLane) || 1;
      return dir * amp * Math.sin(raw * Math.PI * 0.5);
    }

    if (this._rollSpringing) {
      const raw = (nowMs - this._springStartMs) / CONFIG.TAXI_ROLL_DURATION;
      if (raw >= 1) {
        this._rollSpringing = false;
        return 0;
      }
      const t = Math.min(1, raw);
      const e = easeOutBack(t);
      return this._springDir * amp * (1 - e);
    }

    return 0;
  }

  /** Front wheel steer (rad), same envelope as body roll. */
  getWheelSteerRad(nowMs: number): number {
    const amp = DEG2RAD * CONFIG.TAXI_WHEEL_TURN;

    if (this._switching) {
      const raw = Math.min(
        1,
        (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION,
      );
      const dir = Math.sign(this._toLane - this._fromLane) || 1;
      return dir * amp * Math.sin(raw * Math.PI * 0.5);
    }

    if (this._rollSpringing) {
      const raw = (nowMs - this._springStartMs) / CONFIG.TAXI_ROLL_DURATION;
      if (raw >= 1) {
        this._rollSpringing = false;
        return 0;
      }
      const t = Math.min(1, raw);
      const e = easeOutBack(t);
      return this._springDir * amp * (1 - e);
    }

    return 0;
  }

  private laneIndexFromRoadU(u: number): number {
    return Math.max(
      0,
      Math.min(CONFIG.LANE_COUNT - 1, Math.floor(u * CONFIG.LANE_COUNT)),
    );
  }

  /** Map road-local x (same frame as `laneIndexToX`) to lane index. */
  private laneIndexFromRoadX(x: number): number {
    const roadLeft = this.laneIndexToX(0) - CONFIG.LANE_WIDTH * 0.5;
    const roadWidth = CONFIG.LANE_COUNT * CONFIG.LANE_WIDTH;
    const u = (x - roadLeft) / roadWidth;
    return this.laneIndexFromRoadU(u);
  }

  private switchToLane(targetLane: number): void {
    if (!this._enabled) return;
    const clamped = Math.max(0, Math.min(CONFIG.LANE_COUNT - 1, targetLane));
    const now = performance.now();
    const currentX = this.getLaneX(now);
    const fromLane = this.laneIndexFromRoadX(currentX);
    if (clamped === fromLane) return;

    this._laneIndex = fromLane;
    this._fromLane = fromLane;
    this._fromX = currentX;
    this._toLane = clamped;
    this._switching = true;
    this._switchStartMs = now;
    this._rollSpringing = false;
  }

  /** Map client X to lane index using equal-width columns across `target`. */
  private clientXToLaneIndex(clientX: number): number {
    const projected = this.pickLaneFromProjectedScreenX(clientX);
    if (projected !== null) return projected;

    const rect = this.target.getBoundingClientRect();
    const w = Math.max(1e-6, rect.width);
    const u = (clientX - rect.left) / w;
    return this.laneIndexFromRoadU(u);
  }

  /** Project a world-space lane center (at taxi Z) to screen X pixels. */
  private worldXToScreenX(worldX: number): number | null {
    this.camera.updateMatrixWorld();
    this._tmpWorld.set(worldX, 0, CONFIG.TAXI_POSITION_Z).project(this.camera);
    if (!Number.isFinite(this._tmpWorld.x) || !Number.isFinite(this._tmpWorld.z)) {
      return null;
    }
    if (this._tmpWorld.z < -1 || this._tmpWorld.z > 1) return null;
    const rect = this.target.getBoundingClientRect();
    const u = this._tmpWorld.x * 0.5 + 0.5;
    return rect.left + u * rect.width;
  }

  /** Pick nearest lane by projected screen X, so lane taps follow active camera/FOV. */
  private pickLaneFromProjectedScreenX(clientX: number): number | null {
    let bestLane = -1;
    let bestDist = Infinity;
    for (let i = 0; i < CONFIG.LANE_COUNT; i++) {
      const sx = this.worldXToScreenX(this.laneIndexToX(i));
      if (sx === null) continue;
      const d = Math.abs(clientX - sx);
      if (d < bestDist) {
        bestDist = d;
        bestLane = i;
      }
    }
    return bestLane >= 0 ? bestLane : null;
  }

  /**
   * Pointerdown: compare touch X to current player X → one lane step.
   * Phaser/chase mapping: touch left of player moves lane +1 (screen-right), touch right moves lane -1.
   */
  private onTouchRelativeToPlayer(clientX: number): void {
    const laneNow = this.laneIndexFromRoadX(this.getLaneX(performance.now()));
    this._laneIndex = laneNow;
    const playerScreenX = this.worldXToScreenX(this.getLaneX(performance.now()));
    const px = playerScreenX ?? clientX;
    if (clientX < px) {
      this.switchToLane(laneNow + 1);
    } else if (clientX > px) {
      this.switchToLane(laneNow - 1);
    }
  }

  private bindPointer(): void {
    this.target.addEventListener("pointerdown", (e: PointerEvent) => {
      if (!this._enabled || this._pointerId !== null) return;
      if (e.button === 2) return;
      this._pointerId = e.pointerId;
      this.target.setPointerCapture(e.pointerId);
      this.onTouchRelativeToPlayer(e.clientX);
    });
    this.target.addEventListener("pointermove", (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      this.switchToLane(this.clientXToLaneIndex(e.clientX));
    });
    this.target.addEventListener("pointerup", (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      this.target.releasePointerCapture(e.pointerId);
      this._pointerId = null;
    });
    this.target.addEventListener("pointercancel", (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      this._pointerId = null;
    });
  }

  private bindKeyboard(): void {
    window.addEventListener("keydown", (e: KeyboardEvent) => {
      if (!this._enabled) return;
      if (e.code === "ArrowLeft" || e.code === "KeyA") {
        e.preventDefault();
        this.switchToLane(
          this.laneIndexFromRoadX(this.getLaneX(performance.now())) + 1,
        );
      } else if (e.code === "ArrowRight" || e.code === "KeyD") {
        e.preventDefault();
        this.switchToLane(
          this.laneIndexFromRoadX(this.getLaneX(performance.now())) - 1,
        );
      }
    });
  }
}

const DEG2RAD = Math.PI / 180;
