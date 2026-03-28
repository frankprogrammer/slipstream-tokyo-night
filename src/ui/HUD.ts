import { CONFIG } from '../config';

/**
 * HUD — HTML/CSS overlay on top of Three.js canvas.
 *
 * Targets existing DOM elements in index.html:
 * - #score: top center, always visible
 * - #chain: below score, neon pink when active, hidden at ×1
 * - #draft-meter: near bottom, only visible during draft
 * - #milestone-text: center screen, "PERFECT" etc, fades over 1s
 * - #screen-flash: full-screen color overlay for milestone ×10
 *
 * Chain counter pop: CSS transform scale 1.3x → 1.0x over 200ms.
 * All updates via direct DOM manipulation — no framework needed.
 */
export class HUD {
  private scoreEl: HTMLElement;
  private chainEl: HTMLElement;
  private milestoneEl: HTMLElement;
  private flashEl: HTMLElement;

  constructor() {
    this.scoreEl = document.getElementById('score')!;
    this.chainEl = document.getElementById('chain')!;
    this.milestoneEl = document.getElementById('milestone-text')!;
    this.flashEl = document.getElementById('screen-flash')!;
  }

  updateScore(score: number): void {
    this.scoreEl.textContent = score.toLocaleString();
  }

  updateChain(chain: number): void {
    this.chainEl.textContent = `×${chain}`;
    this.chainEl.classList.toggle('active', chain > 1);

    if (chain > 1) {
      // Pop animation
      this.chainEl.style.transform = `scale(${CONFIG.CHAIN_POP_SCALE})`;
      setTimeout(() => {
        this.chainEl.style.transform = 'scale(1)';
      }, CONFIG.CHAIN_POP_DURATION);
    }
  }

  showMilestone(text: string): void {
    this.milestoneEl.textContent = text;
    this.milestoneEl.style.opacity = '1';
    setTimeout(() => {
      this.milestoneEl.style.opacity = '0';
    }, 1000);
  }

  flashScreen(): void {
    this.flashEl.style.opacity = '1';
    setTimeout(() => {
      this.flashEl.style.opacity = '0';
    }, CONFIG.SCREEN_FLASH_DURATION);
  }

  reset(): void {
    this.scoreEl.textContent = '0';
    this.chainEl.textContent = '×1';
    this.chainEl.classList.remove('active');
  }
}
