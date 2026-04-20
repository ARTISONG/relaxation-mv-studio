// ─── 1. DUST PARTICLES — 5 frequency layers, back-to-front depth ───
import { simplex } from "../utils/simplex.js";
import { hsl } from "../utils/audio.js";

// Layer configs: each responds to a different frequency band
// Rendered back→front so higher layers appear "closer"
const LAYER_DEFS = [
  // 0 Sub-bass — massive slow nebula clouds, far background
  { band:"subBass",   count:40,  sizeMin:10,  sizeMax:26,  hueBase:20,  hueSpread:10, satBase:60, litBase:38,
    alphaBase:0.16, speedMul:0.22, glowMul:10,  orbitK:0.03, vacuumK:0.0006, depth:0.0 },
  // 1 Bass — core golden breath, main expand/vacuum physics
  { band:"bass",      count:170, sizeMin:1.2, sizeMax:4.8, hueBase:32,  hueSpread:18, satBase:42, litBase:66,
    alphaBase:0.95, speedMul:1.0,  glowMul:4.5, orbitK:0.12, vacuumK:0.0018, depth:0.35 },
  // 2 Low-mid — amber swirlers, stronger orbital spin
  { band:"lowMid",    count:110, sizeMin:0.7, sizeMax:2.6, hueBase:18,  hueSpread:14, satBase:52, litBase:72,
    alphaBase:0.84, speedMul:1.3,  glowMul:3.0, orbitK:0.28, vacuumK:0.0014, depth:0.55 },
  // 3 Presence — silver-gold sparks, quick directional streaks
  { band:"presence",  count:90,  sizeMin:0.5, sizeMax:1.8, hueBase:44,  hueSpread:22, satBase:20, litBase:89,
    alphaBase:0.78, speedMul:1.7,  glowMul:2.5, orbitK:0.35, vacuumK:0.0010, depth:0.72 },
  // 4 Brilliance — near-white micro-dust, fastest flicker, closest layer
  { band:"brilliance",count:150, sizeMin:0.3, sizeMax:1.3, hueBase:50,  hueSpread:18, satBase:10, litBase:95,
    alphaBase:0.50, speedMul:2.2,  glowMul:1.8, orbitK:0.06, vacuumK:0.0008, depth:1.0 },
];

let _layers      = null;  // [{ def, motes[] }]
let _smoothBands = {};    // per-band smoothed values
let _smoothBass  = 0;
let _beatImpulse = 0;

function initLayers(w, h) {
  const cx = w / 2, cy = h / 2;
  _smoothBands = { subBass:0, bass:0, lowMid:0, presence:0, brilliance:0 };

  _layers = LAYER_DEFS.map((def, li) => {
    const motes = Array.from({ length: def.count }, (_, i) => {
      const angle  = Math.random() * Math.PI * 2;
      // Sub-bass particles spread wider; brilliance stays tighter
      const spread = 0.08 + (0.62 - li * 0.06) * Math.random();
      const radius = spread * Math.min(w, h) * 0.48;
      return {
        x:         cx + Math.cos(angle) * radius,
        y:         cy + Math.sin(angle) * radius,
        vx:        0, vy: 0,
        size:      def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin),
        hue:       def.hueBase + Math.random() * def.hueSpread,
        brightness:0.3 + Math.random() * 0.7,
        phase:     Math.random() * Math.PI * 2,
        noiseOff:  (li * 1000 + i) * 3.71,
        depth:     def.depth + (Math.random() - 0.5) * 0.15,
        // Brilliance layer: individual fade timer
        life:      Math.random(),
      };
    });
    return { def, motes };
  });
}

export function resetDust() {
  _layers      = null;
  _smoothBands = {};
  _smoothBass  = 0;
  _beatImpulse = 0;
}

