# CLAUDE.md — Slipstream: Tokyo Night

## What This Is
Slipstream: Tokyo Night is a portrait-orientation mobile-first 3D endless racer built with **Three.js** and **TypeScript**. The player drives a Tokyo taxi, chaining slipstreams behind traffic vehicles to build a speed/score multiplier. It's designed as a **snackable game** (30s–5min sessions) for Instagram Reels distribution.

Read `DESIGN.md` for the full game design document. **All gameplay decisions should reference it.**

---

## Architecture — Three Layers (Strictly Enforced)

The game MUST be structured into three cleanly separated layers so it can be reskinned by swapping assets and config without touching engine code.

### 1. Engine Layer (`src/engine/`)
Core game logic. **Never references specific asset filenames or colors.** Everything goes through config and the skin manifest.

- `LaneSystem.ts` — 3-lane grid, swipe/keyboard input, lane-switch tweens with taxi body roll
- `SlipstreamZone.ts` — Rectangular hitbox behind each vehicle, draft detection, meter fill logic
- `ChainManager.ts` — Chain multiplier tracking, milestone events (×5, ×10, ×15, ×20), reset conditions
- `TrafficSpawner.ts` — Vehicle spawning with density phases, lane assignment, speed variance, lane-change telegraph
- `RoadManager.ts` — Infinite road segment recycling, roadside prop placement (signs, barriers, lamps)
- `ScoreManager.ts` — Distance scoring, slipstream bonuses, chain multiplier math, high score persistence
- `CollisionSystem.ts` — Player vs vehicle AABB collision, game-over trigger
- `CameraController.ts` — Elevated follow camera, FOV shifting, shake system

### 2. Skin Layer (`src/skins/tokyo-night/`)
All visual and audio assets for the Tokyo Night theme. Swapping this folder + its manifest = a new game skin.

- `manifest.ts` — Asset keys, file paths, color palette, material definitions, post-processing settings
- `models/` — GLTF/GLB files (or procedural geometry definitions for prototype)
- `textures/` — Road surface, neon sign atlas, skybox, particle sprites
- `audio/` — Engine hum, wind, draft lock-on, slingshot release, crash, milestone sounds, music

### 3. Config Layer (`src/config.ts`)
All tunable gameplay values in one file. Designers should be able to change the game's feel by editing ONLY this file.

