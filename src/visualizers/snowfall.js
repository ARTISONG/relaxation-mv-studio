// ─── SNOWFALL ABYSS — 5 frequency layers, beat-reactive, physically modelled ───
// Physics: Stokes drag terminal velocity · turbulent wind field (simplex curl) · parallax depth
// Math: 6-fold hexagonal symmetry · Koch-branch geometry · quadratic Bezier snow accumulation
import { simplex } from "../utils/simplex.js";
import { hsl } from "../utils/audio.js";

// ── Layer definitions — rendered back→front ────────────────────────────────
const LAYER_DEFS = [
  // 0 Sub-bass: massive ice crystals in distant darkness — giant bokeh halo
  { band:"subBass",    count:44,  sizeMin:14, sizeMax:30, shape:"crystal",
    baseVy:0.16, windScale:0.18, hueBase:222, satBase:60, alphaBase:0.72, depth:0.04 },
  // 1 Bass: asterisk snowflakes — pulse outward on every beat
  { band:"bass",       count:144, sizeMin:5,  sizeMax:13, shape:"asterisk",
    baseVy:0.44, windScale:0.40, hueBase:212, satBase:34, alphaBase:0.65, depth:0.28 },
  // 2 Low-mid: medium star-glows — swirl with mid-range harmonics
  { band:"lowMid",     count:250, sizeMin:1.8,sizeMax:5.5,shape:"star",
    baseVy:0.82, windScale:0.63, hueBase:204, satBase:18, alphaBase:0.72, depth:0.52 },
  // 3 Presence: bright specks — snap to high-frequency transients
  { band:"presence",   count:330, sizeMin:0.8,sizeMax:2.5,shape:"glow",
    baseVy:1.50, windScale:0.82, hueBase:196, satBase:9,  alphaBase:0.68, depth:0.74 },
  // 4 Brilliance: micro sparkle dust — closest, fastest, purest white
  { band:"brilliance", count:430, sizeMin:0.3,sizeMax:1.0,shape:"micro",
    baseVy:2.40, windScale:1.00, hueBase:188, satBase:3,  alphaBase:0.58, depth:0.96 },
];

let _layers     = null;
let _smoothBands = {};
let _smoothBass  = 0;
let _beatImpulse = 0;

// ── Particle factory ───────────────────────────────────────────────────────
// Terminal velocity (Stokes law approximation): vt ∝ r²  →  vt ∝ size²/sizeMax²
function makeFlake(def, w, h, atTop = false) {
  const size    = def.sizeMin + Math.random() * (def.sizeMax - def.sizeMin);
  const normSz  = size / def.sizeMax;
  const termVy  = def.baseVy * (0.35 + normSz * normSz * 1.1); // Stokes: r² dependence
  const dormant = !atTop && Math.random() < 0.38;               // 38% start dormant
  return {
    x:        Math.random() * w,
    y:        dormant ? -99999 : (atTop ? -size * (1 + Math.random() * 5) : Math.random() * h),
    vx:       0,
    vy:       dormant ? 0 : termVy * Math.random(),
    size,
    termVy,
    rotation:  Math.random() * Math.PI * 2,
    rotSp:    (Math.random() - 0.5) * 0.0015,
    hue:       def.hueBase + (Math.random() - 0.5) * 18,
    brightness:0.45 + Math.random() * 0.55,
    noiseOff:  Math.random() * 2000,
    life:      dormant ? 0 : (atTop ? 0 : Math.random()),
    dormant,
  };
}

function wakeFlake(d, w) {
  d.dormant   = false;
  d.x         = Math.random() * w;
  d.y         = -d.size * (1.5 + Math.random() * 4);
  d.vx        = 0;
  d.vy        = d.termVy * 0.1;
  d.life      = 0;
  d.rotation  = Math.random() * Math.PI * 2;
}

// ── Shape renderers ─────────────────────────────────────────────────────────

