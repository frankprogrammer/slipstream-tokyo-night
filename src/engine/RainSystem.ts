import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * Lightweight screen-space rain: `Points` volume that follows the camera,
 * recycles drops below the view. Tuned via CONFIG.RAIN_*.
 */
export class RainSystem {
  readonly group = new THREE.Group();
  private readonly positions: Float32Array;
  private readonly geometry: THREE.BufferGeometry;
  private readonly points: THREE.Points;

  constructor() {
    const n = CONFIG.RAIN_PARTICLE_COUNT;
    const positions = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      positions[j] = (Math.random() - 0.5) * 2 * CONFIG.RAIN_SPREAD;
      positions[j + 1] = Math.random() * CONFIG.RAIN_HEIGHT_ABOVE;
      positions[j + 2] = (Math.random() - 0.5) * 2 * CONFIG.RAIN_SPREAD;
    }
    this.positions = positions;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry = geometry;

    const material = new THREE.PointsMaterial({
      color: CONFIG.RAIN_PARTICLE_COLOR,
      size: CONFIG.RAIN_PARTICLE_SIZE,
      transparent: true,
      opacity: CONFIG.RAIN_PARTICLE_OPACITY,
      depthWrite: false,
      sizeAttenuation: true,
      blending: THREE.NormalBlending,
    });

    this.points = new THREE.Points(geometry, material);
    this.group.add(this.points);
  }

  dispose(): void {
    this.geometry.dispose();
    const m = this.points.material;
    if (Array.isArray(m)) m.forEach(x => x.dispose());
    else m.dispose();
  }

  /**
   * Particles live in local space; group follows the camera. Drops fall along world -Y.
   */
  update(delta: number, camera: THREE.Camera): void {
    const spread = CONFIG.RAIN_SPREAD;
    const above = CONFIG.RAIN_HEIGHT_ABOVE;
    const below = CONFIG.RAIN_HEIGHT_BELOW;
    const fall = CONFIG.RAIN_SPEED * 60 * delta;
    const drift = 0.35 * Math.sin(performance.now() * 0.0007) * delta;

    const n = CONFIG.RAIN_PARTICLE_COUNT;
    const pos = this.positions;
    for (let i = 0; i < n; i++) {
      const j = i * 3;
      pos[j] += drift;
      pos[j + 1] -= fall;
      pos[j + 2] += drift * 0.6;

      if (pos[j + 1] < -below) {
        pos[j] = (Math.random() - 0.5) * 2 * spread;
        pos[j + 1] = Math.random() * above;
        pos[j + 2] = (Math.random() - 0.5) * 2 * spread;
      }
    }

    this.group.position.copy(camera.position);
    const attr = this.geometry.attributes.position;
    if (attr) attr.needsUpdate = true;
  }
}
