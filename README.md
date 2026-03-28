# Slipstream: Tokyo Night

A 3D endless taxi racer through neon-lit Tokyo streets. Chain slipstreams behind traffic to build speed. Built with Three.js + TypeScript.

## Quickstart

```bash
npm install
npm run dev
```

Opens at `http://localhost:3000`. Arrow keys to lane-switch (swipe on mobile).

## Project Structure

```
src/
├── main.ts                     # Three.js renderer, scene, post-processing, game loop
├── config.ts                   # ALL tunable gameplay values
├── engine/
│   ├── GameState.ts            # State machine (playing/gameover)
│   ├── CameraController.ts     # Elevated follow cam (~20ft up, Vehicle Masters style)
│   ├── PlayerTaxi.ts           # Taxi mesh group + body roll + roof light
│   ├── RoadManager.ts          # Infinite road segment recycling + roadside props
│   ├── LaneSystem.ts           # Lane grid + swipe/keyboard input
│   ├── SlipstreamZone.ts       # Draft detection + meter
│   ├── ChainManager.ts         # Chain multiplier + milestones
│   ├── TrafficSpawner.ts       # Vehicle object pool + density phases
│   ├── ScoreManager.ts         # Scoring + high score persistence
│   └── CollisionSystem.ts      # AABB collision
├── skins/tokyo-night/          # All swappable art, audio, palette
│   └── manifest.ts
└── ui/
    ├── HUD.ts                  # HTML overlay (score, chain, draft meter)
    ├── GameOverScreen.ts       # HTML overlay (results, retry)
    └── ShareCard.ts            # Canvas snapshot for sharing
```

## Key Files for AI Tools

- **CLAUDE.md** — Full project instructions for Claude Code / Cursor
- **DESIGN.md** — Complete game design document (HTML)
- **src/config.ts** — Every tunable value
- **src/skins/tokyo-night/manifest.ts** — Asset registry for reskinning

## Development Order

1. Gray box: road plane, box taxi, box traffic, elevated camera, lane-switch, collision → 60fps on phone
2. Core mechanic: slipstream zones, draft meter, slingshot, chain, score, HUD, game over + retry
3. Tokyo Night skin: low-poly models, neon materials, bloom, fog, rain, wet road
4. Juice: speed lines, draft glow, slingshot particles, chain pops, milestones, FOV, body roll, audio
5. Polish: share card, high scores, performance pass, mobile touch tuning

**Gray boxes first. Art last. The mechanic must feel good with boxes.**
