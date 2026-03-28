/**
 * GameOverScreen — HTML/CSS overlay for end-of-run results.
 *
 * Targets existing DOM elements in index.html:
 * - #gameover: container, toggled via .visible class
 * - #final-score: large score number
 * - #new-best: shown only if new high score
 * - #stat-chain: best chain this run
 * - #stat-distance: distance traveled
 * - #retry-btn: tap to restart (MUST be under 1 second to playing)
 *
 * On show: populate stats, check high score, display.
 * On retry: hide overlay, emit restart event.
 */
export class GameOverScreen {
  private container: HTMLElement;
  private finalScoreEl: HTMLElement;
  private newBestEl: HTMLElement;
  private chainEl: HTMLElement;
  private distanceEl: HTMLElement;
  private retryBtn: HTMLElement;
  private _onRetry: (() => void) | null = null;

  constructor() {
    this.container = document.getElementById('gameover')!;
    this.finalScoreEl = document.getElementById('final-score')!;
    this.newBestEl = document.getElementById('new-best')!;
    this.chainEl = document.getElementById('stat-chain')!;
    this.distanceEl = document.getElementById('stat-distance')!;
    this.retryBtn = document.getElementById('retry-btn')!;

    this.retryBtn.addEventListener('click', () => {
      this.hide();
      this._onRetry?.();
    });
  }

  onRetry(cb: () => void): void { this._onRetry = cb; }

  show(score: number, bestChain: number, distance: number): void {
    this.finalScoreEl.textContent = score.toLocaleString();
    this.chainEl.textContent = `×${bestChain}`;
    this.distanceEl.textContent = `${(distance / 100).toFixed(1)}km`;

    // Check high score
    const highScore = parseInt(localStorage.getItem('slipstream-highscore') || '0', 10);
    if (score > highScore) {
      localStorage.setItem('slipstream-highscore', score.toString());
      this.newBestEl.style.display = 'block';
    } else {
      this.newBestEl.style.display = 'none';
    }

    this.container.classList.add('visible');
  }

  hide(): void {
    this.container.classList.remove('visible');
  }
}
