/**
 * SLIPSTREAM: TOKYO NIGHT — Game Configuration
 *
 * All tunable gameplay values in one file.
 * Change the game's feel by editing ONLY this file.
 * Engine code should never hardcode any of these values.
 */

export interface TrafficPhase {
  startTime: number;
  spawnRate: number;
  lanes: number[];
  speedVariance: number;
  laneChange?: boolean;
}

export const CONFIG = {
  // ── Canvas ──
  GAME_WIDTH: 390,
  GAME_HEIGHT: 844,

  // ── Camera (road-centered: fixed X=0, chase down centerline) ──
  CAMERA_HEIGHT: 22.0,
  CAMERA_DISTANCE: 10.5,
  /** Aim at a point this far ahead on the road (small = steeper look-down at the taxi). */
  CAMERA_LOOK_AHEAD: 7.5,
  /**
   * World Y of look-at target. Negative = below horizon, pitches camera down (required to see the taxi).
   */
  CAMERA_LOOK_AT_Y: 1,
  /** Screen Y of taxi rear: 0 = bottom, 1 = top (NDC). Solved by dolly (distance) only. */
  CAMERA_FRAMING_BOTTOM_PCT: 0.15,
  /** How fast to converge distance so rear hits CAMERA_FRAMING_BOTTOM_PCT (NDC error → Δdistance). */
  CAMERA_FRAMING_DISTANCE_GAIN: 0.65,
  CAMERA_ANGLE: -45,
  CAMERA_FOV_BASE: 55,
  CAMERA_FOV_MAX: 40,
  /** Per-frame lerp factor toward target FOV (higher chain → wider, up to FOV_MAX). */
  CAMERA_FOV_LERP: 0.02,
  /** Linear ramp: FOV reaches FOV_MAX when chain ≥ this (×1 = FOV_BASE). */
  CAMERA_FOV_CHAIN_FOR_MAX: 16,
  CAMERA_SHAKE_INTENSITY: 0.03,
  CAMERA_SHAKE_DECAY: 0.9,

  // ── Lanes ──
  LANE_COUNT: 3,
  LANE_WIDTH: 2.5,
  LANE_SWITCH_DURATION: 150,

  // ── Road ──
  ROAD_SEGMENT_LENGTH: 20,
  ROAD_VISIBLE_SEGMENTS: 5,
  /** Lanes, collision, traffic — playable corridor width (world units). */
  ROAD_WIDTH: 10,
  /**
   * World X span of the imported road mesh after scale (visual only).
   * Match `ROAD_SEGMENT_LENGTH` for a square 20×20 segment; keep `ROAD_WIDTH` smaller so lanes stay centered.
   */
  ROAD_SEGMENT_VISUAL_WIDTH: 20,
  /**
   * Reserved for a dedicated road mesh; RoadManager does not draw it — only `ROAD_ENVIRONMENTS` are rendered.
   */
  ROAD_SEGMENT_GLB: null,
  /** Authoring width across the road (Blender units); 0 = use bounding box. */
  ROAD_SEGMENT_GLB_WIDTH: 20,
  /** Authoring length along the road (Z); 0 = use bounding box. */
  ROAD_SEGMENT_GLB_DEPTH: 20,
  /**
   * Roadside / environment GLBs in `public/` (filenames only). Each row is one environment phase.
   * For `ROAD_ENV_SEGMENTS_PER_PHASE` consecutive segment spawns, one variant per row is picked (deterministic hash).
   * Phases cycle: row 0 → row 1 → … → row 0. Empty array disables environment meshes.
   * Place each file’s **origin on the road surface** in Blender — Y is pivot-based (not bbox-bottom snapped).
   */
  ROAD_ENVIRONMENTS: [
    ["env1-1.glb", "env1-2.glb"],
    ["env2-1.glb", "env2-2.glb"],
    ["env3-1.glb", "env3-2.glb"],
  ] as readonly (readonly string[])[],
  /** How many recycled road segments before advancing to the next environment phase. */
  ROAD_ENV_SEGMENTS_PER_PHASE: 20,
  /**
   * Environment GLB scale refs (Blender units). Use `0` for both so each file is fit from its **bounding box**
   * to `ROAD_SEGMENT_VISUAL_WIDTH` × `ROAD_SEGMENT_LENGTH` — fixes seams when env2/env3 aren’t the same size as env1.
   * Non-zero = fixed authoring size (all variants must match that width/depth or they won’t span one segment).
   */
  ROAD_ENV_GLB_WIDTH: 0,
  /** 0 = bbox Z (recommended for consistent segment linking across phases). */
  ROAD_ENV_GLB_DEPTH: 0,
  /** World units per asphalt texture tile (repeat on road plane). */
  ROAD_ASPHALT_TILE_WORLD: 2.75,
  /** Dashed lane divider along segment +Z. */
  ROAD_LANE_DASH_LENGTH: 2.5,
  ROAD_LANE_DASH_GAP: 2.0,
  ROAD_LANE_MARKING_WIDTH: 0.12,
  /** Solid white edge lines inset from road width (world units). */
  ROAD_LANE_EDGE_INSET: 0.38,
  /** Lane marking emissive intensity (bloom; keep modest). */
  ROAD_LANE_MARKING_EMISSIVE: 0.18,
  FOG_NEAR: 15,
  FOG_FAR: 60,
  FOG_COLOR: 0x08050e,

  // ── Speed (scrollPerFrame units; see main.ts `effectiveBaseScroll`) ──
  /** Starting base scroll at run start (before time ramp / slingshot bonus). */
  BASE_SCROLL_SPEED: 0.15,
  /** Hard cap on base scroll (time ramp + slingshot bonus included; burst adds on top). */
  MAX_SCROLL_SPEED: 0.4,
  /**
   * Linear ramp over run time: adds up to `(MAX − BASE)` by `runTimeMs × this`.
   * Example: BASE 0.15, MAX 0.8 → headroom 0.65; at 0.00005/ms, full ramp ≈ 13s.
   */
  SPEED_RAMP_RATE: 0.00005,
  SLINGSHOT_SPEED_BURST: 0.1,
  SLINGSHOT_BURST_DURATION: 750,
  /** Added to base scroll on each successful slipstream release (same units as BASE_SCROLL_SPEED). */
  SLINGSHOT_BASE_SPEED_INCREMENT: 0.01,

  // ── Slipstream ──
  SLIPSTREAM_ZONE_WIDTH: 2.0,
  SLIPSTREAM_ZONE_DEPTH: 4.25,
  /** Per-frame @ 60Hz base fill; actual fill × (current scrollPerFrame / BASE_SCROLL_SPEED). */
  DRAFT_FILL_RATE: 0.05,
  /** Horizontal draft fill bar on taxi hood (local +X width, inset from front bumper toward −Z). */
  DRAFT_BAR_WIDTH: 1.55,
  DRAFT_BAR_DEPTH: 0.1,
  DRAFT_BAR_OFFSET_Y: 0.035,
  DRAFT_BAR_INSET_FROM_FRONT: 0.38,
  /** Tail light color multiplier while player is in that vehicle's slipstream (HDR-friendly). */
  DRAFT_TAIL_BRIGHTNESS_MUL: 4.0,

  /** Points per traffic pool slot; fills the slipstream box behind each active vehicle. */
  SLIPSTREAM_WIND_PARTICLES_PER_VEHICLE: 8,
  SLIPSTREAM_WIND_POINT_SIZE: 0.165,
  SLIPSTREAM_WIND_OPACITY: 0.5,
  /** Soft cyan; reads as disturbed air (bloom picks up slightly bright points). */
  SLIPSTREAM_WIND_COLOR: 0xa8e8ff,
  /** Base Y and ± spread for wind points above the road. */
  SLIPSTREAM_WIND_Y: 0.52,
  SLIPSTREAM_WIND_Y_SPREAD: 0.38,
  /** Wake flow toward screen bottom (−Z world), units/sec (vehicle-relative). */
  SLIPSTREAM_WIND_DOWN_SPEED: 6.5,
  /** Lateral jitter along the side strips only (units/sec scale). */
  SLIPSTREAM_WIND_TURBULENCE: 1.1,
  /** Inset from slipstream X edges for side columns. */
  SLIPSTREAM_WIND_X_INSET: 0.1,
  /** Width of each left/right spawn column inside the zone. */
  SLIPSTREAM_WIND_SIDE_STRIP_WIDTH: 0.24,

  // ── Chain ──
  CHAIN_TIMEOUT: 3000,
  CHAIN_MILESTONES: [5, 10, 15, 20] as readonly number[],
  CHAIN_SCORE_BASE: 50,

  // ── Traffic ──
  TRAFFIC_PHASES: [
    { startTime: 0, spawnRate: 2000, lanes: [1], speedVariance: 0 },
    { startTime: 20000, spawnRate: 1200, lanes: [0, 1, 2], speedVariance: 0.2 },
    {
      startTime: 60000,
      spawnRate: 800,
      lanes: [0, 1, 2],
      speedVariance: 0.4,
      laneChange: true,
    },
    {
      startTime: 120000,
      spawnRate: 500,
      lanes: [0, 1, 2],
      speedVariance: 0.6,
      laneChange: true,
    },
  ] as readonly TrafficPhase[],
  VEHICLE_TYPES: 2,
  VEHICLE_LANE_CHANGE_TELEGRAPH: 1500,
  /**
   * World +Z speed (same units as BASE_SCROLL_SPEED). Traffic moves forward with the road flow
   * but slower than the player; net approach = BASE_SCROLL_SPEED − this (× speed variance).
   */
  VEHICLE_TRAFFIC_FORWARD_SPEED: 0.07,
  /** Floor for net −Δz so traffic never drifts the wrong way if variance is high. */
  VEHICLE_TRAFFIC_MIN_APPROACH: 0.02,
  VEHICLE_POOL_SIZE: 20,
  /**
   * World +Z ahead of player for new spawns. Higher = farther up the road / nearer screen top (horizon).
   */
  TRAFFIC_SPAWN_AHEAD_Z: 48,
  /** Extra random +Z spread (0..this) on each spawn. */
  TRAFFIC_SPAWN_AHEAD_Z_JITTER: 12,
  /**
   * Added to min center-Z spacing vs other traffic (same + adjacent lanes): hz₁ + hz₂ + slipstream depth + this.
   */
  /** Min gap (world Z) between body+slipstream footprints when spawning / separating. */
  TRAFFIC_SPAWN_MIN_Z_BUFFER: 6,
  /**
   * Headlight beam trapezoids (XZ on road, no Three.js lights).
   * Widths scale × vehicle width; depth is world units along +Z from bumper.
   */
  TRAFFIC_HEADLIGHT_BEAM_NEAR_FRAC: 0.14,
  TRAFFIC_HEADLIGHT_BEAM_FAR_FRAC: 0.48,
  TRAFFIC_HEADLIGHT_BEAM_FAR_SOFT_FRAC: 0.62,
  TRAFFIC_HEADLIGHT_BEAM_DEPTH: 2.35,
  TRAFFIC_HEADLIGHT_BEAM_SOFT_DEPTH: 2.55,
  TRAFFIC_HEADLIGHT_BEAM_Y: 0.08,
  TRAFFIC_HEADLIGHT_BEAM_OPACITY: 0.18,
  TRAFFIC_HEADLIGHT_BEAM_SOFT_OPACITY: 0.088,
  /** Max XZ distance to match slipstream snapshot → pool car (cars move between frames). */
  TRAFFIC_HEADLIGHT_MATCH_MAX_DIST: 12,

  // ── Player Taxi ──
  TAXI_BODY_ROLL: -10,
  TAXI_ROLL_DURATION: 300,
  TAXI_WHEEL_TURN: 5,
  TAXI_POSITION_Z: 0,
  TAXI_DIMENSIONS: { width: 1.8, height: 0.8, length: 3.5 },
  /** Gap under draft bar plane to chain sprite (chassis local Y). */
  TAXI_WORLD_HUD_CHAIN_BELOW_DRAFT_GAP: 0.65,
  /** Local −Z offset from rear bumper for score + chain (behind taxi). */
  TAXI_WORLD_HUD_SCORE_BEHIND_Z: 0.55,
  /** Score sprite height as fraction of taxi body height (chassis local Y). */
  TAXI_WORLD_HUD_SCORE_Y_FRAC: 0.52,
  TAXI_WORLD_HUD_CHAIN_SCALE_X: 2.0,
  TAXI_WORLD_HUD_CHAIN_SCALE_Y: 0.85,
  TAXI_WORLD_HUD_SCORE_SCALE_X: 4.0,
  TAXI_WORLD_HUD_SCORE_SCALE_Y: 1.05,
  /**
   * Collision AABB half-length (Z) × this vs full taxi length/2 — only traffic collision uses it;
   * slipstream still uses full bounds. 0.9 ≈ 10% shorter front+back (forgiving).
   */
  TAXI_COLLISION_Z_HALF_SCALE: 0.9,
  /** Roof lamp while drafting (空車 off). */
  TAXI_ROOF_LIGHT_DRAFT: 0xffaa00,
  /** ×10 milestone: neon pink flash window (CLAUDE.md). */
  TAXI_ROOF_LIGHT_M10_FLASH_MS: 2000,
  TAXI_ROOF_LIGHT_M10_PULSE_HZ: 5,
  /** ×20: pink/blue alternation rate while chain ≥ 20. */
  TAXI_ROOF_LIGHT_M20_STROBE_HZ: 7,
  /** Draft amber pulse: passed as `sin(nowMs * scale)`. */
  TAXI_ROOF_LIGHT_DRAFT_PULSE_SCALE: 0.007,

  // ── Scoring ──
  DISTANCE_SCORE_RATE: 1,
  DISTANCE_SCORE_INTERVAL: 5,

  // ── Visual Juice ──
  SCREEN_FLASH_DURATION: 100,
  /** ×10 "PERFECT" moment: full-screen tint hold + milestone copy. */
  PERFECT_FLASH_DURATION_MS: 280,
  PERFECT_MILESTONE_HOLD_MS: 1200,
  CHAIN_POP_SCALE: 1.3,
  CHAIN_POP_DURATION: 200,

  // ── Audio (Phase 4 step 32 — procedural Web Audio; tunable) ──
  /** Master gain before destination (0–1). */
  AUDIO_MASTER: 0.38,
  /** When false, the taxi engine loop is silent (wind, draft, music, one-shots unchanged). */
  AUDIO_ENGINE_ENABLED: false,
  /** Engine loop loudness when at max scroll (relative). */
  AUDIO_ENGINE_GAIN: 0.2,
  /** Minimum engine mix at min scroll (keeps idle rumble). */
  AUDIO_ENGINE_GAIN_MIN_MIX: 0.38,
  AUDIO_ENGINE_HZ_MIN: 78,
  AUDIO_ENGINE_HZ_MAX: 152,
  AUDIO_ENGINE_FILTER_HZ: 380,
  AUDIO_ENGINE_BURST_HZ_ADD: 22,
  AUDIO_ENGINE_BURST_GAIN_MUL: 1.28,
  AUDIO_WIND_GAIN: 0.065,
  AUDIO_WIND_MIN_MIX: 0.55,
  AUDIO_WIND_FILTER_HZ: 820,
  /** Noise buffer length for wind loop (seconds). */
  AUDIO_WIND_NOISE_SEC: 2,
  AUDIO_DRAFT_GAIN: 0.1,
  AUDIO_DRAFT_MIN_MIX: 0.22,
  AUDIO_DRAFT_HZ: 288,
  /** Gain smoothing toward targets (higher = snappier). */
  AUDIO_LOOP_SMOOTH: 10,
  AUDIO_SLINGSHOT_GAIN: 0.42,
  AUDIO_SLINGSHOT_DURATION: 0.2,
  AUDIO_SLINGSHOT_BP_HZ_START: 420,
  AUDIO_SLINGSHOT_BP_HZ_END: 2600,
  AUDIO_MILESTONE_GAIN: 0.22,
  AUDIO_CRASH_GAIN: 0.48,
  AUDIO_CRASH_DURATION: 0.38,
  AUDIO_CRASH_LP_HZ: 420,

  // ── Music (Phase 4 step 33 — procedural synthwave + chain layers) ──
  /** When false, music bus is silent (SFX unchanged). */
  AUDIO_MUSIC_ENABLED: false,
  /** Gain into master for music bus (SFX use separate bus). Was ~0.14 — too quiet vs engine. */
  AUDIO_MUSIC_MASTER: 0.78,
  AUDIO_MUSIC_BPM: 82,
  /** Layer crossfade smoothing (higher = faster). */
  AUDIO_MUSIC_LAYER_SMOOTH: 8,
  /** Fade play/pause on the music mix (higher = reach full level faster). */
  AUDIO_MUSIC_PLAY_FADE_SMOOTH: 28,
  /** Inner mix trim (post-gain) before music bus. */
  AUDIO_MUSIC_MIX_INNER: 1.0,
  AUDIO_MUSIC_BASS_HZ: 65.41,
  AUDIO_MUSIC_BASS_GAIN: 0.22,
  AUDIO_MUSIC_PAD_ROOT_HZ: 130.81,
  AUDIO_MUSIC_PAD_FIFTH_HZ: 196.0,
  AUDIO_MUSIC_PAD_GAIN: 0.1,
  AUDIO_MUSIC_LAYER1_HZ: 392.0,
  AUDIO_MUSIC_LAYER1_MAX: 0.1,
  AUDIO_MUSIC_LAYER2_HZ: 440.0,
  AUDIO_MUSIC_LAYER2_MAX: 0.09,
  AUDIO_MUSIC_LAYER3_HZ: 987.77,
  AUDIO_MUSIC_LAYER3_MAX: 0.08,
  AUDIO_MUSIC_LAYER4_BP_HZ: 2400,
  AUDIO_MUSIC_LAYER4_MAX: 0.055,
  AUDIO_MUSIC_KICK_HZ: 58,
  AUDIO_MUSIC_KICK_PEAK: 0.38,
  AUDIO_MUSIC_HAT_GAIN: 0.12,
  /** Hat layer scales with chain (× this × layer ramp). */
  AUDIO_MUSIC_HAT_LAYER_MAX: 0.45,

  // ── Post-Processing (UnrealBloom — CLAUDE.md Phase 3) ──
  /** Bloom strength; emissive + bright HDR pixels. */
  BLOOM_INTENSITY: 0.3,
  /** Higher = only very bright pixels bloom (keeps mid-gray road from glowing). */
  BLOOM_THRESHOLD: 0.1,
  BLOOM_RADIUS: 0.0,
  /** Bloom buffer scale (GPU savings; <1 = half-res bloom pass). */
  BLOOM_RESOLUTION_SCALE: 0.5,
  /** ACESFilmic exposure. */
  TONE_MAPPING_EXPOSURE: 1.0,

  // ── Particles ──
  SPEED_LINES_COUNT: 30,
  SPEED_LINES_BASE_ALPHA: 0.3,
  SPEED_LINES_MAX_ALPHA: 0.8,
  RAIN_PARTICLE_COUNT: 100,
  /** Scaled by ×60×delta → world units/sec downward (0.3 ≈ 18 u/s). */
  RAIN_SPEED: 0.3,
  /** Half-width of spawn box around camera (X/Z). */
  RAIN_SPREAD: 15,
  /** Vertical span above/below camera for recycling (world units). */
  RAIN_HEIGHT_ABOVE: 22,
  RAIN_HEIGHT_BELOW: 8,
  RAIN_PARTICLE_SIZE: 0.055,
  RAIN_PARTICLE_OPACITY: 0.42,
  RAIN_PARTICLE_COLOR: 0x99aacc,
  /** Neon streaks behind taxi on slingshot (CLAUDE: 3–4). */
  SLINGSHOT_TRAIL_STREAK_COUNT: 4,
  SLINGSHOT_TRAIL_DURATION_MS: 500,
  /** Thin box: width (X), height (Y), length along −Z behind the taxi. */
  SLINGSHOT_TRAIL_LENGTH: 2.0,
  SLINGSHOT_TRAIL_WIDTH: 0.14,
  SLINGSHOT_TRAIL_BOX_HEIGHT: 0.1,
  /** World Y of streak center (above asphalt; was too low when forced to 0.06). */
  SLINGSHOT_TRAIL_SURFACE_Y: 1.12,
  /** Push streak center behind rear bumper (world Z). */
  SLINGSHOT_TRAIL_BACK_OFFSET_Z: 0.85,
  /** World-Z motion vs road scroll (1 = same as traffic). */
  SLINGSHOT_TRAIL_SCROLL_SCALE: 1.05,

  // ── Palette (Tokyo Night) ──
  PALETTE: {
    NEON_PINK: 0xff2d7b,
    NEON_BLUE: 0x00e5ff,
    NEON_PURPLE: 0xb44dff,
    NEON_ORANGE: 0xff6b2d,
    /** Asphalt / road surface (mid gray — was dark purple-black). */
    ROAD_DARK: 0x808080,
    TRAFFIC_BODY_COMPACT: 0x575766,
    TRAFFIC_BODY_TRUCK: 0x424254,
    /** Muted green body (replaces dark gray in traffic paint rotation). */
    TRAFFIC_BODY_GREEN: 0x3a7d5c,
    SKY: 0x08050e,
    TAXI_BODY: 0xe8b84d,
    TAXI_ROOF_LIGHT: 0x00ff88,
    TAIL_LIGHT: 0xff3333,
    HEADLIGHT: 0xffeedd,
    LANE_MARKING: 0xffffff,
    UI_TEXT: 0xf0e8ff,
  },

  // ── Touch / pointer (lane input) ──
  /** Half-screen tap ignores touches within this many px of horizontal center. */
  TOUCH_CENTER_DEAD_ZONE_PX: 20,
  /** Pointermove lane-steering only after finger moves this far from pointerdown (avoids double input with tap). */
  TOUCH_DRAG_SLOP_PX: 16,

  // ── Swipe Input (legacy; lane uses touch zones — kept for reference) ──
  SWIPE_THRESHOLD: 30,
  SWIPE_MAX_TIME: 300,

  // ── Scene lighting (MeshStandard vehicles need readable fill) ──
  AMBIENT_LIGHT_COLOR: 0x8899bb,
  AMBIENT_LIGHT_INTENSITY: 0.825,
  DIRECTIONAL_LIGHT_COLOR: 0xffeedd,
  DIRECTIONAL_LIGHT_INTENSITY: 0.75,
  DIRECTIONAL_LIGHT_POSITION: [8, 18, 6] as const,
  HEMISPHERE_LIGHT_SKY: 0x6688cc,
  HEMISPHERE_LIGHT_GROUND: 0x1a1428,
  HEMISPHERE_LIGHT_INTENSITY: 0.42,
} as const;

/** Traffic body paint — every value is a `PALETTE` color (add/remove to tune variety). */
export const TRAFFIC_PAINT_COLORS = [
  CONFIG.PALETTE.TRAFFIC_BODY_COMPACT,
  CONFIG.PALETTE.TRAFFIC_BODY_GREEN,
  CONFIG.PALETTE.NEON_PINK,
  CONFIG.PALETTE.NEON_BLUE,
  CONFIG.PALETTE.NEON_PURPLE,
  CONFIG.PALETTE.NEON_ORANGE,
] as const;
