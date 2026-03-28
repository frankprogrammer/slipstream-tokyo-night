import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * CollisionSystem — AABB overlap check in XZ plane.
 * Only death trigger: player taxi overlaps traffic vehicle.
 * On collision: emit event → GameState transitions to gameover.
 * Total time from collision to game over visible: < 500ms.
 */
export class CollisionSystem {
  // TODO: Implement
}
