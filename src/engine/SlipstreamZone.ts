import * as THREE from 'three';
import { CONFIG } from '../config';

/**
 * SlipstreamZone — Draft detection via XZ AABB overlap.
 * Zone: SLIPSTREAM_ZONE_WIDTH × SLIPSTREAM_ZONE_DEPTH behind each vehicle.
 * States: idle → drafting → release/cancel.
 * Events: draft-start, draft-tick, draft-complete, draft-cancel.
 */
export class SlipstreamZone {
  // TODO: Implement
}
