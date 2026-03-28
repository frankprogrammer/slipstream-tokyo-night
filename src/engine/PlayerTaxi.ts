import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * PlayerTaxi — Tokyo taxi mesh group.
 *
 * Prototype: Box body (1.8×0.8×3.5), roof light box (green emissive),
 * 4 cylinder wheels, headlight + tail light planes.
 *
 * Animations: body roll on lane switch (5°), wheel turn (15°), spring back.
 * Roof light: green normal, amber during draft, pink at ×10, strobe at ×20.
 *
 * The roof light is the player's "beacon" from the elevated camera.
 */
export class PlayerTaxi {
  // TODO: Implement
}
