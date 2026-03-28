import * as THREE from 'three';
import { CONFIG } from '../config';

/** Type A — compact sedan silhouette (collision / spawn spacing). */
export const COMPACT = { w: 1.6, h: 0.7, d: 3.0 } as const;

/** Type B — box truck (collision / spawn spacing). */
export const TRUCK = { w: 2.0, h: 1.2, d: 4.5 } as const;

/**
 * Procedural low-poly traffic mesh. Group origin: ground center; +Z forward.
 * Geometry stays within the collision box dims.
 */
/** @param paintColor — hex from `TRAFFIC_PAINT_COLORS` / `PALETTE` */
export function buildCompactTrafficMesh(
  d: typeof COMPACT,
  paintColor: number
): { root: THREE.Group; tailMaterial: THREE.MeshBasicMaterial } {
  const root = new THREE.Group();
  const { w: W, h: H, d: L } = d;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: paintColor,
    roughness: 0.82,
    metalness: 0.08,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x1a1a1e,
    roughness: 0.88,
    metalness: 0.1,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0d1520,
    roughness: 0.4,
    metalness: 0.5,
  });
  const darkWheel = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.95 });
  const tailMat = new THREE.MeshBasicMaterial({ color: CONFIG.PALETTE.TAIL_LIGHT });

  const zF = L / 2;
  const zB = -L / 2;
  const wN = W * 0.92;

  const hoodD = L * 0.24;
  const cabinD = L * 0.42;
  const trunkD = L - hoodD - cabinD;

  const hoodZ = zF - hoodD / 2;
  const cabinZ = zF - hoodD - cabinD / 2;
  const trunkZ = zB + trunkD / 2;

  const hoodH = H * 0.52;
  const hood = new THREE.Mesh(new THREE.BoxGeometry(wN, hoodH, hoodD), bodyMat);
  hood.position.set(0, hoodH / 2, hoodZ);
  root.add(hood);

  const ws = new THREE.Mesh(
    new THREE.BoxGeometry(wN * 0.95, H * 0.35, 0.06),
    glassMat
  );
  ws.position.set(0, H * 0.38, zF - hoodD + 0.03);
  root.add(ws);

  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(wN * 0.97, H * 0.95, cabinD),
    bodyMat
  );
  cabin.position.set(0, (H * 0.95) / 2, cabinZ);
  root.add(cabin);

  const trunkH = H * 0.78;
  const trunk = new THREE.Mesh(
    new THREE.BoxGeometry(wN * 0.96, trunkH, trunkD),
    bodyMat
  );
  trunk.position.set(0, trunkH / 2, trunkZ);
  root.add(trunk);

  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.98, 0.05, 0.1),
    blackMat
  );
  bumperF.position.set(0, 0.03, zF - 0.03);
  root.add(bumperF);
  const bumperR = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.98, 0.06, 0.1),
    blackMat
  );
  bumperR.position.set(0, 0.04, zB + 0.04);
  root.add(bumperR);

  const wheelGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.14, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wx = W / 2 - 0.08;
  const wzF = zF - hoodD * 0.5;
  const wzR = zB + trunkD * 0.5;
  const wy = 0.22;
  for (const [x, z] of [
    [wx, wzF],
    [-wx, wzF],
    [wx, wzR],
    [-wx, wzR],
  ] as const) {
    const wheel = new THREE.Mesh(wheelGeo, darkWheel);
    wheel.position.set(x, wy, z);
    root.add(wheel);
  }

  const tailGeo = new THREE.PlaneGeometry(0.22, 0.09);
  const tl = new THREE.Mesh(tailGeo, tailMat);
  tl.rotation.y = Math.PI;
  tl.position.set(-W / 3, H * 0.38, zB - 0.012);
  root.add(tl);
  const tr = tl.clone();
  tr.position.x = W / 3;
  root.add(tr);

  return { root, tailMaterial: tailMat };
}