// Full 6-fold ice crystal (Koch-inspired branches, 3 levels)
function drawCrystal(ctx, d, alpha, sat) {
  if (alpha < 0.008 || d.size < 3) return;
  const r = d.size;

  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rotation);
  ctx.globalAlpha = alpha;

  // Atmospheric bokeh halo — simulates depth-of-field blur for far layer
  const haloR = r * 3.5;
  const hg = ctx.createRadialGradient(0, 0, r * 0.2, 0, 0, haloR);
  hg.addColorStop(0,   `hsla(${d.hue},${sat}%,90%,0.22)`);
  hg.addColorStop(0.45,`hsla(${d.hue},${sat}%,80%,0.07)`);
  hg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = hg;
  ctx.beginPath(); ctx.arc(0, 0, haloR, 0, Math.PI * 2); ctx.fill();

  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Six arms with three levels of side branches (hexagonal Koch geometry)
  const SIN60 = 0.8660, COS60 = 0.5;
  for (let arm = 0; arm < 6; arm++) {
    ctx.save();
    ctx.rotate(arm * Math.PI / 3);

    // Main arm
    ctx.lineWidth   = Math.max(0.7, r * 0.058);
    ctx.strokeStyle = `hsla(${d.hue},${sat}%,95%,0.92)`;
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke();

    // Level-1 branches at 38%, 62%, 82% — longest
    const L1 = [
      { pos:0.38, len:r * 0.30, lw:r * 0.044 },
      { pos:0.62, len:r * 0.22, lw:r * 0.036 },
      { pos:0.82, len:r * 0.13, lw:r * 0.026 },
    ];
    L1.forEach(({ pos, len, lw }) => {
      const y0 = -r * pos;
      ctx.lineWidth = Math.max(0.5, lw);
      // Left branch  (−60° from arm)
      ctx.beginPath(); ctx.moveTo(0, y0);
      ctx.lineTo(-len * SIN60, y0 - len * COS60); ctx.stroke();
      // Right branch (+60° from arm)
      ctx.beginPath(); ctx.moveTo(0, y0);
      ctx.lineTo( len * SIN60, y0 - len * COS60); ctx.stroke();

      // Level-2 sub-branches on the first-level branches (only on pos 0.38 & 0.62)
      if (pos <= 0.62) {
        const sl = len * 0.38, sw = Math.max(0.4, lw * 0.6);
        ctx.lineWidth = sw;
        const midX1 = -len * SIN60 * 0.5, midY1 = y0 - len * COS60 * 0.5;
        const midX2 =  len * SIN60 * 0.5, midY2 = midY1;
        // sub-branch off left branch
        ctx.beginPath(); ctx.moveTo(midX1, midY1);
        ctx.lineTo(midX1 - sl * COS60, midY1 - sl * SIN60); ctx.stroke();
        // sub-branch off right branch
        ctx.beginPath(); ctx.moveTo(midX2, midY2);
        ctx.lineTo(midX2 + sl * COS60, midY2 - sl * SIN60); ctx.stroke();
      }
    });
    ctx.restore();
  }

  // Hexagonal center cap
  ctx.lineWidth   = Math.max(0.5, r * 0.052);
  ctx.strokeStyle = `hsla(${d.hue},${sat}%,99%,0.95)`;
  const hr = r * 0.14;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3;
    i === 0 ? ctx.moveTo(hr * Math.cos(a), hr * Math.sin(a))
            : ctx.lineTo(hr * Math.cos(a), hr * Math.sin(a));
  }
  ctx.closePath(); ctx.stroke();
  ctx.restore();
}

// Simplified 6-arm asterisk for bass layer
function drawAsterisk(ctx, d, alpha, sat) {
  if (alpha < 0.008) return;
  const r = d.size;
  ctx.save();
  ctx.translate(d.x, d.y);
  ctx.rotate(d.rotation);
  ctx.globalAlpha = alpha;

  const glowR = r * 2.8;
  const gg = ctx.createRadialGradient(0, 0, 0, 0, 0, glowR);
  gg.addColorStop(0,   `hsla(${d.hue},${sat}%,94%,0.18)`);
  gg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, glowR, 0, Math.PI * 2); ctx.fill();

  ctx.lineCap  = 'round';
  ctx.lineWidth = Math.max(0.5, r * 0.080);
  ctx.strokeStyle = `hsla(${d.hue},${sat}%,93%,0.88)`;

  for (let i = 0; i < 6; i++) {
    ctx.save(); ctx.rotate(i * Math.PI / 3);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -r); ctx.stroke();
    const by = -r * 0.50, bl = r * 0.28;
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo(-bl * 0.866, by - bl * 0.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, by); ctx.lineTo( bl * 0.866, by - bl * 0.5); ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

