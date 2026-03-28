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

  // ── Camera (Vehicle Masters style — elevated third person, ~20ft up) ──
  CAMERA_HEIGHT: 6.0,
  CAMERA_DISTANCE: 4.0,
  CAMERA_ANGLE: -45,
  CAMERA_FOV_BASE: 55,
  CAMERA_FOV_MAX: 65,
  CAMERA_FOV_LERP: 0.02,
  CAMERA_SHAKE_INTENSITY: 0.03,
  CAMERA_SHAKE_DECAY: 0.9,

  // ── Lanes ──
  LANE_COUNT: 3,
  LANE_WIDTH: 2.5,
  LANE_SWITCH_DURATION: 150,

  // ── Road ──
  ROAD_SEGMENT_LENGTH: 20,
  ROAD_VISIBLE_SEGMENTS: 8,
  ROAD_WIDTH: 10,
  PROP_DENSITY: 0.6,
  FOG_NEAR: 15,
  FOG_FAR: 60,
  FOG_COLOR: 0x08050E,

  // ── Speed ──
  BASE_SCROLL_SPEED: 0.15,
  MAX_SCROLL_SPEED: 0.4,
  SPEED_RAMP_RATE: 0.00005,
  SLINGSHOT_SPEED_BURST: 0.1,
  SLINGSHOT_BURST_DURATION: 500,

  // ── Slipstream ──
  SLIPSTREAM_ZONE_WIDTH: 2.0,
  SLIPSTREAM_ZONE_DEPTH: 3.5,
  DRAFT_FILL_RATE: 0.02,

  // ── Chain ──
  CHAIN_TIMEOUT: 3000,
  CHAIN_MILESTONES: [5, 10, 15, 20] as readonly number[],
  CHAIN_SCORE_BASE: 50,

  // ── Traffic ──
  TRAFFIC_PHASES: [
    { startTime: 0,      spawnRate: 2000, lanes: [1],       speedVariance: 0 },
    { startTime: 20000,  spawnRate: 1200, lanes: [0, 1, 2], speedVariance: 0.2 },
    { startTime: 60000,  spawnRate: 800,  lanes: [0, 1, 2], speedVariance: 0.4, laneChange: true },
    { startTime: 120000, spawnRate: 500,  lanes: [0, 1, 2], speedVariance: 0.6, laneChange: true },
  ] as readonly TrafficPhase[],
  VEHICLE_TYPES: 2,
  VEHICLE_LANE_CHANGE_TELEGRAPH: 1500,
  VEHICLE_BASE_SPEED: 0.08,
  VEHICLE_POOL_SIZE: 20,

  // ── Player Taxi ──
  TAXI_BODY_ROLL: 5,
  TAXI_ROLL_DURATION: 200,
  TAXI_WHEEL_TURN: 15,
  TAXI_POSITION_Z: 0,
  TAXI_DIMENSIONS: { width: 1.8, height: 0.8, length: 3.5 },

  // ── Scoring ──
  DISTANCE_SCORE_RATE: 1,
  DISTANCE_SCORE_INTERVAL: 5,

  // ── Visual Juice ──
  SCREEN_FLASH_DURATION: 100,
  CHAIN_POP_SCALE: 1.3,
  CHAIN_POP_DURATION: 200,

  // ── Post-Processing ──
  BLOOM_INTENSITY: 0.6,
  BLOOM_THRESHOLD: 0.8,
  BLOOM_RADIUS: 0.4,
  BLOOM_RESOLUTION_SCALE: 0.5,

  // ── Particles ──
  SPEED_LINES_COUNT: 30,
  SPEED_LINES_BASE_ALPHA: 0.3,
  SPEED_LINES_MAX_ALPHA: 0.8,
  RAIN_PARTICLE_COUNT: 100,
  RAIN_SPEED: 0.3,
  RAIN_SPREAD: 15,
  SLINGSHOT_PARTICLE_COUNT: 20,

  // ── Palette (Tokyo Night) ──
  PALETTE: {
    NEON_PINK: 0xFF2D7B,
    NEON_BLUE: 0x00E5FF,
    NEON_PURPLE: 0xB44DFF,
    NEON_ORANGE: 0xFF6B2D,
    ROAD_DARK: 0x1A1428,
    SKY: 0x08050E,
    TAXI_BODY: 0xE8B84D,
    TAXI_ROOF_LIGHT: 0x00FF88,
    TAIL_LIGHT: 0xFF3333,
    HEADLIGHT: 0xFFEEDD,
    LANE_MARKING: 0xFFFFFF,
    UI_TEXT: 0xF0E8FF,
  },

  // ── Swipe Input ──
  SWIPE_THRESHOLD: 30,
  SWIPE_MAX_TIME: 300,
} as const;
