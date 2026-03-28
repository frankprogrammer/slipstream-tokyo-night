import { CONFIG } from '../config';

/** Same shape as `TrafficCollisionBounds` (keeps this module free of TrafficSpawner imports). */
type VehicleBounds = { cx: number; cz: number; hx: number; hz: number };

/** AABB overlap with the slipstream rectangle behind a vehicle's rear bumper. */
export function playerInVehicleSlipstream(
  pb: { cx: number; cz: number; hx: number; hz: number },
  v: VehicleBounds
): boolean {
  const zw = CONFIG.SLIPSTREAM_ZONE_WIDTH;
  const zd = CONFIG.SLIPSTREAM_ZONE_DEPTH;
  const rearZ = v.cz - v.hz;
  const zMin = rearZ - zd;
  const zMax = rearZ;
  const xMin = v.cx - zw / 2;
  const xMax = v.cx + zw / 2;
  const pxMin = pb.cx - pb.hx;
  const pxMax = pb.cx + pb.hx;
  const pzMin = pb.cz - pb.hz;
  const pzMax = pb.cz + pb.hz;
  return (
    pxMax > xMin &&
    pxMin < xMax &&
    pzMax > zMin &&
    pzMin < zMax
  );
}
