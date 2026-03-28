<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Slipstream: Tokyo Night — Game Design Document</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@500;700;900&family=DM+Sans:ital,wght@0,400;0,500;0,700;1,400&display=swap');

:root {
  --bg: #08050e;
  --surface: #0f0b18;
  --surface-2: #161024;
  --neon-pink: #ff2d7b;
  --neon-blue: #00e5ff;
  --neon-purple: #b44dff;
  --neon-orange: #ff6b2d;
  --warm-white: #f0e8ff;
  --dim: #8a7fa3;
  --road-dark: #1a1428;
  --font-display: 'Orbitron', sans-serif;
  --font-body: 'DM Sans', sans-serif;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--warm-white);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.7;
  overflow-x: hidden;
}

/* ── HERO ── */
.hero {
  position: relative;
  padding: 80px 40px 60px;
  text-align: center;
  overflow: hidden;
}
.hero::before {
  content: '';
  position: absolute;
  top: -40%;
  left: -20%;
  width: 140%;
  height: 200%;
  background:
    radial-gradient(ellipse at 30% 40%, rgba(255,45,123,0.08) 0%, transparent 50%),
    radial-gradient(ellipse at 70% 60%, rgba(0,229,255,0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 80%, rgba(180,77,255,0.05) 0%, transparent 40%);
  pointer-events: none;
}
.hero h1 {
  font-family: var(--font-display);
  font-size: clamp(2rem, 5.5vw, 3.8rem);
  font-weight: 900;
  letter-spacing: 3px;
  background: linear-gradient(135deg, var(--neon-pink), var(--neon-purple), var(--neon-blue));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  text-transform: uppercase;
}
.hero .subtitle {
  font-family: var(--font-display);
  font-size: 0.85rem;
  letter-spacing: 4px;
  text-transform: uppercase;
  color: var(--neon-blue);
  margin-top: 8px;
  opacity: 0.8;
}
.hero .tagline {
  font-size: 1.1rem;
  color: var(--dim);
  margin-top: 16px;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}
.hero .meta {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
  flex-wrap: wrap;
}
.hero .meta span {
  font-size: 0.8rem;
  font-family: var(--font-display);
  color: var(--dim);
  padding: 6px 16px;
  border: 1px solid rgba(180,77,255,0.2);
  border-radius: 100px;
  letter-spacing: 1px;
}

/* ── LAYOUT ── */
.container { max-width: 900px; margin: 0 auto; padding: 0 32px 80px; }

/* ── SECTIONS ── */
section { margin-top: 64px; }
section h2 {
  font-family: var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 2px;
  text-transform: uppercase;
  color: var(--neon-pink);
  margin-bottom: 24px;
  position: relative;
  padding-left: 20px;
}
section h2::before {
  content: '';
  position: absolute;
  left: 0; top: 2px;
  width: 5px; height: 100%;
  background: linear-gradient(180deg, var(--neon-pink), var(--neon-purple));
  border-radius: 3px;
  box-shadow: 0 0 12px rgba(255,45,123,0.4);
}
section h3 {
  font-family: var(--font-display);
  font-size: 0.9rem;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: var(--neon-blue);
  margin: 32px 0 12px;
}
p { margin-bottom: 16px; }

/* ── CALLOUT ── */
.callout {
  background: var(--surface);
  border-left: 4px solid var(--neon-pink);
  padding: 20px 24px;
  border-radius: 0 12px 12px 0;
  margin: 24px 0;
  box-shadow: -4px 0 20px rgba(255,45,123,0.08);
}
.callout.blue { border-left-color: var(--neon-blue); box-shadow: -4px 0 20px rgba(0,229,255,0.08); }
.callout.purple { border-left-color: var(--neon-purple); box-shadow: -4px 0 20px rgba(180,77,255,0.08); }
.callout.orange { border-left-color: var(--neon-orange); box-shadow: -4px 0 20px rgba(255,107,45,0.08); }
.callout strong { color: var(--neon-pink); }
.callout.blue strong { color: var(--neon-blue); }
.callout.purple strong { color: var(--neon-purple); }
.callout.orange strong { color: var(--neon-orange); }

/* ── TABLE ── */
.state-table {
  width: 100%;
  border-collapse: collapse;
  margin: 24px 0;
  font-size: 0.9rem;
}
.state-table th {
  text-align: left;
  padding: 12px 16px;
  background: var(--surface);
  color: var(--neon-blue);
  font-family: var(--font-display);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  border-bottom: 2px solid rgba(0,229,255,0.15);
}
.state-table td {
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  color: var(--dim);
  vertical-align: top;
}
.state-table tr:hover td { background: rgba(180,77,255,0.03); }

/* ── TAGS ── */
.tag {
  display: inline-block;
  font-size: 0.7rem;
  font-family: var(--font-display);
  padding: 3px 10px;
  border-radius: 100px;
  margin: 2px 4px 2px 0;
  letter-spacing: 0.5px;
}
.tag.pink { background: rgba(255,45,123,0.15); color: var(--neon-pink); }
.tag.blue { background: rgba(0,229,255,0.15); color: var(--neon-blue); }
.tag.purple { background: rgba(180,77,255,0.15); color: var(--neon-purple); }
.tag.orange { background: rgba(255,107,45,0.15); color: var(--neon-orange); }

/* ── FLOW ── */
.flow {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 32px 0;
  flex-wrap: wrap;
  justify-content: center;
}
.flow-step {
  background: var(--surface);
  border: 1px solid rgba(180,77,255,0.15);
  border-radius: 12px;
  padding: 16px 20px;
  text-align: center;
  min-width: 130px;
}
.flow-step .label {
  font-family: var(--font-display);
  font-size: 0.8rem;
  color: var(--neon-pink);
  margin-bottom: 4px;
  letter-spacing: 1px;
}
.flow-step .desc { font-size: 0.8rem; color: var(--dim); }
.flow-arrow { color: var(--neon-purple); font-size: 1.4rem; padding: 0 8px; opacity: 0.5; }

/* ── REF GRID ── */
.ref-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
  margin: 24px 0;
}
.ref-card {
  background: var(--surface);
  border: 1px solid rgba(255,255,255,0.04);
  border-radius: 12px;
  padding: 20px;
  transition: border-color 0.3s;
}
.ref-card:hover { border-color: rgba(255,45,123,0.3); }
.ref-card .name { font-family: var(--font-display); font-size: 0.9rem; color: var(--warm-white); margin-bottom: 4px; letter-spacing: 1px; }
.ref-card .platform { font-size: 0.7rem; color: var(--neon-purple); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
.ref-card .why { font-size: 0.9rem; color: var(--dim); line-height: 1.6; }

/* ── TEMPLATE LAYERS ── */
.template-layers {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 24px 0;
}
.layer-card {
  background: var(--surface);
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255,255,255,0.04);
}
.layer-card .layer-label {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: var(--neon-blue);
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 1.5px;
}
.layer-card ul { list-style: none; padding: 0; }
.layer-card li {
  font-size: 0.9rem;
  color: var(--dim);
  padding: 4px 0;
  padding-left: 16px;
  position: relative;
}
.layer-card li::before { content: '→'; position: absolute; left: 0; color: var(--neon-purple); }

