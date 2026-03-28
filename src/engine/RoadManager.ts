import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * RoadManager — Infinite road from recycling segments.
 *
 * Pool of 8 segments, each 20 units long. Recycle behind camera to front.
 * Each segment: road plane + lane markings + optional reflective plane + roadside props.
 * Props (neon signs, barriers, lamps) are the PRIMARY speed-feel source from elevated camera.
 * Use InstancedMesh for repeated props. MeshBasicMaterial with emissive for neon glow.
 */
export class RoadManager {
  // TODO: Implement
}
