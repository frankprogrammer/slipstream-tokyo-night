import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * CameraController — Elevated follow camera (Vehicle Masters style, ~20ft up).
 *
 * Position: CAMERA_HEIGHT above road, CAMERA_DISTANCE behind player, angled CAMERA_ANGLE° down.
 * Taxi sits in the lower third of the portrait screen for maximum forward visibility.
 *
 * Features:
 * - Smooth follow (lerp to player X position each frame)
 * - FOV shift: 55° base → 65° at high chain
 * - Shake: small amplitude on slingshot, decays via CAMERA_SHAKE_DECAY
 * - Camera always looks forward — no rotation on lane switch
 */
export class CameraController {
  // TODO: Implement
}