```typescript
export const CONFIG = {
  // ── Canvas ──
  GAME_WIDTH: 390,
  GAME_HEIGHT: 844,

  // ── Camera (Vehicle Masters style — elevated third person) ──
  CAMERA_HEIGHT: 6.0,          // units above road (~20 feet)
  CAMERA_DISTANCE: 4.0,        // units behind player
  CAMERA_ANGLE: -45,           // degrees (looking down)
  CAMERA_FOV_BASE: 55,
  CAMERA_FOV_MAX: 65,          // widens at high chain
  CAMERA_FOV_LERP: 0.02,      // per frame
  CAMERA_SHAKE_INTENSITY: 0.03, // slingshot release shake
  CAMERA_SHAKE_DECAY: 0.9,

  // ── Lanes ──
  LANE_COUNT: 3,
  LANE_WIDTH: 2.5,             // 3D world units per lane
  LANE_SWITCH_DURATION: 150,   // ms
  LANE_SWITCH_EASE: 'easeOutBack',

  // ── Road ──
  ROAD_SEGMENT_LENGTH: 20,     // units per segment
  ROAD_VISIBLE_SEGMENTS: 8,    // how many segments ahead are visible
  ROAD_WIDTH: 10,              // total road width in units
  PROP_DENSITY: 0.6,           // chance of roadside prop per segment (0-1)
  FOG_NEAR: 15,
  FOG_FAR: 60,
  FOG_COLOR: 0x08050E,         // matches sky — hides pop-in naturally

  // ── Scrolling / Speed ──
  BASE_SCROLL_SPEED: 0.15,     // units per frame
  MAX_SCROLL_SPEED: 0.4,
  SPEED_RAMP_RATE: 0.00005,
  SLINGSHOT_SPEED_BURST: 0.1,
  SLINGSHOT_BURST_DURATION: 500, // ms

  // ── Slipstream ──
  SLIPSTREAM_ZONE_WIDTH: 2.0,  // units wide (centered behind vehicle)
  SLIPSTREAM_ZONE_DEPTH: 3.5,  // units behind vehicle
  DRAFT_FILL_RATE: 0.02,       // per frame (~1.5s at 60fps)

  // ── Chain ──
  CHAIN_TIMEOUT: 3000,         // ms without drafting → reset
  CHAIN_MILESTONES: [5, 10, 15, 20],
  CHAIN_SCORE_BASE: 50,

  // ── Traffic Density Phases ──
  TRAFFIC_PHASES: [
    { startTime: 0,      spawnRate: 2000, lanes: [1],       speedVariance: 0 },
    { startTime: 20000,  spawnRate: 1200, lanes: [0, 1, 2], speedVariance: 0.2 },
    { startTime: 60000,  spawnRate: 800,  lanes: [0, 1, 2], speedVariance: 0.4, laneChange: true },
    { startTime: 120000, spawnRate: 500,  lanes: [0, 1, 2], speedVariance: 0.6, laneChange: true },
  ],

  // ── Vehicles ──
  VEHICLE_TYPES: 2,
  VEHICLE_LANE_CHANGE_TELEGRAPH: 1500, // ms blinker
  VEHICLE_BASE_SPEED: 0.08,

  // ── Player Taxi ──
  TAXI_BODY_ROLL: 5,           // degrees on lane switch
  TAXI_ROLL_DURATION: 200,     // ms to roll, then spring back
  TAXI_WHEEL_TURN: 15,         // degrees wheel rotation on lane switch

  // ── Scoring ──
  DISTANCE_SCORE_RATE: 1,
  DISTANCE_SCORE_INTERVAL: 5,  // every N units = 1 point

  // ── Visual Juice ──
  SCREEN_FLASH_DURATION: 100,
  SCREEN_FLASH_COLOR: 0xFF2D7B,
  CHAIN_POP_SCALE: 1.3,
  CHAIN_POP_DURATION: 200,
  BLOOM_INTENSITY: 0.6,
  BLOOM_THRESHOLD: 0.8,
  BLOOM_RADIUS: 0.4,

  // ── Speed Lines ──
  SPEED_LINES_COUNT: 30,       // max active particles
  SPEED_LINES_BASE_ALPHA: 0.3,
  SPEED_LINES_MAX_ALPHA: 0.8,

  // ── Rain ──
  RAIN_PARTICLE_COUNT: 100,
  RAIN_SPEED: 0.3,
  RAIN_SPREAD: 15,             // area around camera

  // ── Neon Palette (Tokyo Night) ──
  PALETTE: {
    NEON_PINK: 0xFF2D7B,
    NEON_BLUE: 0x00E5FF,
    NEON_PURPLE: 0xB44DFF,
    NEON_ORANGE: 0xFF6B2D,
    ROAD_DARK: 0x1A1428,
    SKY: 0x08050E,
    TAXI_BODY: 0xE8B84D,       // warm orange-cream
    TAXI_ROOF_LIGHT: 0x00FF88, // green when normal
    UI_TEXT: 0xF0E8FF,
  },

  // ── Swipe Input ──
  SWIPE_THRESHOLD: 30,
  SWIPE_MAX_TIME: 300,
};
```

---

## Three.js Scene Setup

### Renderer
```
- WebGLRenderer with antialias: true, alpha: false
- pixelRatio: Math.min(window.devicePixelRatio, 2) — cap at 2x for mobile performance
- toneMapping: THREE.ACESFilmicToneMapping for cinematic neon look
- outputColorSpace: THREE.SRGBColorSpace
```

### Post-Processing (EffectComposer)
```
1. RenderPass — base scene render
2. UnrealBloomPass — neon glow (intensity: 0.6, threshold: 0.8, radius: 0.4)
   - This single pass makes ALL emissive materials glow. Neon signs, tail lights,
     taxi roof light, speed line particles — all get bloom automatically.
   - Keep threshold high (0.8) so only bright emissive elements bloom, not the whole scene.
3. OutputPass — final color correction
```

### Scene Graph Structure
```
Scene
├── AmbientLight (0x222244, intensity 0.3)
├── DirectionalLight (0xFFEEDD, intensity 0.2, angled from above-right)
├── Fog (CONFIG.FOG_COLOR, CONFIG.FOG_NEAR, CONFIG.FOG_FAR)
├── RoadGroup
│   ├── RoadSegment[0..7] (recycling pool)
│   │   ├── RoadMesh (dark asphalt plane with lane marking decals)
│   │   ├── ReflectionPlane (semi-transparent, picks up neon colors)
│   │   └── RoadsideProps[] (neon signs, barriers, lamp posts)
├── PlayerTaxi
│   ├── BodyMesh (warm orange-cream, low-poly)
│   ├── RoofLight (emissive green mesh — changes color at milestones)
│   ├── Headlights (emissive white, forward-facing)
│   └── TailLights (emissive red/orange)
├── TrafficGroup
│   ├── Vehicle[0..19] (object pool)
│   │   ├── BodyMesh
│   │   ├── TailLights (emissive — bloom makes these glow naturally)
│   │   └── SlipstreamZoneHelper (debug only, wireframe box)
├── ParticleGroup
│   ├── RainSystem (sprite-based, 100 particles max)
│   ├── SpeedLineSystem (thin bright streaks, 30 max)
│   └── SlingshotBurstSystem (short-lived, 20 max)
├── HUDGroup (rendered with separate orthographic camera overlay)
│   ├── ScoreText
│   ├── ChainText
│   └── DraftMeterArc
└── Camera (PerspectiveCamera, positioned per CameraController)
```