// Glow star dot for low-mid layer
function drawStar(ctx, d, alpha, sat) {
  if (alpha < 0.008) return;
  const r = d.size, glowR = r * 4.0;
  const gg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR);
  gg.addColorStop(0,   hsl(d.hue, sat, 94, alpha * 0.55));
  gg.addColorStop(0.35,hsl(d.hue, sat, 86, alpha * 0.18));
  gg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hsl(d.hue, sat + 10, 97, alpha * 0.92);
  ctx.beginPath(); ctx.arc(d.x, d.y, r * 0.42, 0, Math.PI * 2); ctx.fill();
}

// Presence: small bright glow dot
function drawGlowDot(ctx, d, alpha, sat) {
  if (alpha < 0.008) return;
  const r = d.size, glowR = r * 4.5;
  const gg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR);
  gg.addColorStop(0,   hsl(d.hue, sat, 97, alpha * 0.50));
  gg.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(d.x, d.y, glowR, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = hsl(d.hue, sat, 99, alpha * 0.88);
  ctx.beginPath(); ctx.arc(d.x, d.y, r * 0.38, 0, Math.PI * 2); ctx.fill();
}

// Brilliance: raw point
function drawMicro(ctx, d, alpha, sat) {
  if (alpha < 0.005) return;
  ctx.fillStyle = hsl(d.hue, sat, 97, alpha * 0.74);
  ctx.beginPath(); ctx.arc(d.x, d.y, d.size, 0, Math.PI * 2); ctx.fill();
}

// ── Scene elements ───────────────────────────────────────────────────────────

