import { CONFIG } from '../config';

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
}

/**
 * LaneSystem — 3-lane grid + touch + keyboard.
 * Lane centers: -LANE_WIDTH, 0, +LANE_WIDTH for indices 0,1,2.
 * Touch: pointerdown left/right of screen center = one lane step; pointermove maps X to three lane columns.
 */
export class LaneSystem {
  private readonly target: HTMLElement;
  private _laneIndex = 1;
  private _fromLane = 1;
  private _toLane = 1;
  private _switching = false;
  private _switchStartMs = 0;
  /** After slide ends: spring roll back to 0 with easeOutBack overshoot. */
  private _rollSpringing = false;
  private _springStartMs = 0;
  private _springDir: -1 | 1 = 1;
  private _pointerId: number | null = null;
  private _pointerDownX = 0;
  private _pointerDownY = 0;
  private _enabled = true;

  constructor(target: HTMLElement) {
    this.target = target;
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
    this._toLane = 1;
    this._switching = false;
    this._rollSpringing = false;
  }

  laneIndexToX(index: number): number {
    return (index - 1) * CONFIG.LANE_WIDTH;
  }

  getLaneX(nowMs: number): number {
    if (!this._switching) return this.laneIndexToX(this._laneIndex);
    const raw = Math.min(1, (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION);
    const e = easeOutBack(raw);
    const x0 = this.laneIndexToX(this._fromLane);
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
      const raw = Math.min(1, (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION);
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
      const raw = Math.min(1, (nowMs - this._switchStartMs) / CONFIG.LANE_SWITCH_DURATION);
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

  private tryBeginSwitch(delta: -1 | 1): void {
    if (!this._enabled || this._switching) return;
    const next = this._laneIndex + delta;
    if (next < 0 || next > CONFIG.LANE_COUNT - 1) return;
    this._fromLane = this._laneIndex;
    this._toLane = next;
    this._switching = true;
    this._switchStartMs = performance.now();
  }

  /** Move one lane toward `targetLane` when not already switching. */
  private tryStepTowardLane(targetLane: number): void {
    if (!this._enabled || this._switching) return;
    const t = Math.max(0, Math.min(CONFIG.LANE_COUNT - 1, targetLane));
    if (t === this._laneIndex) return;
    if (t < this._laneIndex) this.tryBeginSwitch(-1);
    else this.tryBeginSwitch(1);
  }

  /** Map client X to lane index using equal-width columns across `target`. */
  private clientXToLaneIndex(clientX: number): number {
    const rect = this.target.getBoundingClientRect();
    const w = Math.max(1e-6, rect.width);
    const u = (clientX - rect.left) / w;
    return Math.max(
      0,
      Math.min(CONFIG.LANE_COUNT - 1, Math.floor(u * CONFIG.LANE_COUNT))
    );
  }

  /**
   * Pointerdown: left/right of horizontal center → one lane step.
   * Matches keyboard arrow chase mapping (ArrowLeft / left half → +1, ArrowRight / right half → −1).
   */
  private onTouchCenterHalf(clientX: number): void {
    const rect = this.target.getBoundingClientRect();
    const cx = rect.left + rect.width * 0.5;
    const dead = CONFIG.TOUCH_CENTER_DEAD_ZONE_PX;
    if (Math.abs(clientX - cx) <= dead) return;
    if (clientX < cx) this.tryBeginSwitch(1);
    else this.tryBeginSwitch(-1);
  }

  private bindPointer(): void {
    this.target.addEventListener('pointerdown', (e: PointerEvent) => {
      if (!this._enabled || this._pointerId !== null) return;
      this._pointerId = e.pointerId;
      this._pointerDownX = e.clientX;
      this._pointerDownY = e.clientY;
      this.target.setPointerCapture(e.pointerId);
      this.onTouchCenterHalf(e.clientX);
    });
    this.target.addEventListener('pointermove', (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      const dx = e.clientX - this._pointerDownX;
      const dy = e.clientY - this._pointerDownY;
      if (dx * dx + dy * dy < CONFIG.TOUCH_DRAG_SLOP_PX * CONFIG.TOUCH_DRAG_SLOP_PX) {
        return;
      }
      this.tryStepTowardLane(this.clientXToLaneIndex(e.clientX));
    });
    this.target.addEventListener('pointerup', (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      this.target.releasePointerCapture(e.pointerId);
      this._pointerId = null;
    });
    this.target.addEventListener('pointercancel', (e: PointerEvent) => {
      if (e.pointerId !== this._pointerId) return;
      this._pointerId = null;
    });
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (!this._enabled) return;
      // Desktop: opposite lane delta vs swipe so screen-left/right matches chase view.
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
        e.preventDefault();
        this.tryBeginSwitch(1);
      } else if (e.code === 'ArrowRight' || e.code === 'KeyD') {
        e.preventDefault();
        this.tryBeginSwitch(-1);
      }
    });
  }
}

const DEG2RAD = Math.PI / 180;
