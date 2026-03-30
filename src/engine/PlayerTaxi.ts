import * as THREE from 'three';
import { CONFIG } from '../config';
import { TaxiWorldHud } from './TaxiWorldHud';

/**
 * Player taxi — Phase 3: low-poly Japanese taxi silhouette (stacked primitives, no GLB).
 * Collision / slipstream still use CONFIG.TAXI_DIMENSIONS AABB.
 */
export class PlayerTaxi {
  readonly group = new THREE.Group();
  readonly worldHud: TaxiWorldHud;

  private readonly chassisGroup: THREE.Group;
  private readonly roofLight: THREE.Mesh;
  private readonly roofLightMat: THREE.MeshBasicMaterial;
  private readonly draftBarGroup: THREE.Group;
  private readonly draftFillParent: THREE.Group;
  private readonly draftFill: THREE.Mesh;
  private readonly frontWheels: THREE.Mesh[] = [];
  private readonly dims = CONFIG.TAXI_DIMENSIONS;
  private roofMilestone10EndMs = 0;
  private readonly _roofDraft = new THREE.Color();
  private readonly _roofScratch = new THREE.Color();

  constructor() {
    this.group.name = 'PlayerTaxi';

    this.chassisGroup = new THREE.Group();
    this.chassisGroup.name = 'TaxiChassis';
    this.group.add(this.chassisGroup);

    const bodyMat = new THREE.MeshStandardMaterial({
      color: CONFIG.PALETTE.TAXI_BODY,
      roughness: 0.55,
      metalness: 0.12,
    });
    const blackMat = new THREE.MeshStandardMaterial({
      color: 0x151515,
      roughness: 0.75,
      metalness: 0.15,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x0a1628,
      roughness: 0.35,
      metalness: 0.65,
    });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1c1c, roughness: 0.9 });
    this.roofLightMat = new THREE.MeshBasicMaterial({ color: CONFIG.PALETTE.TAXI_ROOF_LIGHT });

    const { width: W, height: H, length: L } = this.dims;
    const wNarrow = W * 0.88;
    const zFront = L / 2;
    const zBack = -L / 2;

    // Longitudinal split: hood → cabin → trunk (Tokyo taxi proportions)
    const hoodD = L * 0.26;
    const cabinD = L * 0.5;
    const trunkD = L - hoodD - cabinD;

    const hoodZ = zFront - hoodD / 2;
    const cabinZ = zFront - hoodD - cabinD / 2;
    const trunkZ = zBack + trunkD / 2;

    // Hood (low front)
    const hoodH = H * 0.48;
    const hood = new THREE.Mesh(
      new THREE.BoxGeometry(wNarrow, hoodH, hoodD),
      bodyMat
    );
    hood.position.set(0, hoodH / 2, hoodZ);
    this.chassisGroup.add(hood);

    // Windshield slab (dark glass)
    const wsW = wNarrow * 0.96;
    const wsH = H * 0.38;
    const wsD = 0.08;
    const windshield = new THREE.Mesh(new THREE.BoxGeometry(wsW, wsH, wsD), glassMat);
    windshield.position.set(0, H * 0.42, zFront - hoodD + 0.02);
    this.chassisGroup.add(windshield);

    // Main cabin (tall passenger cell)
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(wNarrow * 0.98, H * 0.98, cabinD),
      bodyMat
    );
    cabin.position.set(0, (H * 0.98) / 2, cabinZ);
    this.chassisGroup.add(cabin);

    // Crown / roof sign base (black, narrower)
    const crownW = W * 0.42;
    const crownD = cabinD * 0.55;
    const crownH = 0.14;
    const crown = new THREE.Mesh(new THREE.BoxGeometry(crownW, crownH, crownD), blackMat);
    crown.position.set(0, H + crownH / 2, cabinZ);
    this.chassisGroup.add(crown);

    // Vacant roof light (on crown)
    const roofGeo = new THREE.BoxGeometry(0.38, 0.16, 0.55);
    this.roofLight = new THREE.Mesh(roofGeo, this.roofLightMat);
    this.roofLight.position.set(0, H + crownH + 0.09, cabinZ - 0.05);
    this.chassisGroup.add(this.roofLight);

    // Trunk / rear deck (slightly lower)
    const trunkH = H * 0.72;
    const trunk = new THREE.Mesh(
      new THREE.BoxGeometry(wNarrow * 0.96, trunkH, trunkD),
      bodyMat
    );
    trunk.position.set(0, trunkH / 2, trunkZ);
    this.chassisGroup.add(trunk);

    // Front / rear bumper strips
    const fb = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.98, 0.07, 0.12),
      blackMat
    );
    fb.position.set(0, 0.04, zFront - 0.04);
    this.chassisGroup.add(fb);
    const rb = new THREE.Mesh(
      new THREE.BoxGeometry(W * 0.98, 0.08, 0.14),
      blackMat
    );
    rb.position.set(0, 0.05, zBack + 0.05);
    this.chassisGroup.add(rb);

    // Side mirrors
    const mirGeo = new THREE.BoxGeometry(0.08, 0.1, 0.06);
    const mirL = new THREE.Mesh(mirGeo, blackMat);
    mirL.position.set(-(W / 2 + 0.05), H * 0.52, zFront - hoodD + 0.15);
    this.chassisGroup.add(mirL);
    const mirR = mirL.clone();
    mirR.position.x = W / 2 + 0.05;
    this.chassisGroup.add(mirR);

    // Wheels (low-poly cylinders)
    const wheelR = 0.27;
    const wheelW = 0.16;
    const wheelGeo = new THREE.CylinderGeometry(wheelR, wheelR, wheelW, 8);
    wheelGeo.rotateZ(Math.PI / 2);
    const wx = W / 2 - 0.12;
    const wzF = zFront - hoodD * 0.55;
    const wzR = zBack + trunkD * 0.55;
    const wy = wheelR;
    for (const [x, z] of [
      [wx, wzF],
      [-wx, wzF],
      [wx, wzR],
      [-wx, wzR],
    ] as const) {
      const w = new THREE.Mesh(wheelGeo, darkMat);
      w.position.set(x, wy, z);
      this.chassisGroup.add(w);
      if (z === wzF) this.frontWheels.push(w);
    }

    // Headlights
    const headGeo = new THREE.PlaneGeometry(0.32, 0.12);
    const headMat = new THREE.MeshBasicMaterial({ color: CONFIG.PALETTE.HEADLIGHT });
    const headL = new THREE.Mesh(headGeo, headMat);
    headL.position.set(-0.34, H * 0.22, zFront + 0.02);
    this.chassisGroup.add(headL);
    const headR = headL.clone();
    headR.position.x = 0.34;
    this.chassisGroup.add(headR);

    // Tail lights
    const tailGeo = new THREE.PlaneGeometry(0.28, 0.1);
    const tailMat = new THREE.MeshBasicMaterial({ color: CONFIG.PALETTE.TAIL_LIGHT });
    const tailL = new THREE.Mesh(tailGeo, tailMat);
    tailL.rotation.y = Math.PI;
    tailL.position.set(-0.42, H * 0.28, zBack - 0.02);
    this.chassisGroup.add(tailL);
    const tailR = tailL.clone();
    tailR.position.x = 0.42;
    this.chassisGroup.add(tailR);

    // Draft meter (rolls with chassis)
    const wBar = CONFIG.DRAFT_BAR_WIDTH;
    const dBar = CONFIG.DRAFT_BAR_DEPTH;
    this.draftBarGroup = new THREE.Group();
    this.draftBarGroup.name = 'DraftMeterBar';
    this.draftBarGroup.visible = false;
    const barY = H + CONFIG.DRAFT_BAR_OFFSET_Y;
    const barZ = zFront - CONFIG.DRAFT_BAR_INSET_FROM_FRONT;
    this.draftBarGroup.position.set(0, barY, barZ);

    const trackMat = new THREE.MeshBasicMaterial({
      color: 0x0a1a28,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      depthWrite: true,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });
    const track = new THREE.Mesh(new THREE.PlaneGeometry(wBar, dBar), trackMat);
    track.rotation.x = -Math.PI / 2;
    this.draftBarGroup.add(track);

    const fillMat = new THREE.MeshBasicMaterial({
      color: CONFIG.PALETTE.NEON_BLUE,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });
    this.draftFillParent = new THREE.Group();
    this.draftFillParent.position.set(-wBar / 2, 0, 0);
    this.draftBarGroup.add(this.draftFillParent);
    const fillGeo = new THREE.PlaneGeometry(wBar, dBar);
    fillGeo.translate(wBar / 2, 0, 0);
    this.draftFill = new THREE.Mesh(fillGeo, fillMat);
    this.draftFill.rotation.x = -Math.PI / 2;
    this.draftFill.position.y = 0.004;
    this.draftFillParent.add(this.draftFill);

    this.draftBarGroup.scale.set(-1, 1, 1);
    this.chassisGroup.add(this.draftBarGroup);

    const scoreZ = zBack - CONFIG.TAXI_WORLD_HUD_SCORE_BEHIND_Z;
    const scoreY = H * CONFIG.TAXI_WORLD_HUD_SCORE_Y_FRAC;
    this.worldHud = new TaxiWorldHud(this.chassisGroup, {
      scoreY,
      scoreZ,
      draftBarY: barY,
      draftBarZ: barZ,
    });

    this.reset();
  }

  reset(): void {
    this.group.position.set(0, 0, CONFIG.TAXI_POSITION_Z);
    this.group.rotation.set(0, 0, 0);
    this.chassisGroup.rotation.set(0, 0, 0);
    for (const w of this.frontWheels) w.rotation.y = 0;
    this.roofMilestone10EndMs = 0;
    this.roofLightMat.color.setHex(CONFIG.PALETTE.TAXI_ROOF_LIGHT);
    this.setDraftMeter(0, false);
    this.worldHud.reset();
  }

  applyLaneVisuals(laneX: number, rollRad: number, wheelSteerRad = 0): void {
    this.group.position.x = laneX;
    this.chassisGroup.rotation.z = rollRad;
    for (const w of this.frontWheels) {
      w.rotation.y = wheelSteerRad;
    }
  }

  /**
   * Call when `ChainManager.onSlingshot` returns a milestone (×5, ×10, …).
   * Drives ×10 pink flash window; ×20 uses `chain` in `tickRoofLight`.
   */
  onChainMilestone(milestone: number, nowMs: number): void {
    if (milestone === 10) {
      this.roofMilestone10EndMs = nowMs + CONFIG.TAXI_ROOF_LIGHT_M10_FLASH_MS;
    }
  }

  /**
   * Roof lamp: ×20 strobe → ×10 flash → draft pulse → vacant green (CLAUDE.md).
   */
  tickRoofLight(nowMs: number, isDrafting: boolean, chain: number): void {
    const pink = CONFIG.PALETTE.NEON_PINK;
    const blue = CONFIG.PALETTE.NEON_BLUE;
    const vacant = CONFIG.PALETTE.TAXI_ROOF_LIGHT;

    if (chain >= 20) {
      const hz = CONFIG.TAXI_ROOF_LIGHT_M20_STROBE_HZ;
      const toggle = Math.floor((nowMs * hz) / 1000) % 2;
      this.roofLightMat.color.setHex(toggle === 0 ? pink : blue);
      return;
    }

    if (nowMs < this.roofMilestone10EndMs) {
      const hz = CONFIG.TAXI_ROOF_LIGHT_M10_PULSE_HZ;
      const wave = Math.sin((nowMs / 1000) * Math.PI * 2 * hz) * 0.5 + 0.5;
      this._roofScratch.setHex(pink);
      this._roofScratch.multiplyScalar(0.45 + 0.55 * wave);
      this.roofLightMat.color.copy(this._roofScratch);
      return;
    }

    if (isDrafting) {
      this._roofDraft.setHex(CONFIG.TAXI_ROOF_LIGHT_DRAFT);
      const wobble =
        0.82 + 0.18 * Math.sin(nowMs * CONFIG.TAXI_ROOF_LIGHT_DRAFT_PULSE_SCALE);
      this._roofScratch.copy(this._roofDraft).multiplyScalar(wobble);
      this.roofLightMat.color.copy(this._roofScratch);
      return;
    }

    this.roofLightMat.color.setHex(vacant);
  }

  setDraftMeter(fill01: number, visible: boolean): void {
    const t = Math.max(0, Math.min(1, fill01));
    this.draftBarGroup.visible = visible;
    this.draftFill.scale.set(t, 1, 1);
  }

  getCollisionBounds(): { cx: number; cz: number; hx: number; hz: number } {
    const { width, length } = this.dims;
    return {
      cx: this.group.position.x,
      cz: this.group.position.z,
      hx: width / 2,
      hz: length / 2,
    };
  }

  getRearWorldPosition(out: THREE.Vector3): void {
    const { height, length } = this.dims;
    out.set(0, height * 0.35, -length / 2 - 0.02);
    this.group.localToWorld(out);
  }

  /** World positions for left/right taillights (source points for boost beams). */
  getTailLightsWorldPositions(outLeft: THREE.Vector3, outRight: THREE.Vector3): void {
    const { height, length } = this.dims;
    const y = height * 0.28;
    const z = -length / 2 - 0.02;
    outLeft.set(-0.42, y, z);
    outRight.set(0.42, y, z);
    this.group.localToWorld(outLeft);
    this.group.localToWorld(outRight);
  }
}