// ─── Light shafts (driven by sub-bass + bass) ───────────────────────────────
function drawShafts(ctx, w, h, bass, subBass, time) {
  for (let s = 0; s < 4; s++) {
    const sx = w * (0.18 + s * 0.22) + Math.sin(time * 0.07 + s * 1.3) * w * 0.04;
    const al = 0.004 + subBass * 0.006 + bass * 0.005;
    const g  = ctx.createLinearGradient(sx - w * 0.08, 0, sx + w * 0.08, h);
    g.addColorStop(0,   hsl(30 + s * 4, 40, 50, al * 2.2));
    g.addColorStop(0.5, hsl(28 + s * 4, 30, 38, al));
    g.addColorStop(1,   "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.025, 0);
    ctx.lineTo(sx + w * 0.025, 0);
    ctx.lineTo(sx + w * 0.14,  h);
    ctx.lineTo(sx - w * 0.14,  h);
    ctx.closePath();
    ctx.fill();
  }
}

// ─── Ambient depth fog between layers ────────────────────────────────────────
function drawDepthFog(ctx, w, h, overall, time) {
  const al = 0.012 + overall * 0.018;
  const g  = ctx.createRadialGradient(w/2, h*0.55, h*0.05, w/2, h*0.55, h*0.55);
  g.addColorStop(0,   hsl(30, 35, 20, al * 1.8));
  g.addColorStop(0.6, hsl(28, 25, 12, al));
  g.addColorStop(1,   "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

export function renderLuminousDrift(ctx, w, h, t, bands) {
  if (!_layers) initLayers(w, h);

  const time    = t * 0.001;
  const bass    = bands.bass       || 0;
  const subBass = bands.subBass    || 0;
  const lowMid  = bands.lowMid     || 0;
  const mid     = bands.mid        || 0;
  const pres    = bands.presence   || 0;
  const brill   = bands.brilliance || 0;
  const overall = bands.overall    || 0;

  const bandVals = { subBass, bass, lowMid, presence: pres, brilliance: brill };

  // Per-band smooth baselines (different lag per layer — deep bands are slower)
  const lags = { subBass:0.025, bass:0.055, lowMid:0.07, presence:0.09, brilliance:0.11 };
  for (const k in _smoothBands) {
    _smoothBands[k] += ((bandVals[k] || 0) - _smoothBands[k]) * lags[k];
  }

  // Bass beat impulse (shared — bass beat affects all layers, just differently)
  _smoothBass += (bass - _smoothBass) * 0.055;
  const spike   = Math.max(0, bass - _smoothBass - 0.04);
  _beatImpulse += spike * 6;
  _beatImpulse *= 0.82;

  const quietness = Math.max(0, 1 - _smoothBands.bass * 5);
  const cx = w / 2, cy = h / 2;
  const minDim = Math.min(w, h);

  drawShafts(ctx, w, h, bass, subBass, time);
  drawDepthFog(ctx, w, h, overall, time);

  // Render each layer back-to-front
  _layers.forEach(({ def, motes }, li) => {
    const bandVal  = bandVals[def.band] || 0;
    const smoothBV = _smoothBands[def.band] || 0;
    // Layer-specific beat impulse: sub-bass layer breathes with subBass, not bass spike
    const layerImpulse = li === 0
      ? subBass * 0.5 + _beatImpulse * 0.2
      : _beatImpulse * (1 - li * 0.12);

    motes.forEach((d, di) => {
      const rx   = d.x - cx, ry = d.y - cy;
      const dist = Math.sqrt(rx * rx + ry * ry) + 0.001;
      const ux   = rx / dist, uy = ry / dist;
      const tx   = -uy,       ty = ux;

      // Brownian noise — amplitude varies by layer (deep = slower drift)
      const ns  = (0.018 + li * 0.012) + d.depth * 0.02;
      const nx  = simplex.noise3D(d.noiseOff,    time * ns, 0) * (0.28 + li * 0.06);
      const ny  = simplex.noise3D(0, d.noiseOff, time * ns)    * (0.28 + li * 0.06);

      // Outward push (beat-driven, scaled by layer)
      const outForce = layerImpulse * def.speedMul * (0.55 + d.depth * 0.9)
                     * (0.4 + dist / (minDim * 0.4));

      // Inward vacuum
      const vK      = def.vacuumK * (1 + quietness * 3) * (0.6 + d.depth * 0.5);
      const inForce = -dist * vK;

      // Orbital wobble — low-mid and presence layers spin harder
      const orb = simplex.noise2D(d.noiseOff * 0.28, time * (0.07 + li * 0.03))
                * (def.orbitK + bandVal * def.orbitK * 1.5);

      // Sub-bass layer: slow radial breathing, no outward kick
      const radial = li === 0
        ? (Math.sin(time * 0.4 + d.phase) * subBass * 0.8 + inForce * 0.5)
        : (outForce + inForce);

      d.vx += (ux * radial + tx * orb + nx) * 0.028 * def.speedMul;
      d.vy += (uy * radial + ty * orb + ny) * 0.028 * def.speedMul;

      const damp = 0.984 - quietness * 0.004 - li * 0.001;
      d.vx *= damp;
      d.vy *= damp;

      d.x += d.vx * (0.45 + d.depth * 0.55);
      d.y += d.vy * (0.45 + d.depth * 0.55);

      // Boundary — sub-bass clouds can roam wider
      const maxR = minDim * (li === 0 ? 0.72 : 0.62 - li * 0.02);
      if (dist > maxR) {
        d.vx *= 0.6; d.vy *= 0.6;
        d.x = cx + ux * maxR * 0.9;
        d.y = cy + uy * maxR * 0.9;
      }

      // ── Rendering ────────────────────────────────────────────────────
      const speedSq  = d.vx * d.vx + d.vy * d.vy;

      // Flicker: brilliance layer flickers fastest
      const flickRate = 1.3 + li * 0.9;
      const flickRate2 = 3.8 + li * 1.4;
      const flicker  = 0.5
        + Math.sin(time * flickRate  + d.phase) * 0.22
        + Math.sin(time * flickRate2 + di * 2.4) * 0.12;

      const expandGlow = Math.min(1, speedSq * 30 * layerImpulse * 0.6);
      const audioGlow  = bandVal * 0.3 + brill * 0.15 + expandGlow;

      const size = d.size * (0.55 + d.depth * 0.85)
                 * (1 + bandVal * 0.45)
                 * (0.72 + flicker * 0.42);
      const alpha = d.brightness * def.alphaBase
                  * (0.06 + audioGlow + flicker * 0.10)
                  * (0.38 + d.depth * 0.62);

      if (size < 0.25 || alpha < 0.008) return;

      // Hue: each layer has own color shift driven by its band
      const hue   = d.hue
                  + mid * 8
                  + layerImpulse * 10
                  - quietness * 6
                  + simplex.noise2D(di * 0.5 + li * 77, time * 0.13) * 6;
      const sat   = def.satBase  + pres * 18  + layerImpulse * 15;
      const light = def.litBase  + brill * 14 + d.depth * 12 + expandGlow * 20;

      // Glow only for non-tiny particles; sub-bass always glows
      const drawGlow = li === 0 || size > 1.8;
      if (drawGlow) {
        const glowR = size * (def.glowMul + layerImpulse * 2);
        const gg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR);
        gg.addColorStop(0,   hsl(hue, sat,      light,      alpha * 0.75));
        gg.addColorStop(0.35,hsl(hue, sat - 14, light - 14, alpha * 0.20));
        gg.addColorStop(1,   "rgba(0,0,0,0)");
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = hsl(hue, sat + 12, light + 18, alpha * 1.3);
        ctx.beginPath(); ctx.arc(d.x, d.y, size * 0.5, 0, Math.PI * 2); ctx.fill();
      } else {
        ctx.fillStyle = hsl(hue, sat, light, alpha);
        ctx.beginPath(); ctx.arc(d.x, d.y, size, 0, Math.PI * 2); ctx.fill();
      }
    });
  });
}
