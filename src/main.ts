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
import { SlipstreamWindSystem } from './engine/SlipstreamWindSystem';
import { SlingshotTrailSystem } from './engine/SlingshotTrailSystem';
import { SlipstreamZone } from './engine/SlipstreamZone';
import { ChainManager } from './engine/ChainManager';
import { ScoreManager } from './engine/ScoreManager';
import { GameOverScreen } from './ui/GameOverScreen';
import { HUD } from './ui/HUD';
import { GameAudio } from './engine/GameAudio';

function easeInCubic(t: number): number {
  return t ** 3;
}

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
const laneSystem = new LaneSystem(container, camera);
const playerTaxi = new PlayerTaxi();
let roadManager: RoadManager | undefined;
const trafficSpawner = new TrafficSpawner();
const collisionSystem = new CollisionSystem();
const cameraController = new CameraController(camera);
const slipstreamZone = new SlipstreamZone();
const chainManager = new ChainManager();
const scoreManager = new ScoreManager();
const hud = new HUD();
const gameOverScreen = new GameOverScreen();
const rainSystem = new RainSystem();
const slipstreamWind = new SlipstreamWindSystem();
const slingshotTrail = new SlingshotTrailSystem();
const gameAudio = new GameAudio();
const milestoneAnchorWorld = new THREE.Vector3();

container.addEventListener('pointerdown', () => gameAudio.unlock(), {
  once: true,
});

let runTimeMs = 0;
let distanceUnits = 0;
let burstRemainMs = 0;
/** Extra base scroll from successful slipstreams this run (before burst). */
let slingshotBaseBonus = 0;
/** False until intro Z tween finishes; blocks scroll, input, and collision. */
let runGameplayReady = false;
/** Accumulated real-time (ms) for intro tween — uses `delta`, not wall clock, so the first frame is always t≈0. */
let introElapsedMs = 0;

function resetGame(): void {
  gameState.reset();
  laneSystem.reset();
  laneSystem.enabled = false;
  runGameplayReady = false;
  introElapsedMs = 0;
  runTimeMs = 0;
  distanceUnits = 0;
  burstRemainMs = 0;
  slingshotBaseBonus = 0;
  roadManager?.reset();
  trafficSpawner.reset();
  slipstreamWind.reset();
  playerTaxi.reset();
  slingshotTrail.reset();
  slipstreamZone.reset();
  chainManager.reset();
  scoreManager.reset();
  hud.reset();
  const nowMs = performance.now();
  const x = laneSystem.getLaneX(nowMs);
  const roll = laneSystem.getBodyRollRad(nowMs);
  const steer = laneSystem.getWheelSteerRad(nowMs);
  playerTaxi.applyLaneVisuals(x, roll, steer);
  // Frame the camera at the gameplay start position, not the intro offset position.
  // This allows the taxi to actually travel up from off-screen during the intro tween.
  const introZ = playerTaxi.group.position.z;
  playerTaxi.group.position.z = CONFIG.TAXI_POSITION_Z;
  cameraController.snap(playerTaxi);
  playerTaxi.group.position.z = introZ;
  gameOverScreen.hide();
}

gameOverScreen.onRetry(() => {
  resetGame();
});