### Lighting Strategy — No Dynamic Lights
The night setting is a performance gift. All glow comes from emissive materials + bloom:
- Neon signs: MeshBasicMaterial with emissive color (bloom makes them glow)
- Tail lights: Small MeshBasicMaterial planes with bright color
- Taxi roof light: MeshBasicMaterial, color changes via material.color.set()
- Road reflections: A semi-transparent plane below road level with environment map or manual color tinting
- NO PointLights, NO SpotLights — these are expensive on mobile

---

## Phaser Scenes → Three.js States

Since Three.js has no built-in scene/state manager, implement a simple state machine:

### GameState (`src/engine/GameState.ts`)
```typescript
type State = 'playing' | 'gameover';
```
- `playing`: All systems updating. Input active. Score counting.
- `gameover`: Everything frozen. Overlay visible. Retry button active.
- Transition playing → gameover: On collision. Instant. No animation delay.
- Transition gameover → playing: On retry tap. Reset all systems. Under 1 second.

---

## 3D Road System (`src/engine/RoadManager.ts`)

The road is an infinite corridor built from recycling segments:

1. Create a pool of `ROAD_VISIBLE_SEGMENTS` (8) segment meshes
2. Each segment is `ROAD_SEGMENT_LENGTH` (20) units long
3. Position them end-to-end ahead of the camera
4. As the camera moves forward, the segment that falls behind the camera is recycled to the front
5. Each segment includes: road plane mesh, lane marking decals, and roadside props (neon signs, barriers, lamp posts) placed randomly based on `PROP_DENSITY`

**Roadside props are what sell the speed.** They fly past in peripheral vision. Vary them: tall neon signs, short barriers, lamp posts with glow, vending machines, traffic cones. Each is a simple low-poly mesh with optional emissive material for neon glow.

---

## Player Taxi (`src/engine/PlayerTaxi.ts`)

The taxi is a group of meshes representing a simplified Japanese taxi:

### Prototype (Phase 1 — gray boxes):
```
- Body: Box geometry (1.8 × 0.8 × 3.5 units) — cream/orange color
- Roof light: Small box on top (0.4 × 0.2 × 0.6) — green emissive
- Wheels: 4 cylinders at corners — dark gray
- Headlights: 2 small planes, front — white emissive
- Tail lights: 2 small planes, rear — red/orange emissive
```

### Lane Switch Animation:
1. Taxi slides laterally to target lane X position (LANE_SWITCH_DURATION ms, easeOutBack)
2. Body rolls TAXI_BODY_ROLL degrees toward direction of movement
3. Front wheels turn TAXI_WHEEL_TURN degrees
4. After reaching target lane: body roll springs back to 0° with slight overshoot
5. Wheels straighten

### Roof Light Behavior:
- Normal: Glowing green (空車 vacant)
- During draft: Pulses amber (matching the drafting glow color)
- At ×10 milestone: Flashes neon pink for 2 seconds
- At ×20: Strobes pink/blue rapidly

---

## Traffic Vehicles

### Object Pool
- Pre-create 20 vehicle meshes (10 Type A compact, 10 Type B truck)
- On spawn: position above screen, set lane, set speed, make visible
- When below camera: make invisible, return to pool
- Never create/destroy at runtime

### Prototype (Phase 1 — gray boxes):
```
Type A (compact): Box (1.6 × 0.7 × 3.0) — various dark colors + red tail light planes
Type B (truck): Box (2.0 × 1.2 × 4.5) — various dark colors + red tail light planes
```

### Lane Change Telegraph:
- When a vehicle will change lanes (Rush/Frenzy phases only):
  1. Blinker activates 1500ms before the move (small orange emissive light on the side)
  2. Vehicle smoothly slides to adjacent lane over 800ms
  3. Blinker deactivates
- This gives the player clear warning — deaths from lane-changing traffic should feel fair

---

## Slipstream Visual Feedback