/**
 * Box truck: cab forward + tall cargo box (fits TRUCK AABB).
 */
/** @param paintColor — hex from `TRAFFIC_PAINT_COLORS` / `PALETTE` */
export function buildTruckTrafficMesh(
  d: typeof TRUCK,
  paintColor: number
): { root: THREE.Group; tailMaterial: THREE.MeshBasicMaterial } {
  const root = new THREE.Group();
  const { w: W, h: H, d: L } = d;
  const paint = new THREE.Color(paintColor);
  const cargoTint = paint.clone().lerp(new THREE.Color(0x000000), 0.12);
  const cabMat = new THREE.MeshStandardMaterial({
    color: paint,
    roughness: 0.8,
    metalness: 0.12,
  });
  const cargoMat = new THREE.MeshStandardMaterial({
    color: cargoTint,
    roughness: 0.88,
    metalness: 0.05,
  });
  const blackMat = new THREE.MeshStandardMaterial({
    color: 0x121214,
    roughness: 0.9,
    metalness: 0.12,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0a1018,
    roughness: 0.45,
    metalness: 0.55,
  });
  const darkWheel = new THREE.MeshStandardMaterial({ color: 0x181818, roughness: 0.95 });
  const tailMat = new THREE.MeshBasicMaterial({ color: CONFIG.PALETTE.TAIL_LIGHT });

  const zF = L / 2;
  const zB = -L / 2;
  const wN = W * 0.94;

  const cabD = L * 0.34;
  const cargoD = L - cabD;
  const cabZ = zF - cabD / 2;
  const cargoZ = zB + cargoD / 2;

  const cabH = H * 0.72;
  const cab = new THREE.Mesh(new THREE.BoxGeometry(wN, cabH, cabD), cabMat);
  cab.position.set(0, cabH / 2, cabZ);
  root.add(cab);

  const wind = new THREE.Mesh(
    new THREE.BoxGeometry(wN * 0.88, cabH * 0.55, 0.08),
    glassMat
  );
  wind.position.set(0, cabH * 0.48, zF - cabD * 0.35);
  root.add(wind);

  const cargoH = H * 0.96;
  const cargo = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.99, cargoH, cargoD),
    cargoMat
  );
  cargo.position.set(0, cargoH / 2, cargoZ);
  root.add(cargo);

  // Cargo roll door seam (thin dark strip)
  const seam = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, cargoH * 0.92, cargoD * 0.98),
    blackMat
  );
  seam.position.set(W * 0.35, cargoH / 2, cargoZ);
  root.add(seam);

  const bumperF = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.99, 0.08, 0.12),
    blackMat
  );
  bumperF.position.set(0, 0.05, zF - 0.04);
  root.add(bumperF);
  const bumperR = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.99, 0.1, 0.14),
    blackMat
  );
  bumperR.position.set(0, 0.06, zB + 0.05);
  root.add(bumperR);

  const wheelR = 0.32;
  const wheelW = 0.2;
  const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  const wx = W / 2 - 0.1;
  const wzF = zF - cabD * 0.45;
  const wzR = zB + cargoD * 0.42;
  const wy = wheelR;
  for (const [x, z] of [
    [wx, wzF],
    [-wx, wzF],
    [wx, wzR],
    [-wx, wzR],
  ] as const) {
    const wheel = new THREE.Mesh(wheelGeo, darkWheel);
    wheel.position.set(x, wy, z);
    root.add(wheel);
  }

  const tailGeo = new THREE.PlaneGeometry(0.28, 0.12);
  const tl = new THREE.Mesh(tailGeo, tailMat);
  tl.rotation.y = Math.PI;
  tl.position.set(-W / 3, H * 0.35, zB - 0.015);
  root.add(tl);
  const tr = tl.clone();
  tr.position.x = W / 3;
  root.add(tr);

  return { root, tailMaterial: tailMat };
}