gameState.onChange(state => {
  if (state === 'gameover') {
    laneSystem.enabled = false;
    playerTaxi.setDraftMeter(0, false);
    gameAudio.playCrash();
    const score = scoreManager.currentScore;
    gameOverScreen.show(score, chainManager.maxChainThisRun, distanceUnits);
  }
});

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

  let scrollForAudio: number = CONFIG.BASE_SCROLL_SPEED;
  let slipInZone = false;
  let slipMeter = 0;
  let audioBurst = false;

  rainSystem.update(delta, camera);

  if (gameState.isPlaying) {
    if (!runGameplayReady) {
      const dur = CONFIG.TAXI_INTRO_DURATION_MS;
      introElapsedMs += delta * 1000;
      const t = Math.min(1, introElapsedMs / dur);
      const e = easeInCubic(t);
      const z0 = CONFIG.TAXI_POSITION_Z + CONFIG.TAXI_INTRO_START_Z_OFFSET;
      const z1 = CONFIG.TAXI_POSITION_Z;
      playerTaxi.group.position.z = z0 + (z1 - z0) * e;
      if (t >= 1) {
        runGameplayReady = true;
        laneSystem.enabled = true;
        playerTaxi.group.position.z = z1;
      }

      const laneX = laneSystem.getLaneX(nowMs);
      const roll = laneSystem.getBodyRollRad(nowMs);
      const steer = laneSystem.getWheelSteerRad(nowMs);
      playerTaxi.applyLaneVisuals(laneX, roll, steer);
      milestoneAnchorWorld.set(laneX, 1.1, playerTaxi.group.position.z + 2.2);
      hud.updateMilestoneAnchor(camera, container, milestoneAnchorWorld);

      trafficSpawner.setDraftTailHighlight(playerTaxi.getCollisionBounds(), false);
      slingshotTrail.setBoostActive(false);
      slingshotTrail.update(delta, 0, playerTaxi);
      playerTaxi.tickRoofLight(nowMs, false, chainManager.chain);

      scrollForAudio = CONFIG.BASE_SCROLL_SPEED;
    } else {
      runTimeMs += delta * 1000;
      burstRemainMs = Math.max(0, burstRemainMs - delta * 1000);

      const base = CONFIG.BASE_SCROLL_SPEED;
      const maxScroll = CONFIG.MAX_SCROLL_SPEED;
      const headroom = Math.max(0, maxScroll - base);
      const timeRamp = Math.min(
        runTimeMs * CONFIG.SPEED_RAMP_RATE,
        headroom
      );
      const baseScroll = Math.min(
        base + timeRamp + slingshotBaseBonus,
        maxScroll
      );
      // Slingshot now contributes only to persistent base bonus; no temporary speed burst.
      const scrollPerFrame = baseScroll;
      const scrollDz = scrollPerFrame * 60 * delta;

      roadManager?.update(scrollDz);
      trafficSpawner.update(delta, runTimeMs, scrollPerFrame);
      const laneX = laneSystem.getLaneX(nowMs);
      const roll = laneSystem.getBodyRollRad(nowMs);
      const steer = laneSystem.getWheelSteerRad(nowMs);
      playerTaxi.applyLaneVisuals(laneX, roll, steer);
      milestoneAnchorWorld.set(laneX, 1.1, CONFIG.TAXI_POSITION_Z + 2.2);
      hud.updateMilestoneAnchor(camera, container, milestoneAnchorWorld);

      const slip = slipstreamZone.update(
        delta,
        scrollPerFrame,
        playerTaxi,
        trafficSpawner
      );
      chainManager.tick(nowMs, slip.inZone);

      if (slip.slingshotFired) {
        trafficSpawner.enableHeadlightsAfterSlipstream(slip.slingshotTarget);
        slingshotBaseBonus += CONFIG.SLINGSHOT_BASE_SPEED_INCREMENT;
        burstRemainMs = CONFIG.SLINGSHOT_BURST_DURATION;
        gameAudio.playSlingshot();
        const milestone = chainManager.onSlingshot(nowMs);
        if (milestone !== null) {
          playerTaxi.onChainMilestone(milestone, nowMs);
          gameAudio.playMilestone(milestone);
        }
        scoreManager.addSlingshotBonus(chainManager.chain);
        hud.showMilestone(`×${chainManager.chain}`, milestone === 10);
        if (milestone === 10) {
          hud.flashScreenPerfect();
        }
      }

      playerTaxi.tickRoofLight(nowMs, slip.inZone, chainManager.chain);

      scoreManager.addDistance(scrollDz, chainManager.chain);
      distanceUnits += scrollDz;

      playerTaxi.worldHud.setScore(scoreManager.currentScore);
      playerTaxi.worldHud.setChain(chainManager.chain);
      playerTaxi.setDraftMeter(slip.meterDisplay, slip.inZone);
      trafficSpawner.setDraftTailHighlight(
        playerTaxi.getCollisionBounds(),
        slip.inZone
      );

      cameraController.update(playerTaxi, chainManager.chain);

      if (collisionSystem.check(playerTaxi, trafficSpawner)) {
        gameState.transition('gameover');
      }

      slingshotTrail.setBoostActive(burstRemainMs > 0);
      slingshotTrail.update(delta, scrollDz, playerTaxi);

      scrollForAudio = scrollPerFrame;
      slipInZone = slip.inZone;
      slipMeter = slip.meterDisplay;
      audioBurst = burstRemainMs > 0;
    }
  } else {
    trafficSpawner.setDraftTailHighlight(playerTaxi.getCollisionBounds(), false);
    slingshotTrail.setBoostActive(false);
    slingshotTrail.update(delta, 0, playerTaxi);
    cameraController.update(playerTaxi, 1);
    playerTaxi.tickRoofLight(nowMs, false, chainManager.chain);
    const laneX = laneSystem.getLaneX(nowMs);
    milestoneAnchorWorld.set(laneX, 1.1, CONFIG.TAXI_POSITION_Z + 2.2);
    hud.updateMilestoneAnchor(camera, container, milestoneAnchorWorld);
  }

  slipstreamWind.update(
    delta,
    gameState.isPlaying && runGameplayReady,
    trafficSpawner
  );

  gameAudio.update(delta, {
    playing: gameState.isPlaying && runGameplayReady,
    scrollPerFrame: scrollForAudio,
    inDraft: slipInZone,
    draftMeter: slipMeter,
    burstActive: audioBurst,
    chain: chainManager.chain,
  });

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

void (async () => {
  roadManager = await RoadManager.create(CONFIG.TAXI_POSITION_Z);
  scene.add(roadManager.group);
  scene.add(trafficSpawner.group);
  scene.add(slipstreamWind.group);
  scene.add(playerTaxi.group);
  scene.add(rainSystem.group);
  scene.add(slingshotTrail.group);
  resetGame();
  // First `getDelta()` after load would otherwise equal time since `new Clock()` (async gap) and
  // would instantly complete the intro tween and skew runTime on frame 1.
  clock.getDelta();
  animate();
})();

console.log(
  'Slipstream: Tokyo Night — Phase 2 (slipstream / chain / score). ?fps=1 for FPS overlay.'
);
