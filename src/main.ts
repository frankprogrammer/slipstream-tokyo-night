import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CONFIG } from './config';

/**
 * Slipstream: Tokyo Night — Main Entry Point
 *
 * Sets up the Three.js renderer, scene, camera, post-processing,
 * and kicks off the game loop.
 *
 * See CLAUDE.md for full architecture and implementation order.
 */

// ── Renderer ──
const container = document.getElementById('game-container')!;
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.prepend(renderer.domElement);

// ── Scene ──
const scene = new THREE.Scene();
scene.background = new THREE.Color(CONFIG.PALETTE.SKY);
scene.fog = new THREE.Fog(CONFIG.FOG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR);

// ── Camera (elevated third-person, Vehicle Masters style) ──
const camera = new THREE.PerspectiveCamera(
  CONFIG.CAMERA_FOV_BASE,
  window.innerWidth / window.innerHeight,
  0.1,
  100
);
camera.position.set(0, CONFIG.CAMERA_HEIGHT, -CONFIG.CAMERA_DISTANCE);
camera.lookAt(0, 0, CONFIG.CAMERA_DISTANCE * 2);

// ── Lighting (minimal — emissive + bloom does the heavy lifting) ──
const ambientLight = new THREE.AmbientLight(0x222244, 0.3);
scene.add(ambientLight);
const dirLight = new THREE.DirectionalLight(0xFFEEDD, 0.2);
dirLight.position.set(5, 10, -5);
scene.add(dirLight);

// ── Post-Processing ──
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(
    window.innerWidth * CONFIG.BLOOM_RESOLUTION_SCALE,
    window.innerHeight * CONFIG.BLOOM_RESOLUTION_SCALE
  ),
  CONFIG.BLOOM_INTENSITY,
  CONFIG.BLOOM_RADIUS,
  CONFIG.BLOOM_THRESHOLD
);
composer.addPass(bloomPass);
composer.addPass(new OutputPass());

// ── Resize Handler ──
window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
  composer.setSize(w, h);
  bloomPass.resolution.set(
    w * CONFIG.BLOOM_RESOLUTION_SCALE,
    h * CONFIG.BLOOM_RESOLUTION_SCALE
  );
});

// ── Game Loop ──
const clock = new THREE.Clock();

function animate(): void {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();
  const elapsed = clock.getElapsedTime();

  // TODO: Update game systems here:
  // 1. GameState check
  // 2. RoadManager.update(delta)
  // 3. TrafficSpawner.update(delta, elapsed)
  // 4. PlayerTaxi.update(delta)
  // 5. SlipstreamZone.update()
  // 6. ChainManager.update(delta)
  // 7. ScoreManager.update(delta)
  // 8. CollisionSystem.check()
  // 9. CameraController.update(delta)
  // 10. ParticleSystems.update(delta)
  // 11. HUD.update()

  composer.render();
}

animate();

console.log('Slipstream: Tokyo Night — initialized. See CLAUDE.md for implementation order.');