### Draft State Active:
1. **Target vehicle tail lights brighten** — increase emissive intensity 2x
2. **Neon pink aura** — add a slightly larger, semi-transparent pink plane behind the target vehicle that pulses
3. **Speed lines** — activate SpeedLineSystem: thin bright cyan streaks moving from top of screen toward bottom (from elevated camera, they streak along the road surface)
4. **Road glow** — the road segment between player and target vehicle tints slightly pink (change road material emissive)
5. **Draft meter** — HUD arc fills from 0 to 100% near the player taxi

### Slingshot Release:
1. **Speed burst** — temporarily increase scroll speed by SLINGSHOT_SPEED_BURST for SLINGSHOT_BURST_DURATION
2. **Neon trail** — 3-4 bright streak particles trail behind the taxi for 0.5s
3. **Camera push** — brief 2-frame forward nudge on camera (then smoothly return)
4. **Chain pop** — chain text scales 1.3x → 1.0x with color flash (white → pink)
5. **Audio** — whoosh + synthetic chime

---

## HUD (`src/ui/HUD.ts`)

Rendered as an HTML/CSS overlay on top of the Three.js canvas (NOT as 3D text — cleaner, more performant, easier to style).

### Elements:
```
┌─────────────────────┐
│      12,450         │  ← Score (top center, large)
│        ×8           │  ← Chain multiplier (below score, neon pink when active)
│                     │
│                     │
│                     │
│                     │
│                     │
│     ◠ [draft]       │  ← Draft meter (small arc near bottom, only visible during draft)
└─────────────────────┘
```

### Styling:
- Font: Orbitron (matches design doc)
- Score: white, large, subtle text-shadow glow
- Chain: neon pink when active, fades to dim when chain is ×1
- Draft meter: thin arc, fills with neon blue, disappears when not drafting
- "PERFECT" milestone text: large, centered, neon pink with glow, fades over 1s

---

## Game Over Screen (`src/ui/GameOverScreen.ts`)

Also HTML/CSS overlay. The Three.js scene freezes behind it (stop the render loop or just stop updating positions).

### Layout:
```
┌─────────────────────┐
│                     │
│    GAME OVER        │  ← Orbitron, neon pink
│                     │
│     24,800          │  ← Final score (huge)
│   NEW BEST! ⚡      │  ← Only if new high score
│                     │
│  Chain: ×12         │  ← Best chain this run
│  Distance: 1.4km    │
│                     │
│  ┌───────────────┐  │
│  │    RETRY      │  │  ← Giant button, neon border, center screen
│  └───────────────┘  │
│                     │
│     [ Share ]       │  ← Smaller, below retry
└─────────────────────┘
```

**RETRY MUST BE UNDER 1 SECOND.** Reset all systems, reposition objects, restart render loop. No scene reload, no asset re-parse.

---

## Performance Targets

| Metric | Target |
|--------|--------|
| FPS | 60fps on mid-range phone (2023 era) |
| Triangles | < 50K visible at any time |
| Draw calls | < 50 |
| Texture memory | < 10MB total |
| JS bundle | < 500KB gzipped |
| Time to interactive | < 3 seconds on 4G |

### Optimization Strategies:
- **Object pooling** for ALL traffic vehicles and particles — never create/destroy at runtime
- **Road segment recycling** — only 8 segments exist at once
- **InstancedMesh** for repeated roadside props (lamp posts, barriers)
- **Fog** hides LOD pop-in naturally (night + fog = free culling)
- **pixelRatio cap at 2** — 3x retina displays don't need 3x render resolution
- **Bloom pass resolution** — render bloom at half resolution for major GPU savings
- **Geometry merging** — merge all static props per road segment into one mesh
- **Frustum culling** — Three.js does this automatically, but ensure objects are properly bounded

---

## Development Order

### Phase 1 — Gray Box (get it running)
1. Three.js scene with renderer, camera at elevated position, gray plane road
2. Box taxi that lane-switches on swipe/arrow keys
3. Box traffic vehicles spawning and scrolling toward camera
4. Road segment recycling (infinite road)
5. Collision detection → game state switch
6. 60fps on phone ← **validate this before moving on**

### Phase 2 — Core Mechanic (get it feeling good)
7. Slipstream zone detection behind vehicles
8. Draft meter fill/release logic
9. Slingshot speed burst on release
10. Chain counter with timeout reset
11. Score calculation
12. HUD overlay (score, chain, draft meter)
13. Game over overlay with retry
14. **The draft → slingshot → chain loop must feel satisfying with gray boxes**