/* ── DIVIDER ── */
.divider {
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(180,77,255,0.2), transparent);
  margin: 48px 0;
}

@media (max-width: 600px) {
  .hero { padding: 48px 20px 40px; }
  .container { padding: 0 20px 60px; }
  .template-layers { grid-template-columns: 1fr; }
  .flow-step { min-width: 100px; padding: 12px 14px; }
}
</style>
</head>
<body>

<div class="hero">
  <h1>Slipstream</h1>
  <p class="subtitle">Tokyo Night</p>
  <p class="tagline">A 3D endless taxi racer through neon-lit Tokyo streets. Chain slipstreams behind traffic to build speed. Feel the flow.</p>
  <div class="meta">
    <span>3D · Three.js</span>
    <span>Portrait · Mobile-First</span>
    <span>30s – 5min Sessions</span>
    <span>Template-Ready</span>
  </div>
</div>

<div class="container">

  <!-- ══════════ VISION ══════════ -->
  <section>
    <h2>Vision — What This Game Feels Like</h2>
    <p>You're driving a Tokyo taxi through nighttime traffic. Neon signs blur past. Rain-slicked asphalt reflects pink and blue light. You tuck in behind a delivery truck and the world narrows — speed lines streak past, the engine note drops into a satisfying draft hum, and your speed climbs. You slingshot past, the city opens up for a heartbeat, and then you're hunting the next vehicle to chain behind. Your multiplier ticks up. ×5. ×8. ×10 — the screen flashes, the score explodes, and you're in a flow state where the city is just light and motion.</p>
    <p>This is Traffic Rider's thrilling traffic-weaving fused with a slipstream drafting mechanic as the core loop, viewed from an elevated third-person camera like Vehicle Masters. You pilot a compact Tokyo taxi — iconic, instantly recognizable, with warm orange tail lights that pop against neon. The setting is Tokyo at night. The art style is clean, slightly stylized low-poly 3D — not photorealistic, but polished and readable at speed on a phone screen.</p>
  </section>

  <div class="divider"></div>

  <!-- ══════════ REFERENCES ══════════ -->
  <section>
    <h2>Reference Games</h2>
    <div class="ref-grid">
      <div class="ref-card">
        <div class="name">Traffic Rider</div>
        <div class="platform">iOS / Android</div>
        <div class="why"><strong>Primary reference.</strong> Weaving through traffic, overtaking close for bonuses. Study the sense of speed, the satisfying near-miss feeling, and how traffic density scales. Slipstream takes this traffic-weaving thrill and adds the drafting chain mechanic — but viewed from above like Vehicle Masters instead of first-person.</div>
      </div>
      <div class="ref-card">
        <div class="name">Vehicle Masters</div>
        <div class="platform">iOS / Android / Web</div>
        <div class="why"><strong>Art style reference.</strong> Clean low-poly 3D with strong color, readable silhouettes, and a slightly stylized feel that runs well on mobile. Slipstream's vehicles and city environment should hit this quality bar — not photorealistic, but polished and characterful.</div>
      </div>
      <div class="ref-card">
        <div class="name">Alto's Odyssey</div>
        <div class="platform">iOS / Android</div>
        <div class="why"><strong>Mood and flow reference.</strong> Proof that an endless runner can feel meditative and beautiful, not just frantic. The sky transitions, the ambient audio layers, and the "one-more-run" pull. Slipstream's Tokyo night should feel this atmospheric.</div>
      </div>
      <div class="ref-card">
        <div class="name">Subway Surfers</div>
        <div class="platform">iOS / Android</div>
        <div class="why"><strong>Lane-switching feel.</strong> Gold standard for swipe-to-change-lanes on mobile in portrait mode. The generous input windows and satisfying snap between lanes. Slipstream's lane-switch needs this crispness.</div>
      </div>
      <div class="ref-card">
        <div class="name">Sling Drift</div>
        <div class="platform">iOS / Android</div>
        <div class="why"><strong>Template architecture reference.</strong> Minimalist art that swaps easily. Study how they made a reskinnable single-mechanic game. Slipstream's Engine/Skin/Config separation should enable this level of reskinnability.</div>
      </div>
      <div class="ref-card">
        <div class="name">Ridge Racer Series</div>
        <div class="platform">Console</div>
        <div class="why"><strong>Slipstream mechanic reference.</strong> The original drafting/slipstream mechanic in racing games. Study how the speed boost feels, the visual indicators for being in the draft zone, and the slingshot moment when you break free.</div>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ CORE LOOP ══════════ -->
  <section>
    <h2>Core Game Loop — 10-Second Cycle</h2>

    <div class="flow">
      <div class="flow-step"><div class="label">Spot</div><div class="desc">See tail lights ahead in traffic</div></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><div class="label">Tuck</div><div class="desc">Swipe to align directly behind</div></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><div class="label">Draft</div><div class="desc">Speed builds, screen narrows, engine hums</div></div>
      <div class="flow-arrow">→</div>
      <div class="flow-step"><div class="label">Slingshot</div><div class="desc">Burst past, chain +1, hunt the next target</div></div>
    </div>

    <div class="callout">
      <strong>The Chain is the Game.</strong> Each consecutive slipstream without crashing increases your chain multiplier (×2, ×3, ×4…). The chain multiplies your score per meter. Breaking the chain (hitting a vehicle, drifting too far from traffic for 3+ seconds) resets the multiplier to ×1. A 10-chain run at top speed generates an exponentially higher score than 10 separate slipstreams.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ CAMERA & PERSPECTIVE ══════════ -->
  <section>
    <h2>Camera & Perspective</h2>
    <p>The camera sits high above and behind the taxi — approximately 20 feet (6 units) up, looking down at a ~45° angle. This is the Vehicle Masters perspective: you can see your vehicle clearly, read the road ahead, and spot incoming traffic with plenty of reaction time. It feels like a god-view driving game, not a cockpit sim.</p>

    <div class="callout blue">
      <strong>Camera specs:</strong><br><br>
      <strong>Position:</strong> ~4 units behind and ~6 units above the taxi, angled ~45° downward. The taxi sits in the lower third of the screen, giving maximum forward visibility in portrait mode.<br><br>
      <strong>FOV:</strong> Base 55°. Widens to 65° at high chain (×10+) for speed sensation. Smooth lerp.<br><br>
      <strong>Shake:</strong> Tiny 2-frame shake on slingshot release. Subtle sustained vibration during draft. Keep it gentle — at this camera height, too much shake feels disconnected from the vehicle.<br><br>
      <strong>Portrait orientation:</strong> The elevated angle + portrait mode gives you a long vertical view of the road ahead. Traffic approaching looks dramatic — vehicles emerge from the distance and grow as they approach. This perspective makes the game immediately readable and approachable on a small phone screen.<br><br>
      <strong>Why this works for mobile:</strong> The high camera means the player can see 2–3 vehicles ahead at all times. No blind corners, no unfair deaths from things they couldn't see. The taxi is always visible and centered, so there's a constant anchor point. Lane-switching reads clearly because you see the full road width.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ CONTROLS ══════════ -->
  <section>
    <h2>Controls — One Input</h2>
    <p>Swipe left/right to change lanes. That's it. The taxi accelerates automatically. No brake, no throttle, no tilt. One input, three lanes, pure positioning skill.</p>

    <table class="state-table">
      <tr><th>Context</th><th>Swipe Does</th><th>Feel</th></tr>
      <tr>
        <td>Open road</td>
        <td>Smooth lane change. Taxi slides laterally with a slight body roll animation.</td>
        <td>Calm, scanning for targets</td>
      </tr>
      <tr>
        <td>Approaching vehicle</td>
        <td>Tuck into slipstream zone. Draft indicators activate — speed lines, tail light glow intensifies, engine note shifts.</td>
        <td>Anticipation, precision</td>
      </tr>
      <tr>
        <td>In active draft</td>
        <td>Slingshot release. Speed burst as you whip past. Chain counter ticks up.</td>
        <td>Exhilaration, dopamine</td>
      </tr>
    </table>
  </section>

  <div class="divider"></div>

  <!-- ══════════ SLIPSTREAM MECHANIC ══════════ -->
  <section>
    <h2>Slipstream Mechanic — Detail</h2>

    <h3>The Draft Zone</h3>
    <p>An invisible box directly behind each traffic vehicle. When the player's taxi enters this zone, drafting begins. The zone is generous enough that casual players can stumble into it, but precise enough that lining up feels intentional.</p>

    <div class="callout purple">
      <strong>Entering the draft zone triggers (simultaneously):</strong><br><br>
      <strong>Visual:</strong> Speed lines stream from screen edges (3D particle system). The vehicle ahead gets a neon glow on its tail lights that intensifies as the draft meter fills. The road reflections brighten — the world literally gets more vivid when you're drafting well.<br><br>
      <strong>Audio:</strong> Wind noise shifts from open to tunneled. A rising tonal hum builds (like a bass note climbing). The longer you hold, the higher the pitch — experienced players use this as an audio cue for when to release. The taxi engine smooths out to a lower RPM (drafting = less air resistance).<br><br>
      <strong>Haptic:</strong> Gentle sustained vibration that intensifies. Sharp double-pulse on slingshot release.
    </div>

    <h3>Slingshot Release</h3>
    <p>When the draft meter fills (or the player swipes out of the zone), the taxi slingshots forward with a speed burst. This is the dopamine hit — a brief surge of speed, a punchy "whoosh" sound, neon streak particles trailing the car, and the chain counter popping upward.</p>

    <h3>Chain Milestones</h3>
    <table class="state-table">
      <tr><th>Chain</th><th>Celebration</th><th>Audio</th></tr>
      <tr><td><span class="tag blue">×5</span></td><td>Quick neon flash on HUD. "NICE" text fades in/out.</td><td>Clean ding</td></tr>
      <tr><td><span class="tag pink">×10</span></td><td>Full screen neon flash. "PERFECT" text. Score explosion particle burst. This is THE clip moment.</td><td>Full synthwave chord</td></tr>
      <tr><td><span class="tag purple">×15</span></td><td>Neon trails persist on taxi for 3 seconds. City lights intensify.</td><td>Cascading arpeggio</td></tr>
      <tr><td><span class="tag orange">×20</span></td><td>Screen edges pulse with neon glow. Everything feels electric.</td><td>Euphoric synth swell</td></tr>
    </table>
  </section>

  <div class="divider"></div>

  <!-- ══════════ TRAFFIC ══════════ -->
  <section>
    <h2>Traffic System</h2>

    <h3>Density Phases</h3>
    <table class="state-table">
      <tr><th>Phase</th><th>Time</th><th>Behavior</th></tr>
      <tr>
        <td><span class="tag blue">Warm-up</span></td>
        <td>0 – 20s</td>
        <td>Sparse. Single vehicles in center lane only. Wide gaps. Teaches drafting without text — the first car you encounter IS the tutorial.</td>
      </tr>
      <tr>
        <td><span class="tag purple">Flow</span></td>
        <td>20 – 60s</td>
        <td>Moderate. All 3 lanes active. Comfortable gaps but you need to lane-switch between drafts. Clusters of 2–3 vehicles appear — chain opportunities.</td>
      </tr>
      <tr>
        <td><span class="tag pink">Rush</span></td>
        <td>60 – 120s</td>
        <td>Dense. Tight clusters, narrow gaps. Some vehicles change lanes (telegraphed with blinker 1.5s ahead). Chain opportunities are rich but risky.</td>
      </tr>
      <tr>
        <td><span class="tag orange">Frenzy</span></td>
        <td>120s+</td>
        <td>Maximum. Near-constant traffic. Speed variance (slow trucks, fast cars). The challenge shifts from finding targets to choosing the right ones.</td>
      </tr>
    </table>

    <h3>Vehicle Types</h3>
    <p>The player drives a compact Japanese taxi (warm orange/cream body, roof light, distinctive silhouette). Traffic consists of two vehicle types for MVP:</p>
    <div class="callout blue">
      <strong>Type A — Compact car:</strong> Sedans, kei cars, other taxis. Small, fast. Smaller draft zone, moves quicker. Good for skilled chain extensions.<br><br>
      <strong>Type B — Delivery truck:</strong> Box trucks, vans. Large, slow. Bigger draft zone, easier to draft behind but takes up more road space. Natural "beginner-friendly" target.<br><br>
      <strong>Player taxi:</strong> A classic Japanese taxi — cream/orange body, glowing roof sign that reads "空車" (vacant). The roof light changes color during chain milestones. At ×10, it pulses neon pink. This is a small detail that adds character and makes screenshots more interesting.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ ART DIRECTION ══════════ -->
  <section>
    <h2>Art Direction — Tokyo Night</h2>

    <h3>Setting</h3>
    <p>A rain-slicked Tokyo expressway at night. Neon signs line the roadside — kanji, katakana, glowing advertisements in pink, blue, and purple. The road is dark asphalt with bright lane markings that reflect neon. Skyscrapers rise in the distance, their windows glowing warm. The sky is a deep indigo with the faintest hint of city light pollution on the horizon.</p>

    <h3>3D Art Style — Vehicle Masters Meets Neon</h3>
    <div class="callout">
      <strong>Polygon budget:</strong> Low-poly but polished. Clean geometric shapes with flat or minimal shading. Vehicles should be readable as silhouettes at speed — distinctive shapes, not blurry detail. Think Vehicle Masters' clean geometry but with neon-lit Tokyo materials.<br><br>
      <strong>Materials:</strong> Mostly unlit/emissive for neon elements. Subtle environment mapping on wet road surface for reflections. Vehicles use flat color with one accent emissive (tail lights, headlights). The player's taxi has a warm cream/orange body with a glowing roof sign — the brightest element on the player vehicle so it's always easy to track from the elevated camera.<br><br>
      <strong>Lighting:</strong> Minimal real-time lights for performance. Neon glow achieved through emissive materials and post-processing bloom (subtle, not overwhelming). The primary "lighting" is baked into the environment art — bright neon signs, glowing windows, reflective road.<br><br>
      <strong>Rain:</strong> Light particle rain falling toward camera (few particles, mostly for atmosphere). The key visual effect is the wet road surface reflecting neon — this single detail sells the entire mood and can be achieved with a simple reflective plane or environment map.
    </div>

    <h3>Color Palette</h3>
    <table class="state-table">
      <tr><th>Element</th><th>Color</th><th>Hex</th></tr>
      <tr><td>Primary neon</td><td>Hot pink — signs, UI accents, draft glow</td><td>#FF2D7B</td></tr>
      <tr><td>Secondary neon</td><td>Cyan blue — speed lines, lane markings, HUD</td><td>#00E5FF</td></tr>
      <tr><td>Accent neon</td><td>Purple — slingshot burst, chain milestones</td><td>#B44DFF</td></tr>
      <tr><td>Warm accent</td><td>Orange — tail lights, warning elements</td><td>#FF6B2D</td></tr>
      <tr><td>Road surface</td><td>Deep blue-black asphalt</td><td>#1A1428</td></tr>
      <tr><td>Sky</td><td>Deep indigo</td><td>#08050E</td></tr>
      <tr><td>UI text</td><td>Cool white with slight purple tint</td><td>#F0E8FF</td></tr>
    </table>

    <h3>Audio Direction</h3>
    <div class="callout purple">
      <strong>Music:</strong> Lo-fi synthwave / city pop hybrid. Mellow beats with warm synth pads. Not aggressive EDM — this is a flow game. The music should feel like a late-night drive playlist. Layers build as chain grows: base track always plays, additional synth layers fade in at ×5, ×10, ×15.<br><br>
      <strong>Engine:</strong> Smooth taxi engine hum — a warm, slightly throaty four-cylinder. Not aggressive, not silent. Should sound satisfying at any speed. Pitch increases with speed but stays musical. The classic Toyota Crown Comfort taxi engine note is the vibe.<br><br>
      <strong>Environment:</strong> Distant city ambience. Rain tapping on helmet. Tire hiss on wet road. Wind rush during slingshot.<br><br>
      <strong>UI sounds:</strong> Clean, digital, slightly retro. Think arcade cabinet coin-insert vibes for chain milestones.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ SCREENS ══════════ -->
  <section>
    <h2>Screen States (MVP = 2 Screens)</h2>
    <table class="state-table">
      <tr><th>Screen</th><th>Elements</th><th>Notes</th></tr>
      <tr>
        <td><strong>Gameplay</strong></td>
        <td>3D road scene from elevated camera (~20ft above). Player taxi. Traffic vehicles. Neon city environment. HUD: score (top center), chain multiplier (below score), draft meter (near player vehicle, subtle arc).</td>
        <td>Minimal HUD. Score and chain are the only persistent elements. Draft meter only appears when near a vehicle. No pause button in v1.</td>
      </tr>
      <tr>
        <td><strong>Game Over</strong></td>
        <td>Final score. Best chain. Distance. "Best Run" comparison. Retry button (giant, center). Share button.</td>
        <td>Background: blurred 3D scene frozen at the crash moment. Neon-styled result card for sharing. Retry must be under 1 second.</td>
      </tr>
    </table>
  </section>

  <div class="divider"></div>

  <!-- ══════════ FEEL & JUICE ══════════ -->
  <section>
    <h2>Feel & Juice — Non-Negotiables</h2>

    <h3>Speed Feel in 3D</h3>
    <p>Speed from an elevated camera comes from different cues than a close behind-the-vehicle view. The key sources: road markings streaming beneath the taxi at high speed, roadside objects (neon signs, barriers, lamp posts) flying past below, the gap between the taxi and traffic vehicles closing rapidly, rain particles streaking downward toward the road, and a subtle FOV widening at high chain. The elevated angle also makes near-misses more visually dramatic — you can see exactly how close the taxi came to clipping another vehicle.</p>

    <h3>Visual Juice Checklist</h3>
    <div class="callout blue">
      <strong>Speed lines:</strong> 3D particle system — thin bright streaks emanating from screen edges during draft. Cyan-tinted. Opacity and count scale with chain.<br><br>
      <strong>Draft glow:</strong> Target vehicle's tail lights bloom brighter. Neon pink aura pulses around the vehicle's rear. Road beneath the draft zone reflects pink light.<br><br>
      <strong>Slingshot burst:</strong> Brief motion blur on swipe-out. Neon streak particles trail the taxi for 0.5s. Speed burst tween on scroll speed. Whoosh + chime audio.<br><br>
      <strong>Chain pop:</strong> Chain counter scales 1.3x → 1.0x over 200ms. Color flashes on increment (white → neon pink).<br><br>
      <strong>Milestone flash:</strong> At ×10 — screen edges pulse neon pink for 100ms. "PERFECT" text in Orbitron font, neon glow, fades over 1s.<br><br>
      <strong>Wet road reflections:</strong> A reflective ground plane that picks up neon colors from roadside signs. This single effect does more for atmosphere than any other visual element.<br><br>
      <strong>Body roll:</strong> Taxi tilts ~5° on lane switch (body roll, not steering). Visible from above as a slight lateral rock. Returns to level with a gentle spring. Wheels turn briefly. Subtle but essential for feel — without it the taxi looks like it's sliding on ice.<br><br>
      <strong>Post-processing:</strong> Subtle bloom on all emissive/neon elements. Optional chromatic aberration at extreme speed. Keep it tasteful — this is atmosphere, not a filter dump.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ 3D PERFORMANCE ══════════ -->
  <section>
    <h2>3D Performance Budget</h2>
    <p>This must run at 60fps on a mid-range phone in a mobile browser. Every 3D decision is a performance decision.</p>

    <div class="callout orange">
      <strong>Geometry:</strong> Low-poly everything. Player taxi: ~600-800 tris (needs to read well from above — distinct roof, roof light, body shape). Traffic cars: ~300-800 tris. Trucks: ~600-1000 tris. Buildings are flat-shaded boxes with emissive texture panels for neon signs. Total scene: under 50K triangles at any time.<br><br>
      <strong>Draw calls:</strong> Target under 50. Use instanced meshes for repeated objects (road segments, barriers, lamp posts). Batch vehicles by type. Use a texture atlas for neon signs.<br><br>
      <strong>Textures:</strong> Small. Neon signs can be a single atlas (512×512). Road surface: one tiling texture (256×256). Vehicles: flat color or minimal texture.<br><br>
      <strong>Lighting:</strong> No real-time dynamic lights. All glow is emissive materials + bloom post-processing. One ambient light + one directional light for minimal shading. The "wet road reflection" is a mirror plane or screen-space trick, not ray tracing.<br><br>
      <strong>Particles:</strong> Speed lines: max 30 active. Rain: max 100 active. Slingshot burst: max 20, short-lived. Use sprite-based particles, not mesh particles.<br><br>
      <strong>LOD:</strong> Buildings beyond 50 units become flat billboards. Vehicles beyond 100 units are removed. The fog/darkness of night naturally hides pop-in.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ TEMPLATE ARCHITECTURE ══════════ -->
  <section>
    <h2>Template Architecture — Reskinning</h2>
    <p>Same three-layer separation as before, now adapted for 3D:</p>

    <div class="template-layers">
      <div class="layer-card">
        <div class="layer-label">Engine Layer (Never Changes)</div>
        <ul>
          <li>Lane-switching input (3-lane swipe)</li>
          <li>Slipstream zone detection</li>
          <li>Chain multiplier logic</li>
          <li>Traffic spawning + density scaling</li>
          <li>Collision detection</li>
          <li>Score calculation</li>
          <li>Game state machine</li>
          <li>Camera system (follow, FOV, shake)</li>
          <li>Road segment recycling system</li>
        </ul>
      </div>
      <div class="layer-card">
        <div class="layer-label">Skin Layer (Swap for Reskin)</div>
        <ul>
          <li>3D models (player, vehicles, road props)</li>
          <li>Textures and materials</li>
          <li>Skybox / background</li>
          <li>Color palette (neon colors, road color)</li>
          <li>Post-processing settings (bloom intensity, tint)</li>
          <li>Audio (engine, music, SFX)</li>
          <li>UI fonts and styling</li>
          <li>Particle textures (speed lines, burst)</li>
        </ul>
      </div>
      <div class="layer-card">
        <div class="layer-label">Config Layer (Tune Per Skin)</div>
        <ul>
          <li>Camera position, FOV range</li>
          <li>Base/max scroll speed</li>
          <li>Traffic density curve</li>
          <li>Slipstream zone dimensions</li>
          <li>Draft meter fill rate</li>
          <li>Chain milestones</li>
          <li>Lane count and width</li>
          <li>Road segment length</li>
          <li>Fog distance</li>
        </ul>
      </div>
      <div class="layer-card">
        <div class="layer-label">Reskin Examples</div>
        <ul>
          <li><strong>Cyberpunk Highway:</strong> Neon purple, flying cars, hovercycles</li>
          <li><strong>Retro Miami:</strong> Outrun aesthetic, sunset, palm trees</li>
          <li><strong>Snowy Alps:</strong> Ski-doo drafting snowplows on mountain roads</li>
          <li><strong>Underwater:</strong> Submersible drafting behind whales on a seabed highway</li>
          <li><strong>Space Freeway:</strong> Spacecraft drafting cargo haulers through an asteroid belt</li>
        </ul>
      </div>
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ TECH STACK ══════════ -->
  <section>
    <h2>Tech Stack</h2>
    <div class="callout blue">
      <strong>Renderer:</strong> Three.js (r160+). Lightweight enough for mobile browsers, powerful enough for the neon aesthetic with bloom post-processing.<br><br>
      <strong>Language:</strong> TypeScript.<br><br>
      <strong>Bundler:</strong> Vite. Fast HMR for iteration.<br><br>
      <strong>3D models:</strong> GLTF/GLB format. Created in Blender, exported low-poly. Or use Three.js primitives (boxes, cylinders) for prototype phase.<br><br>
      <strong>Post-processing:</strong> Three.js EffectComposer with UnrealBloomPass for neon glow. Keep bloom subtle.<br><br>
      <strong>Physics:</strong> No physics library needed. Lane positions are fixed. Collision is simple AABB overlap check. The taxi doesn't have real physics — it's on rails with cosmetic body roll.<br><br>
      <strong>Audio:</strong> Howler.js or Web Audio API. Positional audio not needed — all sounds are UI/environmental.
    </div>
  </section>

  <div class="divider"></div>

  <!-- ══════════ SESSION FLOW ══════════ -->
  <section>
    <h2>Session Flow — 3 Minutes in Tokyo</h2>
    <table class="state-table">
      <tr><th>Time</th><th>What's Happening</th><th>Player Feeling</th></tr>
      <tr><td>0:00</td><td>Tap to start. Taxi is already moving. Rain falls. Neon signs glow. First vehicle ahead in center lane.</td><td>Instant immersion. The city is alive.</td></tr>
      <tr><td>0:05</td><td>Swipe behind first vehicle. Speed lines appear. "Oh, that's what this is."</td><td>Discovery. The draft feels physical.</td></tr>
      <tr><td>0:10</td><td>Slingshot past. Speed burst. Chain ×1. Neon streak trails the taxi.</td><td>First dopamine hit.</td></tr>
      <tr><td>0:25</td><td>Traffic thickens. Chain ×3. Weaving between taxis and trucks.</td><td>Flow state beginning.</td></tr>
      <tr><td>0:50</td><td>Chain hits ×5. "NICE" flashes. Extra synth layer fades into the music.</td><td>Competence. "I'm getting good at this."</td></tr>
      <tr><td>1:20</td><td>Rush phase. Dense clusters. Threading between vehicles. Chain ×8.</td><td>Full focus. The neon is hypnotic.</td></tr>
      <tr><td>1:50</td><td>×10. PERFECT. Screen pulses pink. Score explodes. Music peaks.</td><td>Euphoria. This is the clip moment.</td></tr>
      <tr><td>2:30</td><td>Frenzy. Traffic everywhere. Pushing for ×15. Clip a taxi — crash.</td><td>Heartbreak → instant "Retry" tap.</td></tr>
      <tr><td>2:32</td><td>New run. Already moving. Rain falling. Neon glowing.</td><td>"I can do better."</td></tr>
    </table>
  </section>

  <div class="divider"></div>

  <!-- ══════════ SCOPE CUTS ══════════ -->
  <section>
    <h2>Scope Cuts</h2>
    <table class="state-table">
      <tr><th>Feature</th><th>Why Cut</th><th>Revisit?</th></tr>
      <tr><td>Jumps / ramps</td><td>Breaks draft chain flow. Horizontal precision, not vertical action.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Speed boosts / power-ups</td><td>The slipstream IS the boost.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Vehicle upgrades</td><td>Skill-only. Upgrades create pay-to-win pressure.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Multiple vehicles</td><td>One taxi. No selection screen. Reduces time-to-play to zero.</td><td><span class="tag purple">V2 — cosmetic</span></td></tr>
      <tr><td>Oncoming traffic</td><td>Can't slipstream head-on vehicles. Breaks the core loop.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Real-time shadows</td><td>Performance cost not justified on mobile. Night setting + emissive lighting means shadows aren't missed.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Road curves/turns</td><td>Straight road only for MVP. Curves add camera complexity and disorientation in portrait mode.</td><td><span class="tag purple">V2</span></td></tr>
      <tr><td>Weather variety</td><td>Rain-at-night only. The wet reflections ARE the art style. Other weather dilutes identity.</td><td><span class="tag pink">No</span></td></tr>
      <tr><td>Coins / currency</td><td>Score is the only number. Clean template.</td><td><span class="tag purple">V2 if needed</span></td></tr>
      <tr><td>Tutorial screen</td><td>Warm-up phase IS the tutorial.</td><td><span class="tag pink">No</span></td></tr>
    </table>
  </section>

  <div class="divider"></div>

  <!-- ══════════ DEV ORDER ══════════ -->
  <section>
    <h2>Development Order</h2>
    <div class="callout">
      <strong>Phase 1 — Gray box:</strong> Three.js scene with a gray plane road, box taxi, box traffic vehicles. Elevated camera (~20ft above, ~45° down). Lane-switching on swipe. Traffic scrolling. Collision = game over. Get this running at 60fps in portrait on a phone.<br><br>
      <strong>Phase 2 — Core mechanic:</strong> Slipstream zone detection. Draft meter. Slingshot release. Chain counter. Score. This must feel satisfying with gray boxes before moving on.<br><br>
      <strong>Phase 3 — Tokyo night skin:</strong> Replace boxes with low-poly models (taxi, cars, trucks). Add neon materials, wet road, rain particles, bloom post-processing. Skybox. Taxi roof light. This is where the game transforms from "prototype" to "wow."<br><br>
      <strong>Phase 4 — Juice:</strong> Speed lines, draft glow, slingshot particles, chain pop tweens, milestone celebrations, FOV shifts, taxi body roll animation, audio layers.<br><br>
      <strong>Phase 5 — Polish:</strong> Game over screen, share card, high score persistence, performance optimization pass, mobile touch tuning.
    </div>
  </section>

</div>
</body>
</html>
