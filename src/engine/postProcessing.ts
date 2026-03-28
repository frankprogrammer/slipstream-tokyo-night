import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { CONFIG } from '../config';

export type BloomComposerBundle = {
  composer: EffectComposer;
  bloomPass: UnrealBloomPass;
};

/**
 * Tokyo Night post stack (Phase 3):
 * 1. RenderPass — scene
 * 2. UnrealBloomPass — neon glow (tunables in CONFIG); high threshold keeps only bright emissives blooming
 * 3. OutputPass — sRGB / tone output
 */
export function createBloomComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera
): BloomComposerBundle {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));

  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(
      w * CONFIG.BLOOM_RESOLUTION_SCALE,
      h * CONFIG.BLOOM_RESOLUTION_SCALE
    ),
    CONFIG.BLOOM_INTENSITY,
    CONFIG.BLOOM_RADIUS,
    CONFIG.BLOOM_THRESHOLD
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  return { composer, bloomPass };
}

export function resizeBloomComposer(
  bundle: BloomComposerBundle,
  width: number,
  height: number
): void {
  bundle.composer.setSize(width, height);
  bundle.bloomPass.resolution.set(
    width * CONFIG.BLOOM_RESOLUTION_SCALE,
    height * CONFIG.BLOOM_RESOLUTION_SCALE
  );
}