function drawMoonShaft(ctx, w, h, overall, time) {
  const mx = w * 0.44 + Math.sin(time * 0.014) * w * 0.07;
  const al = 0.016 + overall * 0.014;
  const g  = ctx.createLinearGradient(mx, 0, mx, h * 0.72);
  g.addColorStop(0,    `rgba(195,218,255,${al * 3.0})`);
  g.addColorStop(0.30, `rgba(182,212,252,${al})`);
  g.addColorStop(1,    'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(mx - w * 0.010, 0); ctx.lineTo(mx + w * 0.010, 0);
  ctx.lineTo(mx + w * 0.280, h * 0.72); ctx.lineTo(mx - w * 0.280, h * 0.72);
  ctx.closePath(); ctx.fill();
}


function drawDepthFog(ctx, w, h, overall) {
  // Cold atmosphere: dark at top, very faint glow at centre
  const al = 0.05 + overall * 0.02;
  const g  = ctx.createLinearGradient(0, 0, 0, h * 0.45);
  g.addColorStop(0,   `rgba(4,8,22,${al})`);
  g.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
}

// ── Init & reset ─────────────────────────────────────────────────────────────
function initSnow(w, h) {
  _smoothBands = { subBass:0, bass:0, lowMid:0, presence:0, brilliance:0 };
  _layers = LAYER_DEFS.map(def => ({
    def,
    motes: Array.from({ length: def.count }, () => makeFlake(def, w, h, false)),
  }));
}

export function resetSnow() {
  _layers      = null;
  _smoothBands = {};
  _smoothBass  = 0;
  _beatImpulse = 0;
}

// ── Main render ──────────────────────────────────────────────────────────────
export function renderSnowfall(ctx, w, h, t, bands) {
  if (!_layers) initSnow(w, h);

  const time    = t * 0.001;
  const subBass = bands.subBass    || 0;
  const bass    = bands.bass       || 0;
  const lowMid  = bands.lowMid     || 0;
  const pres    = bands.presence   || 0;
  const brill   = bands.brilliance || 0;
  const overall = bands.overall    || 0;

  const bv = { subBass, bass, lowMid, presence:pres, brilliance:brill };
  const lags = { subBass:0.022, bass:0.05, lowMid:0.07, presence:0.09, brilliance:0.11 };
  for (const k in _smoothBands) _smoothBands[k] += ((bv[k]||0) - _smoothBands[k]) * lags[k];

  // Beat impulse from bass (sudden spike above smooth baseline)
  _smoothBass += (bass - _smoothBass) * 0.05;
  const spike  = Math.max(0, bass - _smoothBass - 0.032);
  _beatImpulse += spike * 7.5;
  _beatImpulse *= 0.83;

  // Global wind: slowly rotating simplex gust direction
  const gustX = simplex.noise2D(time * 0.16, 0) * (0.8 + _beatImpulse * 2.2);

  // Scene
  drawDepthFog(ctx, w, h, overall);
  drawMoonShaft(ctx, w, h, overall, time);

  // Layers back→front
  _layers.forEach(({ def, motes }, li) => {
    const bandVal  = bv[def.band]        || 0;
    const smoothBV = _smoothBands[def.band] || 0;

    // Volume-driven wakeup: each dormant flake has a per-frame probability
    const wakeProb = (0.003 + overall * 0.018) * (1 - li * 0.04);
    // Beat-driven wakeup: burst on spike
    const beatWake = _beatImpulse > 0.25 ? Math.round(_beatImpulse * def.count * 0.12) : 0;
    let burstLeft  = beatWake;

    motes.forEach(d => {
      // Dormant management
      if (d.dormant) {
        const shouldWake = (Math.random() < wakeProb) || (burstLeft > 0);
        if (shouldWake) { wakeFlake(d, w); if (burstLeft > 0) burstLeft--; }
        else return;
      }

      // ── Physics ────────────────────────────────────────────────────────
      // Stokes drag: asymptote toward terminal velocity
      const targetVy = d.termVy * (1 + bandVal * 0.42 + _beatImpulse * 0.10);
      d.vy += (targetVy - d.vy) * 0.038;

      // Turbulent wind field (two-octave simplex approximating curl noise)
      const ws     = 0.0012 - li * 0.00016;
      const wind1  = simplex.noise3D(d.x * ws,         d.y * ws,         time * 0.08) * 1.6;
      const wind2  = simplex.noise3D(d.x * ws * 2.7 + 50, d.y * ws * 2.7, time * 0.13) * 0.55;
      const totalW = (wind1 + wind2 + gustX) * def.windScale;
      d.vx += (totalW - d.vx * 0.07) * 0.10;

      // Sub-bass layer: slow horizontal breathing sway
      if (li === 0) d.vx += Math.sin(time * 0.38 + d.noiseOff * 0.001) * subBass * 0.9;

      d.x  += d.vx;
      d.y  += d.vy;
      d.rotation += d.rotSp * (1 + bandVal * 1.8);

      // Horizontal wrap (parallax layers wrap at different margins)
      const margin = d.size * (3 + li);
      if (d.x < -margin) d.x = w + margin;
      if (d.x >  w + margin) d.x = -margin;

      // Fade in from 0→1 over ~40 frames
      d.life = Math.min(1, d.life + 0.026);

      // Return to dormant when exits below ground
      if (d.y > h + d.size * 3) { d.dormant = true; d.y = -99999; d.life = 0; }

      // ── Visual ─────────────────────────────────────────────────────────
      // Flicker: each layer has different flicker frequency for sparkle variety
      const fr1 = 1.1 + li * 0.75, fr2 = fr1 * 2.6;
      const flicker = 0.74
        + Math.sin(time * fr1 + d.noiseOff * 0.008) * 0.16
        + Math.sin(time * fr2 + d.noiseOff)         * 0.10;

      const alpha = d.brightness * def.alphaBase * d.life * flicker
                  * (0.28 + bandVal * 0.42 + brill * 0.20 + overall * 0.10);

      const sat = def.satBase + pres * 14 + _beatImpulse * 10;

      switch (def.shape) {
        case "crystal":  drawCrystal (ctx, d, alpha, sat); break;
        case "asterisk": drawAsterisk(ctx, d, alpha, sat); break;
        case "star":     drawStar    (ctx, d, alpha, sat); break;
        case "glow":     drawGlowDot (ctx, d, alpha, sat); break;
        case "micro":    drawMicro   (ctx, d, alpha, sat); break;
      }
    });
  });

}
