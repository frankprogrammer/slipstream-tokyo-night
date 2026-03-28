export type State = 'playing' | 'gameover';

/**
 * GameState — Simple state machine.
 * playing: All systems update. Input active.
 * gameover: Everything frozen. Overlay visible. Retry active.
 */
export class GameState {
  private _state: State = 'playing';
  private _callbacks: ((state: State) => void)[] = [];

  get current(): State { return this._state; }
  get isPlaying(): boolean { return this._state === 'playing'; }

  onChange(cb: (state: State) => void): void { this._callbacks.push(cb); }

  transition(to: State): void {
    if (this._state === to) return;
    this._state = to;
    this._callbacks.forEach(cb => cb(to));
  }

  reset(): void { this._state = 'playing'; }
}