### Phase 3 — Tokyo Night Skin (make it beautiful)
15. Replace box taxi with low-poly model (or detailed box geometry with proper proportions)
16. Replace traffic boxes with styled vehicle meshes
17. Dark road surface with lane markings
18. Roadside neon signs (emissive boxes with bright colors)
19. Bloom post-processing pass
20. Fog (matches sky color, hides pop-in)
21. Rain particle system
22. Wet road reflection (reflective plane or tinted ground)
23. Skybox or background gradient

### Phase 4 — Juice (make it addictive)
24. Speed lines during draft
25. Draft glow on target vehicle tail lights
26. Slingshot neon trail particles
27. Chain counter pop tween
28. ×10 screen flash + "PERFECT" text
29. FOV shift at high chain
30. Taxi body roll animation on lane switch
31. Taxi roof light color changes at milestones
32. Audio: engine hum, wind, draft tones, slingshot whoosh, milestone chimes
33. Music: lo-fi synthwave base track with chain-reactive layers

### Phase 5 — Polish
34. Share card generation (canvas snapshot)
35. High score persistence (localStorage)
36. Performance optimization pass
37. Mobile touch input tuning (swipe sensitivity, dead zones)
38. Portrait mode lock / responsive resize

---

## Scope — What Is NOT in V1

Do NOT implement any of these:
- Jumps, ramps, or boosts (the slipstream IS the boost)
- Vehicle upgrades or selection (one taxi, always)
- Coins or currency (score only)
- Oncoming traffic (one-way road only)
- Road curves or turns (straight road, MVP)
- Real-time shadows (emissive + bloom handles all lighting)
- Dynamic point/spot lights (too expensive on mobile)
- Pause button
- Tutorial screen (warm-up phase IS the tutorial)
- Leaderboard (local high score only)
- Weather variety (rain-at-night only — it IS the art style)

---

## File Structure

```
slipstream-tokyo/
├── CLAUDE.md              ← You are here
├── DESIGN.md              ← Full game design document (HTML)
├── README.md
├── package.json
├── tsconfig.json
├── vite.config.ts
├── index.html
├── public/
├── src/
│   ├── main.ts                        ← Three.js renderer setup, boot
│   ├── config.ts                      ← All tunable values
│   ├── engine/
│   │   ├── GameState.ts               ← State machine (playing/gameover)
│   │   ├── LaneSystem.ts              ← Lane grid + swipe input
│   │   ├── SlipstreamZone.ts          ← Draft detection + meter
│   │   ├── ChainManager.ts            ← Chain multiplier + milestones
│   │   ├── TrafficSpawner.ts          ← Vehicle pool + density phases
│   │   ├── RoadManager.ts             ← Infinite road segment recycling
│   │   ├── ScoreManager.ts            ← Scoring math + high score
│   │   ├── CollisionSystem.ts         ← AABB collision
│   │   ├── CameraController.ts        ← Elevated follow cam + FOV + shake
│   │   └── PlayerTaxi.ts              ← Taxi mesh group + body roll + roof light
│   ├── skins/
│   │   └── tokyo-night/
│   │       ├── manifest.ts            ← Asset registry + palette + materials
│   │       ├── models/                ← GLTF/GLB files (Phase 3+)
│   │       ├── textures/              ← Road, neon atlas, skybox, particles
│   │       └── audio/                 ← All sound files
│   └── ui/
│       ├── HUD.ts                     ← HTML overlay: score, chain, draft meter
│       ├── GameOverScreen.ts          ← HTML overlay: results + retry
│       └── ShareCard.ts               ← Canvas snapshot for sharing
```

---

## Testing Checklist

Before considering the game "done":
- [ ] First moment of fun within 10 seconds of opening
- [ ] A complete novice understands the mechanic without reading anything
- [ ] Chain ×10 feels euphoric (visual + audio + score explosion)
- [ ] Losing a high chain feels heartbreaking (instant motivation to retry)
- [ ] Retry is under 1 second from tap to playing again
- [ ] 60fps on a mid-range 2023 phone (test on a real device, not just desktop)
- [ ] Portrait orientation fills the screen properly on iPhone and Android
- [ ] A 3-minute run feels like 30 seconds (flow state achieved)
- [ ] The taxi is always clearly visible and trackable from the elevated camera
- [ ] Lane-switching reads cleanly — player always knows which lane they're in
- [ ] Neon signs and wet road reflections look atmospheric, not garish
- [ ] Bloom is subtle — enhances neon, doesn't wash out the scene
- [ ] No visual pop-in visible (fog handles this)
- [ ] Rain is atmospheric, not distracting (it's seasoning, not the meal)
