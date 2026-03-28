import * as THREE from 'three';
import { CONFIG } from './config';
import { createBloomComposer, resizeBloomComposer } from './engine/postProcessing';
import { GameState } from './engine/GameState';
import { LaneSystem } from './engine/LaneSystem';
import { RoadManager } from './engine/RoadManager';
import { PlayerTaxi } from './engine/PlayerTaxi';
import { TrafficSpawner } from './engine/TrafficSpawner';
import { CollisionSystem } from './engine/CollisionSystem';
import { CameraController } from './engine/CameraController';
import { RainSystem } from './engine/RainSystem';
import { SlipstreamZone } from './engine/SlipstreamZone';
import { ChainManager } from './engine/ChainManager';
import { ScoreManager } from './engine/ScoreManager';
import { GameOverScreen } from './ui/GameOverScreen';
import { HUD } from './ui/HUD';

/**
 * Slipstream: Tokyo Night — Main Entry Point
 *
 * Phase 2+: slipstream, chain, score, HUD, game over; post-processing in `postProcessing.ts`.
 */

const container = document.getElementById('game-container')!;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = CONFIG.TONE_MAPPING_EXPOSURE;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.prepend(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.PALETTE.SKY);
scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);

const camera = new THREE.PerspectiveCamera(
  CONFIG.CAMERA_FOV_BASE,
  window.innerWidth / window.innerHeight,
  0.1,
  200
);

const ambientLight = new THREE.AmbientLight(
  CONFIG.AMBIENT_LIGHT_COLOR,
  CONFIG.AMBIENT_LIGHT_INTENSITY
);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(
  CONFIG.HEMISPHERE_LIGHT_SKY,
  CONFIG.HEMISPHERE_LIGHT_GROUND,
  CONFIG.HEMISPHERE_LIGHT_INTENSITY
);
hemiLight.position.set(0, 40, 0);
scene.add(hemiLight);

const dirLight = new THREE.DirectionalLight(
  CONFIG.DIRECTIONAL_LIGHT_COLOR,
  CONFIG.DIRECTIONAL_LIGHT_INTENSITY
);
dirLight.position.set(
  CONFIG.DIRECTIONAL_LIGHT_POSITION[0],
  CONFIG.DIRECTIONAL_LIGHT_POSITION[1],
  CONFIG.DIRECTIONAL_LIGHT_POSITION[2]
);
dirLight.castShadow = false;
scene.add(dirLight);

const bloomBundle = createBloomComposer(renderer, scene, camera);
const { composer } = bloomBundle;

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  resizeBloomComposer(bloomBundle, w, h);
});

const gameState = new GameState();
const laneSystem = new LaneSystem(container);
const playerTaxi = new PlayerTaxi();
const roadManager = new RoadManager(CONFIG.TAXI_POSITION_Z);
const trafficSpawner = new TrafficSpawner();
const collisionSystem = new CollisionSystem();
const cameraController = new CameraController(camera);
const slipstreamZone = new SlipstreamZone();
const chainManager = new ChainManager();
const scoreManager = new ScoreManager();
const hud = new HUD();
const gameOverScreen = new GameOverScreen();
const rainSystem = new RainSystem();

scene.add(roadManager.group);
scene.add(trafficSpawner.group);
scene.add(playerTaxi.group);
scene.add(rainSystem.group);

let runTimeMs = 0;
let distanceUnits = 0;
let burstRemainMs = 0;

function resetGame(): void {
  gameState.reset();
  laneSystem.enabled = true;
  runTimeMs = 0;
  distanceUnits = 0;
  burstRemainMs = 0;
  roadManager.reset();
  trafficSpawner.reset();
  playerTaxi.reset();
  slipstreamZone.reset();
  chainManager.reset();
  scoreManager.reset();
  hud.reset();
  const nowMs = performance.now();
  const x = laneSystem.getLaneX(nowMs);
  const roll = laneSystem.getBodyRollRad(nowMs);
  playerTaxi.applyLaneVisuals(x, roll);
  cameraController.snap(playerTaxi);
  gameOverScreen.hide();
}

gameOverScreen.onRetry(() => {
  resetGame();
});

gameState.onChange(state => {
  if (state === 'gameover') {
    laneSystem.enabled = false;
    playerTaxi.setDraftMeter(0, false);
    const score = scoreManager.currentScore;
    gameOverScreen.show(score, chainManager.maxChainThisRun, distanceUnits);
  }
});

resetGame();

const clock = new THREE.Clock();

const showFps = new URLSearchParams(window.location.search).has('fps');
let fpsEl: HTMLElement | null = null;
let fpsAcc = 0;
let fpsFrames = 0;
if (showFps) {
  fpsEl = document.createElement('div');
  fpsEl.style.cssText =
    'position:absolute;left:8px;bottom:8px;z-index:100;font:12px monospace;color:#0f0;background:rgba(0,0,0,.5);padding:4px 8px;pointer-events:none;';
  container.appendChild(fpsEl);
}

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const nowMs = performance.now();

  rainSystem.update(delta, camera);

  if (gameState.isPlaying) {
    runTimeMs += delta * 1000;
    burstRemainMs = Math.max(0, burstRemainMs - delta * 1000);
    const scrollPerFrame =
      CONFIG.BASE_SCROLL_SPEED +
      (burstRemainMs > 0 ? CONFIG.SLINGSHOT_SPEED_BURST : 0);
    const scrollDz = scrollPerFrame * 60 * delta;

    roadManager.update(scrollDz);
    trafficSpawner.update(delta, runTimeMs, scrollPerFrame);
    const laneX = laneSystem.getLaneX(nowMs);
    const roll = laneSystem.getBodyRollRad(nowMs);
    playerTaxi.applyLaneVisuals(laneX, roll);
    cameraController.update(playerTaxi);

    const slip = slipstreamZone.update(
      delta,
      scrollPerFrame,
      playerTaxi,
      trafficSpawner
    );
    chainManager.tick(nowMs, slip.inZone);
    playerTaxi.setDrafting(slip.inZone);

    if (slip.slingshotFired) {
      burstRemainMs = CONFIG.SLINGSHOT_BURST_DURATION;
      const milestone = chainManager.onSlingshot(nowMs);
      scoreManager.addSlingshotBonus(chainManager.chain);
      if (milestone === 10) {
        hud.showMilestone('PERFECT');
        hud.flashScreen();
      } else if (milestone !== null) {
        hud.showMilestone(`×${milestone}!`);
      }
    }

    scoreManager.addDistance(scrollDz, chainManager.chain);
    distanceUnits += scrollDz;

    hud.updateScore(scoreManager.currentScore);
    hud.updateChain(chainManager.chain);
    playerTaxi.setDraftMeter(slip.meterDisplay, slip.inZone);
    trafficSpawner.setDraftTailHighlight(
      playerTaxi.getCollisionBounds(),
      slip.inZone
    );

    if (collisionSystem.check(playerTaxi, trafficSpawner)) {
      gameState.transition('gameover');
    }
  } else {
    trafficSpawner.setDraftTailHighlight(playerTaxi.getCollisionBounds(), false);
  }

  if (showFps && fpsEl) {
    fpsAcc += delta;
    fpsFrames += 1;
    if (fpsAcc >= 0.5) {
      const fps = Math.round(fpsFrames / fpsAcc);
      fpsEl.textContent = `${fps} fps`;
      fpsAcc = 0;
      fpsFrames = 0;
    }
  }

  composer.render();
}

animate();

console.log(
  'Slipstream: Tokyo Night — Phase 2 (slipstream / chain / score). ?fps=1 for FPS overlay.'
);
