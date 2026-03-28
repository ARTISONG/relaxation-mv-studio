import { useState, useRef, useEffect, useCallback } from "react";

/* ═══════════════════════════════════════════════════════════
   SIMPLEX NOISE
   ═══════════════════════════════════════════════════════════ */
class SimplexNoise {
  constructor(seed = Math.random()) {
    this.grad3 = [[1,1,0],[-1,1,0],[1,-1,0],[-1,-1,0],[1,0,1],[-1,0,1],[1,0,-1],[-1,0,-1],[0,1,1],[0,-1,1],[0,1,-1],[0,-1,-1]];
    this.p = [];
    for (let i = 0; i < 256; i++) this.p[i] = Math.floor(seed * 256 + i * 131.7) & 255;
    this.perm = new Array(512);
    for (let i = 0; i < 512; i++) this.perm[i] = this.p[i & 255];
  }
  noise2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1), G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;
    const dot = (g, a, b) => g[0] * a + g[1] * b;
    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * dot(this.grad3[this.perm[ii + this.perm[jj]] % 12], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * dot(this.grad3[this.perm[ii + i1 + this.perm[jj + j1]] % 12], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * dot(this.grad3[this.perm[ii + 1 + this.perm[jj + 1]] % 12], x2, y2); }
    return 70 * (n0 + n1 + n2);
  }
  noise3D(x, y, z) { return (this.noise2D(x, y) + this.noise2D(y, z) + this.noise2D(x, z)) / 3; }
}
const simplex = new SimplexNoise(42);

/* ═══════════════════════════════════════════════════════════
   AUDIO ANALYZER — 7-band
   ═══════════════════════════════════════════════════════════ */
const BANDS = { subBass:[20,60], bass:[60,250], lowMid:[250,500], mid:[500,2000], highMid:[2000,4000], presence:[4000,8000], brilliance:[8000,20000] };
function analyzeBands(analyser, sr) {
  if (!analyser) return { subBass:0,bass:0,lowMid:0,mid:0,highMid:0,presence:0,brilliance:0,overall:0,waveform:null };
  const n = analyser.frequencyBinCount, freq = new Uint8Array(n), wave = new Uint8Array(n);
  analyser.getByteFrequencyData(freq); analyser.getByteTimeDomainData(wave);
  const bHz = sr / (n * 2);
  const get = ([lo,hi]) => { const s = Math.max(0,Math.floor(lo/bHz)), e = Math.min(n-1,Math.ceil(hi/bHz)); let sum=0,c=0; for(let i=s;i<=e;i++){sum+=freq[i];c++} return c>0?(sum/c)/255:0; };
  const b = {}; let tot=0,cnt=0;
  for (const [k,r] of Object.entries(BANDS)) { b[k]=get(r); tot+=b[k]; cnt++; }
  b.overall=tot/cnt; b.waveform=wave; return b;
}

function hsl(h,s,l,a=1){ return `hsla(${((h%360)+360)%360},${Math.max(0,Math.min(100,s))}%,${Math.max(0,Math.min(100,l))}%,${a})`; }

/* ═══════════════════════════════════════════════════════════
   MOTION DEFINITIONS
   ═══════════════════════════════════════════════════════════ */
const MOTIONS = [
  { id:"ethereal_breath", name:"Dust Particles", nameTh:"ละอองฝุ่นเรืองแสง", icon:"◉",
    desc:"อนุภาคฝุ่นจำนวนมากลอยฟุ้งในอากาศ เคลื่อนไหวตามจังหวะเพลง — Bass ผลักกระจาย, Mid เปลี่ยนทิศ, Brilliance จุดประกายแสง — Brownian Motion ที่มีจิตวิญญาณ",
    research:"Polyvagal Theory — Porges · Stochastic Visual Relaxation", palette:[[25,18,8],[212,175,55],[245,230,163]], trail:false },
  { id:"liquid_aurora", name:"Harmonic Waves", nameTh:"คลื่นเสียงหลายมิติ", icon:"◇",
    desc:"คลื่นเสียงเส้นเดียวซ้อนกัน 12 ชั้นด้วย turbulence — แต่ละชั้นมีสี ขนาด ความโค้งต่างกันตาม frequency band — สร้างมิติของแสงเสียงที่ dynamic",
    research:"Cymatics & Sound Visualization — Hans Jenny", palette:[[15,40,45],[46,139,139],[110,207,207]], trail:false },
  { id:"sacred_geometry", name:"Hyper Polyhedra", nameTh:"ทรงเรขาหลายมิติ", icon:"✦",
    desc:"ทรง Icosahedron ซ้อนทรง Dodecahedron หมุน 3 แกนใน 3D ฉายลง 2D — จุดยอดเรืองแสง สันเส้นเปลี่ยนสีตาม frequency band พร้อม morphing vertices",
    research:"Fractal Fluency — Richard Taylor, 2006", palette:[[20,15,8],[201,169,110],[236,217,161]], trail:false },
  { id:"cosmic_flow", name:"Cosmic Flow Field", nameTh:"สนามพลังจักรวาล", icon:"⋆",
    desc:"อนุภาค 2,000 ตัวไหลตาม Noise Flow Field — Presence ควบคุมทิศ Bass สร้าง glow ทิ้ง trail สะสมเป็นลายเส้นจักรวาล",
    research:"Alpha Wave Entrainment — Neuroscience Letters", palette:[[5,5,15],[100,140,200],[200,220,255]], trail:true },
  { id:"deep_ocean", name:"Deep Ocean Pulse", nameTh:"ชีพจรมหาสมุทร", icon:"∿",
    desc:"คลื่น interference 8 ชั้น + bioluminescence + actual waveform — Sub-Bass สั่นสะเทือนมหาสมุทร",
    research:"Theta Oscillation — Sleep Medicine Reviews", palette:[[5,15,25],[20,80,120],[60,160,200]], trail:false },
  { id:"nebula_consciousness", name:"Plasma Duo", nameTh:"หยินหยางพลาสม่า", icon:"◎",
    desc:"ก้อน Plasma ขนาดใหญ่ 2 ก้อนโคจรรอบกันแบบหยินหยาง — เมื่อเข้าใกล้จะยืดตัวเข้าหาและเรืองแสง Bass ผลักให้แยก Mid เปลี่ยนสี — เหมือนน้ำมันกับน้ำเต้นรำด้วยกัน",
    research:"Awe & DMN Suppression — Keltner & Haidt, 2003", palette:[[10,5,20],[139,110,199],[200,170,255]], trail:false },
  { id:"rain_drops", name:"Rain Drops", nameTh:"หยาดฝนเรืองแสง", icon:"⊹",
    desc:"สายฝนตกลงมาหลายชั้นความลึก — Bass ทำให้ฝนตกหนัก Mid เปลี่ยนทิศลม Brilliance จุดประกายหยดน้ำ — เมื่อกระทบพื้นเกิด ripple วงน้ำกระจาย",
    research:"Pink Noise & Sleep Onset — Journal of Theoretical Biology", palette:[[8,12,20],[80,130,180],[150,200,240]], trail:false },
  { id:"audio_spectrum", name:"Ambient Spectrum", nameTh:"สเปกตรัมแสงเสียง", icon:"≋",
    desc:"Audio Spectrum แบบ organic — แท่งความถี่โค้งมนเรืองแสง มี reflection สะท้อนน้ำ + ambient glow ตาม energy — ไม่ใช่ equalizer ทั่วไป แต่เป็นงานศิลป์จากเสียง",
    research:"Synesthesia & Relaxation — Cytowic, 2002", palette:[[5,8,18],[60,120,180],[140,190,230]], trail:false },
  { id:"nakhwa_fire", name:"Nakhwa Fire Blossom", nameTh:"นัคฮวา ดอกไม้ไฟโบราณ", icon:"✿",
    desc:"จำลองเทศกาล Haman Nakhwa (함안 낙화놀이) — ประกายไฟทองร่วงหล่นจากสายลวดเหนือผืนน้ำ สะท้อนแสงบนผิวน้ำมืด — Bass จุดไฟ Mid เปลี่ยนลม Brilliance ส่องประกาย",
    research:"Joseon Dynasty Nakhwanori · Intangible Cultural Heritage", palette:[[10,5,2],[255,180,50],[255,220,120]], trail:false },
  { id:"ring_spectrum", name:"Ring Spectrum", nameTh:"ฉัพพรรณรังสี", icon:"◎",
    desc:"วงแหวน 6 ชั้นตามพุทธรังสี — นีล ปีต โลหิต โอทาต มัญเชฐ ประภัสสร — แผ่รัศมีเหมือน Sun Ray ขยาย-หดตาม beat ปรับมืด-สว่างตาม dB",
    research:"ฉัพพรรณรังสี · Gestalt Proximity · Circular Audio Viz", palette:[[5,5,20],[80,140,220],[160,200,255]], trail:false },
];

/* ═══════════════════════════════════════════════════════════
   PERSISTENT STATE FOR EACH MOTION
   ═══════════════════════════════════════════════════════════ */
const STATE = {
  dustMotes: null,
  polyhedra: null,
  flowParts: null,
  plasmaBlobs: null,
  rainDrops: null,
  ripples: [],
  nakhwaEmbers: null,
  nakhwaWireDrops: [],
  nakhwaWaterRipples: [],
  nakhwaSplashSparks: [],
  nakhwaSteam: [],
};

function resetState() {
  STATE.dustMotes = null;
  STATE.polyhedra = null;
  STATE.flowParts = null; STATE.plasmaBlobs = null;
  STATE.rainDrops = null; STATE.ripples = [];
  STATE.nakhwaEmbers = null; STATE.nakhwaWireDrops = []; STATE.nakhwaWaterRipples = [];
  STATE.nakhwaSplashSparks = []; STATE.nakhwaSteam = [];
  _waveTimeAcc = 0; _waveBassSmooth = 0; _waveMidSmooth = 0; _waveOverallSmooth = 0;
  _specSmooth = null;
  _ringSmooth = null; _ringBeatSmooth = 0; _ringDbSmooth = 0;
}

/* ─── INIT: Dust Particles ─── */
function initDust(w, h) {
  STATE.dustMotes = Array.from({ length: 500 }, (_, i) => ({
    x: Math.random() * w,
    y: Math.random() * h,
    vx: 0, vy: 0,
    size: 0.5 + Math.random() * 3,
    hue: 30 + Math.random() * 20,
    brightness: 0.2 + Math.random() * 0.8,
    phase: Math.random() * Math.PI * 2,
    noiseOff: i * 3.7,
    depth: Math.random(), // 0=far, 1=near — controls parallax & size
  }));
}

/* ─── INIT: 3D Polyhedra ─── */
function initPolyhedra() {
  // Icosahedron vertices
  const phi = (1 + Math.sqrt(5)) / 2;
  const icoVerts = [
    [-1, phi, 0],[1, phi, 0],[-1,-phi, 0],[1,-phi, 0],
    [0,-1, phi],[0, 1, phi],[0,-1,-phi],[0, 1,-phi],
    [phi, 0,-1],[phi, 0, 1],[-phi, 0,-1],[-phi, 0, 1],
  ].map(v => { const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); return v.map(c => c/l * 200); });
  const icoEdges = [
    [0,1],[0,5],[0,7],[0,10],[0,11],[1,5],[1,7],[1,8],[1,9],
    [2,3],[2,4],[2,6],[2,10],[2,11],[3,4],[3,6],[3,8],[3,9],
    [4,5],[4,9],[4,11],[5,9],[5,11],[6,7],[6,8],[6,10],
    [7,8],[7,10],[8,9],[10,11],
  ];
  // Dodecahedron vertices (dual)
  const a = 1/phi, b = phi;
  const dodVerts = [
    [1,1,1],[1,1,-1],[1,-1,1],[1,-1,-1],[-1,1,1],[-1,1,-1],[-1,-1,1],[-1,-1,-1],
    [0,a,b],[0,a,-b],[0,-a,b],[0,-a,-b],
    [a,b,0],[a,-b,0],[-a,b,0],[-a,-b,0],
    [b,0,a],[b,0,-a],[-b,0,a],[-b,0,-a],
  ].map(v => { const l = Math.sqrt(v[0]*v[0]+v[1]*v[1]+v[2]*v[2]); return v.map(c => c/l * 150); });
  const dodEdges = [
    [0,8],[0,12],[0,16],[8,4],[8,10],[4,14],[4,18],[10,2],[10,6],
    [2,13],[2,16],[6,15],[6,18],[12,1],[12,14],[14,5],[16,17],
    [1,9],[1,17],[5,9],[5,19],[17,3],[3,11],[3,13],[9,11],
    [11,7],[7,15],[7,19],[13,15],[18,19],
  ];
  STATE.polyhedra = {
    ico: { verts: icoVerts, edges: icoEdges },
    dod: { verts: dodVerts, edges: dodEdges },
    rotX: 0, rotY: 0, rotZ: 0,
    morphT: 0,
  };
}

/* ─── INIT: Flow Particles ─── */
function initFlowParts(w, h) {
  STATE.flowParts = Array.from({ length: 2000 }, () => ({
    x: Math.random()*w, y: Math.random()*h, px:0, py:0,
    age: Math.random()*200, maxAge: 150+Math.random()*150, speed: 0.3+Math.random()*0.7,
  }));
}

/* ─── INIT: Plasma Duo (Yin-Yang) ─── */
function initPlasmaBlobs(w, h) {
  const cx = w/2, cy = h/2;
  STATE.plasmaBlobs = [
    { // Yang — warm
      x: cx - w * 0.1, y: cy,
      vx: 1.2, vy: 0.5,
      baseR: Math.min(w, h) * 0.65,
      hue: 275, sat: 55,
      noiseOff: 0, noiseScale: 1.5,
      phase: 0, mass: 2,
    },
    { // Yin — cool
      x: cx + w * 0.1, y: cy,
      vx: -1.2, vy: -0.4,
      baseR: Math.min(w, h) * 0.55,
      hue: 320, sat: 50,
      noiseOff: 50, noiseScale: 1.8,
      phase: Math.PI, mass: 1.7,
    },
  ];
}

/* ═══════════════════════════════════════════════════════════
   RENDER ENGINES — Complete Rewrite
   ═══════════════════════════════════════════════════════════ */

// ─── 1. DUST PARTICLES — floating motes in warm light ───
function renderLuminousDrift(ctx, w, h, t, bands) {
  if (!STATE.dustMotes) initDust(w, h);
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0;

  // Subtle warm light shafts from top
  for (let shaft = 0; shaft < 3; shaft++) {
    const sx = w * (0.25 + shaft * 0.25) + Math.sin(time * 0.1 + shaft) * w * 0.05;
    const shaftAlpha = 0.008 + bass * 0.008;
    const grad = ctx.createLinearGradient(sx - w * 0.08, 0, sx + w * 0.08, h);
    grad.addColorStop(0, hsl(38, 40, 50, shaftAlpha * 2));
    grad.addColorStop(0.3, hsl(38, 30, 40, shaftAlpha));
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(sx - w * 0.03, 0);
    ctx.lineTo(sx + w * 0.03, 0);
    ctx.lineTo(sx + w * 0.12, h);
    ctx.lineTo(sx - w * 0.12, h);
    ctx.closePath();
    ctx.fill();
  }

  // Update each dust mote
  STATE.dustMotes.forEach((d, di) => {
    // Brownian motion via noise — slow, organic drifting
    const nSpeed = 0.06 + d.depth * 0.08;
    const nx = simplex.noise3D(d.noiseOff, time * nSpeed, 0);
    const ny = simplex.noise3D(0, d.noiseOff, time * nSpeed);

    // Gentle attraction toward center — keeps particles from escaping
    const dx = d.x - w/2, dy = d.y - h/2;
    const dist = Math.sqrt(dx*dx + dy*dy) + 1;
    const centerPull = -0.0004 * (dist / (Math.min(w,h) * 0.3)); // stronger when farther
    const attractX = dx * centerPull;
    const attractY = dy * centerPull;

    // Audio forces — bass gives gentle radial sway, NOT strong push
    const bassSwirl = bass * 0.3;
    const swirlAngle = Math.atan2(dy, dx) + Math.PI/2 + simplex.noise2D(di, time * 0.5) * 1.5;
    const pushX = Math.cos(swirlAngle) * bassSwirl + Math.sin(time * 0.8 + di * 0.1) * mid * 0.3;
    const pushY = Math.sin(swirlAngle) * bassSwirl * 0.6 - 0.05 * d.depth; // gentle upward

    // Velocity with strong damping
    d.vx += (nx * 0.8 + pushX + attractX) * 0.02;
    d.vy += (ny * 0.6 + pushY + attractY) * 0.02;
    d.vx *= 0.97;
    d.vy *= 0.97;

    d.x += d.vx * (0.5 + d.depth * 0.5);
    d.y += d.vy * (0.5 + d.depth * 0.5);

    // Soft boundary — re-enter from opposite side near center area
    const m = 30;
    if (d.x < -m) { d.x = w * 0.3 + Math.random() * w * 0.4; d.vx = 0; }
    if (d.x > w + m) { d.x = w * 0.3 + Math.random() * w * 0.4; d.vx = 0; }
    if (d.y < -m) { d.y = h * 0.3 + Math.random() * h * 0.4; d.vy = 0; }
    if (d.y > h + m) { d.y = h * 0.3 + Math.random() * h * 0.4; d.vy = 0; }

    // Flicker — sparkle based on brilliance & per-particle phase
    const flicker = 0.4 + Math.sin(time * 1.2 + d.phase) * 0.25 + Math.sin(time * 3.5 + di * 2.3) * 0.15;
    const audioGlow = overall * 0.35 + brill * 0.25;

    // Size: depth-dependent + audio reactive
    const size = d.size * (0.6 + d.depth * 0.8) * (1 + bass * 0.5) * (0.7 + flicker * 0.5);
    const alpha = d.brightness * (0.08 + audioGlow + flicker * 0.12) * (0.4 + d.depth * 0.6);

    if (size < 0.3 || alpha < 0.01) return;

    const hue = d.hue + mid * 12 + simplex.noise2D(di * 0.5, time * 0.15) * 8;
    const sat = 35 + pres * 20;
    const light = 55 + brill * 18 + d.depth * 15;

    if (size > 2) {
      const glowR = size * 5;
      const gg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, glowR);
      gg.addColorStop(0, hsl(hue, sat, light, alpha * 0.6));
      gg.addColorStop(0.3, hsl(hue, sat - 10, light - 10, alpha * 0.2));
      gg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(d.x, d.y, glowR, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = hsl(hue, sat + 10, light + 15, alpha * 1.2);
      ctx.beginPath(); ctx.arc(d.x, d.y, size * 0.5, 0, Math.PI*2); ctx.fill();
    } else {
      ctx.fillStyle = hsl(hue, sat, light, alpha);
      ctx.beginPath(); ctx.arc(d.x, d.y, size, 0, Math.PI*2); ctx.fill();
    }
  });
}

// ─── 2. HARMONIC WAVES — smooth layered sound wave dimensions ───
// Accumulated time that audio stretches — persists across frames
let _waveTimeAcc = 0;
let _waveBassSmooth = 0;
let _waveMidSmooth = 0;
let _waveOverallSmooth = 0;

function renderSilkRibbons(ctx, w, h, t, bands) {
  const dt = 0.016; // ~60fps frame delta
  const bass = bands.bass||0, sub = bands.subBass||0, lowMid = bands.lowMid||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0;

  // ── Smooth all audio values — no sudden jumps ──
  const smoothing = 0.04; // very slow interpolation
  _waveBassSmooth += (bass - _waveBassSmooth) * smoothing;
  _waveMidSmooth += (mid - _waveMidSmooth) * smoothing;
  _waveOverallSmooth += (overall - _waveOverallSmooth) * smoothing;
  const sBass = _waveBassSmooth;
  const sMid = _waveMidSmooth;
  const sOverall = _waveOverallSmooth;

  // ── Bass stretches time — waves flow faster when bass is strong ──
  const timeStretch = 1 + sBass * 2 + sub * 0.8; // bass = faster flow, not bigger amplitude
  _waveTimeAcc += dt * timeStretch;
  const time = _waveTimeAcc;

  const cy = h / 2;
  const layers = 12;

  // Fixed base amplitude — does NOT jump with audio
  const baseAmplitude = 35;

  for (let li = layers - 1; li >= 0; li--) {
    const layerT = li / (layers - 1);

    // Smooth vertical spread — mid gently fans layers apart
    const spread = 5 + sMid * 8;
    const slowDrift = simplex.noise2D(li * 3.7, time * 0.03) * h * 0.06;
    const baseY = cy + slowDrift + (li - layers/2) * spread;

    // Amplitude: constant base + very gentle audio modulation
    const layerAmp = baseAmplitude * (0.4 + (1-layerT) * 0.6);

    // Wave frequencies & speeds — bass makes them flow, not jump
    const freq1 = 0.002 + li * 0.0003;
    const freq2 = freq1 * 2.2;
    const freq3 = freq1 * 0.4;
    const speed1 = 0.5 + li * 0.08;
    const speed2 = speed1 * 1.4;
    const speed3 = speed1 * 0.3;

    // Gentle noise modulation
    const noiseMod = simplex.noise2D(li * 2.1, time * 0.04) * 0.2;

    const points = [];
    for (let x = -10; x <= w + 10; x += 4) {
      const wave1 = Math.sin(x * freq1 + time * speed1 + li * 0.4) * layerAmp;
      const wave2 = Math.sin(x * freq2 + time * speed2 - li * 0.3) * layerAmp * 0.25;
      const wave3 = Math.sin(x * freq3 + time * speed3 + li * 1.2) * layerAmp * 0.4;
      const envelope = 0.7 + Math.sin(x * 0.001 + time * 0.08 + li) * 0.3;
      const y = baseY + (wave1 + wave2 + wave3) * (1 + noiseMod) * envelope;
      points.push({ x, y });
    }

    // Color — smoothed audio influence
    const hue = 170 + li * 12 + sMid * 15 + Math.sin(time * 0.12 + li) * 8;
    const sat = 50 + pres * 15 + (1-layerT) * 15;
    const light = 35 + (1-layerT) * 20 + brill * 8;
    const alpha = (0.025 + sOverall * 0.04) * (0.3 + (1-layerT) * 0.7);
    const lineWidth = (0.5 + (1-layerT) * 2) * (1 + sOverall * 0.8);

    // Glow band — fixed height, no jumping
    const bandH = (6 + sOverall * 8) * (0.4 + (1-layerT) * 0.6);
    ctx.beginPath();
    points.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y - bandH) : ctx.lineTo(p.x, p.y - bandH));
    for (let i = points.length - 1; i >= 0; i--) ctx.lineTo(points[i].x, points[i].y + bandH);
    ctx.closePath();
    const bandGrad = ctx.createLinearGradient(0, baseY - bandH * 2, 0, baseY + bandH * 2);
    bandGrad.addColorStop(0, "rgba(0,0,0,0)");
    bandGrad.addColorStop(0.3, hsl(hue, sat, light, alpha * 0.25));
    bandGrad.addColorStop(0.5, hsl(hue, sat + 10, light + 5, alpha * 0.4));
    bandGrad.addColorStop(0.7, hsl(hue, sat, light, alpha * 0.25));
    bandGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = bandGrad;
    ctx.fill();

    // Core wave line — smooth quadratic curves
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
      if (i === 0) { ctx.moveTo(points[i].x, points[i].y); continue; }
      const prev = points[i-1], curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      const cpy = (prev.y + curr.y) / 2;
      ctx.quadraticCurveTo(prev.x, prev.y, cpx, cpy);
    }
    ctx.strokeStyle = hsl(hue, sat + 15, light + 15, alpha * 1.5 + 0.015);
    ctx.lineWidth = lineWidth;
    ctx.shadowColor = hsl(hue, sat + 20, light + 10, 0.2);
    ctx.shadowBlur = 4 + sOverall * 8;
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
}

// ─── 3. HYPER POLYHEDRA — 3D rotating wireframes ───
function renderHyperPolyhedra(ctx, w, h, t, bands) {
  if (!STATE.polyhedra) initPolyhedra();
  const P = STATE.polyhedra;
  const cx = w/2, cy = h/2, time = t * 0.001;
  const bass = bands.bass||0, mid = bands.mid||0, highMid = bands.highMid||0;
  const pres = bands.presence||0, brill = bands.brilliance||0, lowMid = bands.lowMid||0;

  // Rotate on 3 axes — audio reactive speeds
  P.rotX += 0.004 * (1 + bass * 3);
  P.rotY += 0.006 * (1 + mid * 2);
  P.rotZ += 0.002 * (1 + highMid * 2.5);

  // Morph parameter
  P.morphT += 0.002 * (1 + lowMid * 3);
  const morphBlend = (Math.sin(P.morphT) + 1) / 2; // 0-1 oscillation

  const project = (v3) => {
    let [x, y, z] = v3;
    // Rotate X
    let y1 = y*Math.cos(P.rotX) - z*Math.sin(P.rotX);
    let z1 = y*Math.sin(P.rotX) + z*Math.cos(P.rotX);
    // Rotate Y
    let x2 = x*Math.cos(P.rotY) + z1*Math.sin(P.rotY);
    let z2 = -x*Math.sin(P.rotY) + z1*Math.cos(P.rotY);
    // Rotate Z
    let x3 = x2*Math.cos(P.rotZ) - y1*Math.sin(P.rotZ);
    let y3 = x2*Math.sin(P.rotZ) + y1*Math.cos(P.rotZ);
    // Perspective
    const scale = (1 + bass * 0.6) * Math.min(w,h) / 500;
    const perspective = 600 / (600 + z2);
    return { x: cx + x3 * perspective * scale, y: cy + y3 * perspective * scale, z: z2, p: perspective };
  };

  // Morphing: blend between ico and dod vertex positions for shared indices
  const drawShape = (shape, scaleMul, hueBase, alphaBase) => {
    const verts = shape.verts.map(v => {
      // Add noise-based vertex displacement
      const nx = simplex.noise3D(v[0]*0.01, v[1]*0.01, time*0.5) * 15 * (1+mid);
      const ny = simplex.noise3D(v[1]*0.01, v[2]*0.01, time*0.5) * 15 * (1+mid);
      const nz = simplex.noise3D(v[0]*0.01, v[2]*0.01, time*0.5) * 15 * (1+mid);
      return [v[0]*scaleMul + nx, v[1]*scaleMul + ny, v[2]*scaleMul + nz];
    });
    const projected = verts.map(project);

    // Draw edges
    shape.edges.forEach(([a, b], ei) => {
      const pa = projected[a], pb = projected[b];
      const avgZ = (pa.z + pb.z) / 2;
      const depthAlpha = 0.3 + (1 - (avgZ + 200) / 400) * 0.7;
      const bandVal = ei % 3 === 0 ? bass : ei % 3 === 1 ? mid : highMid;
      const edgeAlpha = alphaBase * depthAlpha * (0.3 + bandVal * 0.7);
      const edgeHue = hueBase + ei * 2 + bandVal * 40;
      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = hsl(edgeHue, 50 + pres * 30, 50 + brill * 20, edgeAlpha);
      ctx.lineWidth = (0.5 + bandVal * 2.5) * pa.p;
      ctx.stroke();
    });

    // Draw vertices as glowing points
    projected.forEach((p, vi) => {
      const depthAlpha = 0.5 + (1 - (p.z + 200) / 400) * 0.5;
      const pulse = 0.5 + Math.sin(time * 4 + vi * 0.7) * 0.5;
      const vSize = (2 + pres * 6 + highMid * 4) * p.p * pulse;
      const va = alphaBase * depthAlpha * (0.3 + pulse * 0.7);
      const vg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, vSize * 3);
      vg.addColorStop(0, hsl(hueBase + vi * 3, 70, 75, va));
      vg.addColorStop(0.5, hsl(hueBase + vi * 3, 50, 55, va * 0.3));
      vg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = vg; ctx.beginPath(); ctx.arc(p.x, p.y, vSize * 3, 0, Math.PI * 2); ctx.fill();
    });
  };

  // Draw dodecahedron (inner, smaller)
  const dodAlpha = 0.15 + lowMid * 0.25;
  drawShape(P.dod, 0.9 + morphBlend * 0.3, 30, dodAlpha);

  // Draw icosahedron (outer, larger)
  const icoAlpha = 0.15 + mid * 0.25;
  drawShape(P.ico, 1.1 - morphBlend * 0.2, 45, icoAlpha);

  // Connecting energy lines between shapes on bass hits
  if (bass > 0.4) {
    const icoP = P.ico.verts.map(v => project(v.map(c => c * (1.1 - morphBlend*0.2))));
    const dodP = P.dod.verts.map(v => project(v.map(c => c * (0.9 + morphBlend*0.3))));
    for (let i = 0; i < Math.min(icoP.length, dodP.length); i++) {
      const a = icoP[i], b = dodP[i];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = hsl(40, 50, 60, 0.02 + bass * 0.06);
      ctx.lineWidth = 0.5; ctx.stroke();
    }
  }

  // Outer rotating ring of particles
  for (let i = 0; i < 40; i++) {
    const angle = (i/40) * Math.PI * 2 + time * 0.2;
    const ringR = Math.min(w,h) * 0.35 * (1 + bass * 0.3);
    const wobble = simplex.noise2D(i * 2, time) * 20;
    const rx = cx + Math.cos(angle) * (ringR + wobble);
    const ry = cy + Math.sin(angle) * (ringR + wobble) * 0.5;
    const twinkle = 0.5 + Math.sin(time * 5 + i * 4) * 0.5;
    ctx.fillStyle = hsl(45, 50, 70, (0.03 + brill * 0.15) * twinkle);
    ctx.beginPath(); ctx.arc(rx, ry, 1 + brill * 2, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── 4. COSMIC FLOW FIELD (improved) ───
function renderCosmicFlow(ctx, w, h, t, bands) {
  if (!STATE.flowParts) initFlowParts(w, h);
  const time = t * 0.0001;
  const pres = bands.presence||0, mid = bands.mid||0, bass = bands.bass||0, brill = bands.brilliance||0, highMid = bands.highMid||0;
  const fScale = 0.002 + pres * 0.003, fStr = 1.5 + bass * 4 + mid * 2;
  STATE.flowParts.forEach(p => {
    const angle = simplex.noise3D(p.x*fScale, p.y*fScale, time) * Math.PI * 4;
    p.px = p.x; p.py = p.y;
    p.x += Math.cos(angle) * fStr * p.speed; p.y += Math.sin(angle) * fStr * p.speed;
    p.age++;
    if (p.age > p.maxAge || p.x < -20 || p.x > w+20 || p.y < -20 || p.y > h+20) {
      p.x = Math.random()*w; p.y = Math.random()*h; p.px=p.x; p.py=p.y; p.age=0; return;
    }
    const life = 1-p.age/p.maxAge;
    const alpha = life * Math.min(1,p.age/20) * (0.15+pres*0.4+highMid*0.2);
    const hue = 210 + simplex.noise2D(p.x*0.003,p.y*0.003)*40 + mid*30;
    ctx.beginPath(); ctx.moveTo(p.px,p.py); ctx.lineTo(p.x,p.y);
    ctx.strokeStyle = hsl(hue, 50+brill*30, 50+brill*25, alpha);
    ctx.lineWidth = 0.8+bass*2; ctx.stroke();
    if (bass > 0.5) {
      const g = ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,5+bass*8);
      g.addColorStop(0, hsl(hue,80,70,alpha*0.3)); g.addColorStop(1,"rgba(0,0,0,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x,p.y,5+bass*8,0,Math.PI*2); ctx.fill();
    }
  });
}

// ─── 5. DEEP OCEAN (kept + enhanced) ───
function renderDeepOcean(ctx, w, h, t, bands) {
  const time = t*0.0003;
  const sub = bands.subBass||0, bass = bands.bass||0, lowMid = bands.lowMid||0;
  const mid = bands.mid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  if (bands.waveform) {
    ctx.beginPath();
    for (let i = 0; i < bands.waveform.length; i++) {
      const y = h*0.75 + (bands.waveform[i]/128-1)*h*0.08*(1+bass*2);
      i===0 ? ctx.moveTo(0,y) : ctx.lineTo(i*(w/bands.waveform.length),y);
    }
    ctx.strokeStyle = hsl(195,60,50,0.04+bass*0.06); ctx.lineWidth=1; ctx.stroke();
  }
  for (let layer = 0; layer < 8; layer++) {
    ctx.beginPath();
    const yB = h*(0.35+layer*0.08);
    for (let x = 0; x <= w; x += 2) {
      const n1 = simplex.noise3D(x*(0.003+layer*0.001),layer*0.5,time+layer*0.3);
      const n2 = simplex.noise2D(x*(0.007-layer*0.0005),time*1.5-layer);
      const amp = 30+sub*80+bass*40;
      const y = yB + n1*amp + n2*amp*0.4 + Math.sin(x*0.004+time*3+layer)*(15+sub*40);
      x===0 ? ctx.moveTo(x,y) : ctx.lineTo(x,y);
    }
    ctx.lineTo(w,h+10); ctx.lineTo(0,h+10); ctx.closePath();
    const hue = 195+layer*5+lowMid*15;
    const alpha = (0.025+sub*0.04)*(1-(layer/8)*0.5);
    const grad = ctx.createLinearGradient(0,yB-60,0,yB+120);
    grad.addColorStop(0,hsl(hue,50+pres*20,35+mid*15,alpha*1.5));
    grad.addColorStop(0.3,hsl(hue+10,45,28+brill*10,alpha));
    grad.addColorStop(1,"rgba(0,0,0,0)"); ctx.fillStyle=grad; ctx.fill();
  }
  for (let i = 0; i < 30; i++) {
    const px = (simplex.noise2D(i*4.7,time*0.8)*0.5+0.5)*w;
    const py = h*0.4+simplex.noise2D(i*9.3,time*0.8+50)*h*0.35;
    const pulse = 0.5+Math.sin(time*8+i*2.3)*0.5;
    const g = ctx.createRadialGradient(px,py,0,px,py,(2+pres*8)*pulse*5);
    g.addColorStop(0,hsl(190,80,70,(0.05+brill*0.25)*pulse)); g.addColorStop(1,"rgba(0,0,0,0)");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(px,py,(2+pres*8)*pulse*5,0,Math.PI*2); ctx.fill();
  }
}

// ─── 6. PLASMA DUO — magnetic field / atomic particle dynamics ───
function renderPlasmaNebula(ctx, w, h, t, bands) {
  if (!STATE.plasmaBlobs) initPlasmaBlobs(w, h);
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0, overall = bands.overall||0;
  const cx = w/2, cy = h/2;

  const A = STATE.plasmaBlobs[0];
  const B = STATE.plasmaBlobs[1];

  // ── Dynamic sizing — pulsing with audio ──
  const dynA = 1 + bass * 0.6 + sub * 0.4 + Math.sin(time * 0.2 + A.phase) * 0.12 + mid * 0.2;
  const dynB = 1 + bass * 0.5 + sub * 0.3 + Math.sin(time * 0.2 + B.phase) * 0.12 + highMid * 0.25;
  const rA = A.baseR * dynA;
  const rB = B.baseR * dynB;

  // ── Magnetic field physics ──
  const ddx = B.x - A.x, ddy = B.y - A.y;
  const dist = Math.sqrt(ddx*ddx + ddy*ddy) + 1;
  const ux = ddx/dist, uy = ddy/dist; // unit vector A→B

  // Magnetic-style force: strong attraction at medium range, repulsion when overlapping
  // Like two magnets — snap together then resist at close range
  const equilibrium = (rA + rB) * 0.35;
  const gap = dist - equilibrium;
  // Lennard-Jones-like potential: repel close, attract mid, fade far
  const attract = gap * 0.0006 * (1 + overall * 0.5);
  const repel = gap < 0 ? gap * 0.002 : 0; // strong repulsion on overlap
  const forceMag = attract + repel;

  // Perpendicular orbital force — creates electron-like orbiting
  const orbSpeed = 0.2 + mid * 0.4 + bass * 0.15;
  const orbFx = -uy * orbSpeed * 0.012;
  const orbFy = ux * orbSpeed * 0.012;

  // Bass impulse — sudden burst apart like particle collision
  const bassImpulse = bass > 0.45 ? (bass - 0.45) * 0.4 : 0;
  const impX = -ux * bassImpulse;
  const impY = -uy * bassImpulse;

  // Sub-bass creates slow breathing orbit expansion
  const breathOrbit = Math.sin(time * 0.15) * sub * 0.08;
  const breathFx = -ux * breathOrbit;
  const breathFy = -uy * breathOrbit;

  // Noise wandering
  const wAx = simplex.noise2D(0, time * 0.05) * 0.2;
  const wAy = simplex.noise2D(5, time * 0.05) * 0.15;
  const wBx = simplex.noise2D(50, time * 0.05) * 0.2;
  const wBy = simplex.noise2D(55, time * 0.05) * 0.15;

  // Apply forces
  A.vx += (ux * forceMag + orbFx + impX + breathFx + wAx * 0.015) * A.mass;
  A.vy += (uy * forceMag + orbFy + impY * 0.7 + breathFy + wAy * 0.015) * A.mass;
  B.vx += (-ux * forceMag - orbFx - impX - breathFx + wBx * 0.015) * B.mass;
  B.vy += (-uy * forceMag - orbFy - impY * 0.7 - breathFy + wBy * 0.015) * B.mass;

  // Center gravity — gentle pull to keep on screen
  [A, B].forEach(blob => {
    const cdx = blob.x - cx, cdy = blob.y - cy;
    const cdist = Math.sqrt(cdx*cdx + cdy*cdy) + 1;
    blob.vx -= cdx * 0.00015 * (cdist / (Math.min(w,h) * 0.3));
    blob.vy -= cdy * 0.00015 * (cdist / (Math.min(w,h) * 0.3));
    blob.vx *= 0.988;
    blob.vy *= 0.988;
    blob.x += blob.vx;
    blob.y += blob.vy;
  });

  // ── Magnetic field lines — visible force field ──
  const fieldLines = 16;
  for (let fi = 0; fi < fieldLines; fi++) {
    const startAngle = (fi / fieldLines) * Math.PI * 2;
    const startR = rA * 0.15;
    let px = A.x + Math.cos(startAngle) * startR;
    let py = A.y + Math.sin(startAngle) * startR;

    ctx.beginPath();
    ctx.moveTo(px, py);

    // Trace field line through space
    for (let step = 0; step < 60; step++) {
      // Combined field from both blobs
      const dAx = px - A.x, dAy = px - A.y;
      const distA = Math.sqrt((px-A.x)*(px-A.x) + (py-A.y)*(py-A.y)) + 1;
      const distB = Math.sqrt((px-B.x)*(px-B.x) + (py-B.y)*(py-B.y)) + 1;

      // Field direction: away from A, toward B (dipole)
      const fAx = (px - A.x) / (distA * distA) * 5000;
      const fAy = (py - A.y) / (distA * distA) * 5000;
      const fBx = (B.x - px) / (distB * distB) * 5000;
      const fBy = (B.y - py) / (distB * distB) * 5000;

      const ffx = fAx + fBx, ffy = fAy + fBy;
      const fMag = Math.sqrt(ffx*ffx + ffy*ffy) + 0.001;
      const stepSize = 8;
      px += (ffx / fMag) * stepSize;
      py += (ffy / fMag) * stepSize;

      ctx.lineTo(px, py);

      // Stop if reached B or went off-screen
      if (distB < rB * 0.15 || px < -50 || px > w+50 || py < -50 || py > h+50) break;
    }

    const fieldAlpha = (0.008 + overall * 0.015 + pres * 0.01) * (0.5 + Math.sin(time * 0.5 + fi * 0.4) * 0.5);
    const fieldHue = 290 + fi * 4 + mid * 15;
    ctx.strokeStyle = hsl(fieldHue, 35, 50, fieldAlpha);
    ctx.lineWidth = 0.5 + overall * 1;
    ctx.stroke();
  }

  // ── Draw blobs ──
  const drawBlob = (blob, radius, isPrimary) => {
    const hue = blob.hue + mid * 25 + simplex.noise2D(blob.noiseOff, time * 0.1) * 15;
    const sat = blob.sat + pres * 15;

    // Offset gradient center — NOT at blob center, prevents "eye" look
    const gcOffX = simplex.noise2D(blob.noiseOff + 20, time * 0.06) * radius * 0.25;
    const gcOffY = simplex.noise2D(blob.noiseOff + 30, time * 0.06) * radius * 0.2;
    const gcx = blob.x + gcOffX;
    const gcy = blob.y + gcOffY;

    // 7 layers for volumetric depth
    for (let layer = 6; layer >= 0; layer--) {
      const layerT = layer / 6;
      const lr = radius * (0.2 + layerT * 0.95);
      // Much stronger noise for amorphous plasma shape
      const noiseAmp = 0.2 + layerT * 0.3 + bass * 0.15;
      const alpha = (0.012 + bass * 0.015 + overall * 0.01) * (1 - layerT * 0.55);
      const light = 25 + (1-layerT) * 25 + brill * 10;

      // Gradient from offset center — diffuse, no bright spot
      const grad = ctx.createRadialGradient(gcx, gcy, lr * 0.15, blob.x, blob.y, lr);
      grad.addColorStop(0, hsl(hue, sat+5, light+15, alpha*2));
      grad.addColorStop(0.2, hsl(hue+5, sat, light+8, alpha*1.5));
      grad.addColorStop(0.45, hsl(hue+10, sat-5, light, alpha));
      grad.addColorStop(0.7, hsl(hue+18, sat-12, light-8, alpha*0.5));
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = grad;

      ctx.beginPath();
      const segs = 90;
      for (let s = 0; s <= segs; s++) {
        const a = (s/segs) * Math.PI * 2;
        const n1 = simplex.noise3D(Math.cos(a)*blob.noiseScale, Math.sin(a)*blob.noiseScale, time*0.08+layer*0.2+blob.noiseOff);
        const n2 = simplex.noise2D(Math.cos(a)*blob.noiseScale*2.5+blob.noiseOff, Math.sin(a)*blob.noiseScale*2.5+time*0.1);
        const n3 = simplex.noise2D(Math.cos(a)*blob.noiseScale*5+time*0.04, Math.sin(a)*blob.noiseScale*5+blob.noiseOff*0.3);
        // Large-scale deformation — makes it blobby, not round
        const n4 = simplex.noise2D(Math.cos(a)*0.8+blob.noiseOff*0.1, Math.sin(a)*0.8+time*0.05) * 0.3;
        // Stretch toward other blob
        const other = isPrimary ? B : A;
        const toOther = Math.atan2(other.y - blob.y, other.x - blob.x);
        const angleDiff = Math.cos(a - toOther);
        const proximity = 1 - Math.min(1, dist / ((rA+rB) * 0.8));
        const stretch = angleDiff > 0 ? angleDiff * 0.3 * proximity : 0;

        const rr = lr * (1 + n1*noiseAmp + n2*noiseAmp*0.4 + n3*noiseAmp*0.12 + n4 + stretch);
        ctx.lineTo(blob.x + Math.cos(a)*rr, blob.y + Math.sin(a)*rr);
      }
      ctx.closePath();
      ctx.fill();
    }
    // No bright core — plasma is diffuse, not an eye
  };

  // Depth sort
  if (A.y > B.y) { drawBlob(B, rB, false); drawBlob(A, rA, true); }
  else { drawBlob(A, rA, true); drawBlob(B, rB, false); }

  // ── Interaction zone — luminous merge at contact ──
  const overlap = (rA + rB) * 0.5 - dist;
  if (overlap > 0) {
    const blendT = Math.min(1, overlap / (Math.min(rA, rB) * 0.4));
    const mx = (A.x * rB + B.x * rA) / (rA + rB); // weighted midpoint
    const my = (A.y * rB + B.y * rA) / (rA + rB);
    const mergeR = Math.min(rA, rB) * 0.5 * blendT;
    const mergeHue = (A.hue + B.hue) / 2 + mid * 15;

    for (let ml = 4; ml >= 0; ml--) {
      const mlr = mergeR * (0.4 + ml * 0.45);
      const mla = blendT * (0.015 + bass * 0.025) * (1 - ml/5);
      const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mlr);
      mg.addColorStop(0, hsl(mergeHue, 75, 78, mla * 3));
      mg.addColorStop(0.2, hsl(mergeHue + 8, 65, 65, mla * 2));
      mg.addColorStop(0.5, hsl(mergeHue + 15, 55, 50, mla));
      mg.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(mx, my, mlr, 0, Math.PI*2); ctx.fill();
    }

    // Energy bridge — plasma tendril
    const bridgeAlpha = blendT * (0.025 + mid * 0.04);
    for (let bi = 0; bi < 3; bi++) {
      ctx.beginPath();
      ctx.moveTo(A.x, A.y);
      const off = (bi - 1) * 20;
      const cp1x = (A.x+mx)/2 + simplex.noise2D(time*0.3+bi, 0)*40 + off;
      const cp1y = (A.y+my)/2 + simplex.noise2D(0, time*0.3+bi)*35;
      const cp2x = (B.x+mx)/2 + simplex.noise2D(time*0.3+bi, 10)*40 - off;
      const cp2y = (B.y+my)/2 + simplex.noise2D(10, time*0.3+bi)*35;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, B.x, B.y);
      ctx.strokeStyle = hsl(mergeHue + bi*15, 50, 60, bridgeAlpha * (1 - bi*0.25));
      ctx.lineWidth = (2 + blendT * 6) * (1 - bi*0.3);
      ctx.shadowColor = hsl(mergeHue, 60, 55, bridgeAlpha * 0.5);
      ctx.shadowBlur = 12;
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  // Tiny scattered particles
  for (let i = 0; i < 40; i++) {
    const px = w * (simplex.noise2D(i*8.3, time*0.12)*0.5+0.5);
    const py = h * (simplex.noise2D(i*14.7, time*0.12+100)*0.5+0.5);
    const tw = 0.5 + Math.sin(time*1.2 + i*3.1)*0.5;
    ctx.fillStyle = hsl(280+i*2, 25, 75, (0.012+brill*0.08)*tw);
    ctx.beginPath(); ctx.arc(px, py, 0.4+brill, 0, Math.PI*2); ctx.fill();
  }
}

// ─── 7. RAIN DROPS — layered rainfall with ripples ───
function initRainDrops(w, h) {
  STATE.rainDrops = Array.from({ length: 400 }, (_, i) => ({
    x: Math.random() * w * 1.3 - w * 0.15,
    y: Math.random() * h * 1.5 - h * 0.5,
    speed: 3 + Math.random() * 6,
    length: 8 + Math.random() * 25,
    width: 0.3 + Math.random() * 1.2,
    depth: Math.random(), // 0=far, 1=near
    hue: 200 + Math.random() * 30,
    brightness: 0.2 + Math.random() * 0.8,
    windPhase: Math.random() * Math.PI * 2,
  }));
  STATE.ripples = [];
}

function renderRainDrops(ctx, w, h, t, bands) {
  if (!STATE.rainDrops) initRainDrops(w, h);
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0;

  // Audio-reactive parameters
  const intensity = 0.5 + bass * 1.5 + sub * 0.5; // rain heaviness
  const windAngle = Math.sin(time * 0.08) * 0.15 + mid * 0.2; // wind sway
  const glowAmount = brill * 0.5 + pres * 0.3;

  // Subtle ground fog
  const fogGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
  fogGrad.addColorStop(0, "rgba(0,0,0,0)");
  fogGrad.addColorStop(1, `rgba(40,60,80,${0.06 + overall * 0.06})`);
  ctx.fillStyle = fogGrad;
  ctx.fillRect(0, 0, w, h);

  // Update & draw ripples (from drops hitting bottom)
  STATE.ripples = STATE.ripples.filter(rp => {
    rp.r += rp.speed;
    rp.alpha *= 0.96;
    if (rp.alpha < 0.003) return false;
    // Elliptical ripple (perspective)
    ctx.beginPath();
    ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = hsl(rp.hue, 40, 55 + brill * 15, rp.alpha);
    ctx.lineWidth = 0.5 + rp.alpha * 2;
    ctx.stroke();
    // Inner ring
    if (rp.r > 5) {
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r * 0.6, rp.r * 0.6 * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = hsl(rp.hue, 35, 50, rp.alpha * 0.5);
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
    return true;
  });

  // Update & draw rain drops — back to front for depth
  const sorted = [...STATE.rainDrops].sort((a, b) => a.depth - b.depth);

  sorted.forEach((drop, di) => {
    // Depth-based parallax
    const depthMul = 0.3 + drop.depth * 0.7;
    const dropSpeed = drop.speed * intensity * depthMul;

    // Wind effect
    const windX = Math.sin(time * 0.5 + drop.windPhase) * 0.5 + windAngle * 3;

    // Move
    drop.y += dropSpeed;
    drop.x += windX * depthMul;

    // When drop hits ground — create ripple and reset
    const groundY = h * (0.82 + drop.depth * 0.15); // nearer drops hit lower
    if (drop.y > groundY) {
      // Spawn ripple
      if (Math.random() < 0.4 + bass * 0.4) {
        STATE.ripples.push({
          x: drop.x,
          y: groundY + Math.random() * 5,
          r: 1,
          speed: 0.5 + bass * 1.5 + drop.depth * 0.5,
          alpha: 0.15 + bass * 0.2 + drop.depth * 0.1,
          hue: drop.hue,
        });
      }
      // Reset drop to top
      drop.y = -drop.length - Math.random() * h * 0.5;
      drop.x = Math.random() * w * 1.3 - w * 0.15;
    }

    // Wrap X
    if (drop.x > w + 30) drop.x = -30;
    if (drop.x < -30) drop.x = w + 30;

    // Draw the rain streak
    const alpha = drop.brightness * (0.25 + overall * 0.35 + glowAmount * 0.2) * depthMul;
    const streakLen = drop.length * (0.8 + bass * 0.6) * depthMul;
    const streakW = (drop.width + 0.5) * depthMul;

    const x1 = drop.x;
    const y1 = drop.y;
    const x2 = drop.x - windX * streakLen * 0.3;
    const y2 = drop.y - streakLen;

    // Gradient along streak — bright at bottom, fading at top
    const streakGrad = ctx.createLinearGradient(x2, y2, x1, y1);
    streakGrad.addColorStop(0, hsl(drop.hue, 30, 50, 0));
    streakGrad.addColorStop(0.3, hsl(drop.hue, 35, 55 + brill * 15, alpha * 0.4));
    streakGrad.addColorStop(1, hsl(drop.hue, 40, 65 + brill * 20, alpha));

    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = streakGrad;
    ctx.lineWidth = streakW;
    ctx.lineCap = "round";
    ctx.stroke();

    // Bright tip glow on close drops
    if (drop.depth > 0.6 && glowAmount > 0.1) {
      const tipGlow = ctx.createRadialGradient(x1, y1, 0, x1, y1, streakW * 4);
      tipGlow.addColorStop(0, hsl(drop.hue, 50, 75, alpha * 0.5 * glowAmount));
      tipGlow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = tipGlow;
      ctx.beginPath(); ctx.arc(x1, y1, streakW * 4, 0, Math.PI * 2); ctx.fill();
    }
  });

  // Distant lightning flash on strong bass hits
  if (bass > 0.7 && Math.random() < 0.15) {
    ctx.fillStyle = `rgba(150,170,200,${(bass - 0.7) * 0.06})`;
    ctx.fillRect(0, 0, w, h);
  }
}

// ─── 8. AMBIENT SPECTRUM — organic audio visualizer ───
let _specSmooth = null;
function renderAmbientSpectrum(ctx, w, h, t, bands) {
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0;

  // Get raw frequency data if available
  let freqData = null;
  if (bands.waveform && bands.waveform.length > 0) {
    // We'll use the 7-band values to create a smooth spectrum
  }

  // Number of bars
  const barCount = 64;
  const mirrorY = h; // bottom edge
  const maxBarH = h * 0.4;
  const barSpacing = w * 0.75 / barCount;
  const barW = barSpacing * 0.55;
  const startX = (w - barCount * barSpacing) / 2;

  // Initialize smoothing
  if (!_specSmooth || _specSmooth.length !== barCount) {
    _specSmooth = new Array(barCount).fill(0);
  }

  // Ambient background glow based on overall energy
  const bgGlow = ctx.createRadialGradient(w/2, mirrorY, 0, w/2, mirrorY, w * 0.5);
  bgGlow.addColorStop(0, `rgba(40,80,140,${0.01 + overall * 0.02})`);
  bgGlow.addColorStop(0.5, `rgba(20,50,100,${0.005 + overall * 0.01})`);
  bgGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bgGlow;
  ctx.fillRect(0, 0, w, h);

  // Compute bar heights from frequency bands — smooth bell curve per band
  for (let i = 0; i < barCount; i++) {
    const norm = i / (barCount - 1); // 0→1 across spectrum

    // Map bar position to frequency bands with smooth interpolation
    let val = 0;
    if (norm < 0.08) val = sub * 0.8 + bass * 0.2;
    else if (norm < 0.2) val = bass * 0.7 + sub * 0.15 + mid * 0.15;
    else if (norm < 0.35) val = bass * 0.3 + mid * 0.5 + highMid * 0.2;
    else if (norm < 0.55) val = mid * 0.6 + highMid * 0.3 + bass * 0.1;
    else if (norm < 0.7) val = highMid * 0.5 + mid * 0.2 + pres * 0.3;
    else if (norm < 0.85) val = pres * 0.6 + highMid * 0.2 + brill * 0.2;
    else val = brill * 0.5 + pres * 0.3 + highMid * 0.2;

    // Add per-bar noise variation
    val += simplex.noise2D(i * 0.3, time * 0.5) * 0.15;
    val = Math.max(0.02, Math.min(1, val)); // always show a tiny bit

    // Smooth with previous frame (slow attack, slower release for relaxing feel)
    const target = val;
    const attack = 0.08;
    const release = 0.03;
    _specSmooth[i] += (target - _specSmooth[i]) * (target > _specSmooth[i] ? attack : release);
  }

  // Draw bars — back layer (wide glow), then front layer (sharp bar)
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < barCount; i++) {
      const norm = i / (barCount - 1);
      const val = _specSmooth[i];
      const x = startX + i * barSpacing;
      const barH = val * maxBarH;

      // Color: cool blue at low freq → warm teal at high freq
      const hue = 210 + norm * 40 + mid * 10;
      const sat = 40 + pres * 20 + norm * 10;
      const light = 35 + val * 25 + brill * 10;

      if (pass === 0) {
        // Wide ambient glow behind each bar
        const glowW = barW * 3;
        const glowGrad = ctx.createLinearGradient(0, mirrorY - barH, 0, mirrorY);
        glowGrad.addColorStop(0, hsl(hue, sat - 10, light + 10, 0));
        glowGrad.addColorStop(0.3, hsl(hue, sat, light, val * 0.04 + 0.005));
        glowGrad.addColorStop(1, hsl(hue, sat + 10, light + 5, val * 0.06 + 0.01));
        ctx.fillStyle = glowGrad;
        ctx.beginPath();
        const r = glowW / 2;
        ctx.moveTo(x - glowW/2 + r, mirrorY - barH);
        ctx.arcTo(x + glowW/2, mirrorY - barH, x + glowW/2, mirrorY, r);
        ctx.lineTo(x + glowW/2, mirrorY);
        ctx.lineTo(x - glowW/2, mirrorY);
        ctx.arcTo(x - glowW/2, mirrorY - barH, x - glowW/2 + r, mirrorY - barH, r);
        ctx.closePath();
        ctx.fill();
      } else {
        // Main bar with rounded top
        const alpha = 0.08 + val * 0.2 + overall * 0.05;
        const barGrad = ctx.createLinearGradient(0, mirrorY - barH, 0, mirrorY);
        barGrad.addColorStop(0, hsl(hue, sat + 15, light + 20, alpha * 0.6));
        barGrad.addColorStop(0.3, hsl(hue, sat + 10, light + 10, alpha));
        barGrad.addColorStop(0.8, hsl(hue, sat + 5, light, alpha * 0.8));
        barGrad.addColorStop(1, hsl(hue, sat, light - 5, alpha * 0.9));
        ctx.fillStyle = barGrad;

        // Rounded rectangle
        const r = Math.min(barW / 2, 4);
        ctx.beginPath();
        ctx.moveTo(x - barW/2 + r, mirrorY - barH);
        ctx.arcTo(x + barW/2, mirrorY - barH, x + barW/2, mirrorY, r);
        ctx.lineTo(x + barW/2, mirrorY);
        ctx.lineTo(x - barW/2, mirrorY);
        ctx.arcTo(x - barW/2, mirrorY - barH, x - barW/2 + r, mirrorY - barH, r);
        ctx.closePath();
        ctx.fill();

        // Bright cap at top
        const capH = 2 + val * 3;
        ctx.fillStyle = hsl(hue, sat + 20, light + 25, alpha * 1.5);
        ctx.beginPath();
        ctx.moveTo(x - barW/2 + r, mirrorY - barH);
        ctx.arcTo(x + barW/2, mirrorY - barH, x + barW/2, mirrorY - barH + capH, r);
        ctx.lineTo(x + barW/2, mirrorY - barH + capH);
        ctx.lineTo(x - barW/2, mirrorY - barH + capH);
        ctx.arcTo(x - barW/2, mirrorY - barH, x - barW/2 + r, mirrorY - barH, r);
        ctx.closePath();
        ctx.fill();

        // Upward glow fade from bar top
        if (barH > 5) {
          const upGlow = ctx.createLinearGradient(0, mirrorY - barH - barH * 0.3, 0, mirrorY - barH);
          upGlow.addColorStop(0, hsl(hue, sat, light + 15, 0));
          upGlow.addColorStop(1, hsl(hue, sat, light + 10, alpha * 0.3));
          ctx.fillStyle = upGlow;
          ctx.fillRect(x - barW, mirrorY - barH - barH * 0.3, barW * 2, barH * 0.3);
        }
      }
    }
  }

  // Floating particles above spectrum — ambient dust
  for (let i = 0; i < 25; i++) {
    const px = w * (simplex.noise2D(i * 6.3, time * 0.1) * 0.5 + 0.5);
    const py = h * 0.3 + simplex.noise2D(i * 11.7, time * 0.1 + 50) * h * 0.4;
    const tw = 0.5 + Math.sin(time * 1.5 + i * 2.9) * 0.5;
    const ps = 0.5 + brill * 2;
    ctx.fillStyle = hsl(220, 30, 70, (0.02 + brill * 0.08) * tw);
    ctx.beginPath(); ctx.arc(px, py, ps, 0, Math.PI * 2); ctx.fill();
  }
}

// ─── 9. NAKHWA FIRE BLOSSOM — Haman Nakhwa Festival (함안 낙화놀이) ───
function renderNakhwaFire(ctx, w, h, t, bands) {
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0;

  // Dimensions
  const waterY = h * 0.92; // water surface — only 8% at bottom
  const wireY = h * 0.06; // wire height
  const wireCount = 5;

  // Initialize embers pool
  if (!STATE.nakhwaEmbers) {
    STATE.nakhwaEmbers = [];
    STATE.nakhwaWireDrops = [];
    STATE.nakhwaWaterRipples = [];
  }

  // ── Dark night sky gradient ──
  const skyGrad = ctx.createLinearGradient(0, 0, 0, waterY);
  skyGrad.addColorStop(0, "rgb(3,2,8)");
  skyGrad.addColorStop(0.7, "rgb(8,5,15)");
  skyGrad.addColorStop(1, "rgb(12,8,5)");
  ctx.fillStyle = skyGrad;
  ctx.fillRect(0, 0, w, waterY);

  // ── Dark water ──
  const waterGrad = ctx.createLinearGradient(0, waterY, 0, h);
  waterGrad.addColorStop(0, "rgb(5,4,10)");
  waterGrad.addColorStop(0.3, "rgb(3,2,6)");
  waterGrad.addColorStop(1, "rgb(1,1,3)");
  ctx.fillStyle = waterGrad;
  ctx.fillRect(0, waterY, w, h - waterY);

  // ── Draw horizontal wires with gentle sag ──
  const windSway = Math.sin(time * 0.3) * 8 + mid * 15;
  for (let wi = 0; wi < wireCount; wi++) {
    const wy = wireY + wi * (waterY * 0.12);
    ctx.beginPath();
    ctx.strokeStyle = `rgba(80,60,30,${0.03 + overall * 0.02})`;
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= w; x += 4) {
      const sag = Math.sin((x / w) * Math.PI) * 15 + Math.sin(x * 0.01 + time) * 2;
      const y = wy + sag + windSway * 0.1 * Math.sin(x * 0.005 + wi);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  // Spawn wisteria-like clusters — drooping racemes of embers from wire
  const maxEmbers = 250;
  const clusterChance = 0.3 + bass * 0.5 + overall * 0.3;
  if (Math.random() < clusterChance && STATE.nakhwaEmbers.length < maxEmbers) {
    const wi = Math.floor(Math.random() * wireCount);
    const anchorX = Math.random() * w;
    const anchorWy = wireY + wi * (waterY * 0.12) + Math.sin((anchorX / w) * Math.PI) * 15;
    const clusterSize = 5 + Math.floor(Math.random() * 7 + bass * 3);
    const clusterHue = 20 + Math.random() * 40;
    const clusterSpread = 8 + Math.random() * 15;
    const racemeLen = 30 + Math.random() * 50 + bass * 20;
    for (let ci = 0; ci < clusterSize && STATE.nakhwaEmbers.length < maxEmbers; ci++) {
      const progress = ci / Math.max(1, clusterSize - 1);
      const taper = 1 - progress * 0.7;
      const ox = (Math.random() - 0.5) * clusterSpread * taper;
      const oy = progress * racemeLen + Math.random() * 5;
      STATE.nakhwaEmbers.push({
        x: anchorX + ox,
        y: anchorWy + oy,
        vx: (Math.random() - 0.5) * 0.4 + windSway * 0.015,
        vy: 0.2 + Math.random() * 0.8 + progress * 0.5,
        life: 0.7 + Math.random() * 0.3,
        decay: 0.0015 + Math.random() * 0.003 + progress * 0.001,
        size: (1.5 + Math.random() * 3.5) * (1 - progress * 0.3),
        hue: clusterHue + (Math.random() - 0.5) * 10,
        bright: 0.4 + Math.random() * 0.5 + (1 - progress) * 0.2,
        flicker: Math.random() * Math.PI * 2,
        spiralDir: Math.random() < 0.5 ? 1 : -1,
        spiralSpeed: 1.5 + Math.random() * 2.5,
        spiralRadius: 0.8 + Math.random() * 2 + taper * 1.5,
        age: 0,
        trail: [],
      });
    }
  }

  // ── Update & draw embers — the falling fire flowers ──
  const gravity = 0.015 + bass * 0.01;
  const wind = Math.sin(time * 0.2) * 0.3 + mid * 0.5;
  // Audio-reactive spiral intensity
  const spiralPulse = 1 + bass * 2 + highMid * 1.5;
  const spiralExpand = 1 + mid * 1.5;
  // Beat brightness pulse — bass drives a flash that decays
  const beatPulse = bass * 0.6 + sub * 0.3;

  STATE.nakhwaEmbers = STATE.nakhwaEmbers.filter(em => {
    em.vy += gravity;
    em.vx += wind * 0.01 + (Math.random() - 0.5) * 0.1;
    em.vx *= 0.99;
    em.x += em.vx;
    em.y += em.vy;
    em.life -= em.decay;
    em.flicker += 0.3;
    em.age += 1;

    // Store trail (long for complex comet tail)
    em.trail.push({ x: em.x, y: em.y, a: em.life });
    if (em.trail.length > 24) em.trail.shift();

    // Check water hit — spawn impact effects
    if (em.y >= waterY - 2) {
      const impactX = em.x;
      const impactSize = em.size;
      const impactBright = em.bright * em.life;

      // Multi-ring ripples (2-3 rings staggered)
      const ringCount = 2 + (impactSize > 2.5 ? 1 : 0);
      for (let ri = 0; ri < ringCount && STATE.nakhwaWaterRipples.length < 80; ri++) {
        STATE.nakhwaWaterRipples.push({
          x: impactX + (Math.random() - 0.5) * 4,
          y: waterY + Math.random() * 3,
          r: 0.5 + ri * 3,
          speed: 0.4 + impactSize * 0.15 - ri * 0.08,
          alpha: (0.12 + impactBright * 0.15) * (1 - ri * 0.25),
          hue: em.hue,
          type: "ring",
        });
      }

      // Splash sparks — tiny embers bounce up from water
      const sparkCount = 2 + Math.floor(impactSize * 1.5);
      for (let si = 0; si < sparkCount && STATE.nakhwaSplashSparks.length < 60; si++) {
        const angle = -Math.PI * 0.2 - Math.random() * Math.PI * 0.6; // upward arc
        const speed = 1 + Math.random() * 2.5 + impactSize * 0.5;
        STATE.nakhwaSplashSparks.push({
          x: impactX + (Math.random() - 0.5) * 6,
          y: waterY - 1,
          vx: Math.cos(angle) * speed * (Math.random() < 0.5 ? 1 : -1),
          vy: Math.sin(angle) * speed,
          life: 0.6 + Math.random() * 0.4,
          decay: 0.015 + Math.random() * 0.02,
          size: 0.3 + Math.random() * 0.8,
          hue: em.hue + Math.random() * 15 - 5,
          bright: impactBright,
        });
      }

      // Steam wisp — soft rising glow
      if (impactSize > 1.5 && STATE.nakhwaSteam.length < 30) {
        STATE.nakhwaSteam.push({
          x: impactX,
          y: waterY - 2,
          vy: -0.2 - Math.random() * 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          size: 5 + impactSize * 3 + Math.random() * 8,
          life: 0.7 + Math.random() * 0.3,
          decay: 0.005 + Math.random() * 0.005,
          hue: em.hue + 10,
        });
      }

      return false;
    }

    if (em.life <= 0 || em.x < -20 || em.x > w + 20) return false;

    // Flicker intensity + beat brightness pulse
    const flick = 0.6 + Math.sin(em.flicker) * 0.4;
    const alpha = Math.min(1, em.life * em.bright * flick * (1 + beatPulse));
    const sat = 70 + brill * 20;
    const lit = 55 + em.bright * 25 + brill * 15 + beatPulse * 20;
    const coreR = em.size * (0.5 + flick * 0.5);

    // ── Multi-dimensional comet trail ──
    // Uses Lissajous curves projected from 4D to 2D with golden ratio frequencies
    // φ = golden ratio ≈ 1.618 — creates never-repeating patterns
    // The trail point at parametric time τ orbits in 4D:
    //   w1(τ) = cos(τ·φ)·cos(τ·φ²)  — 4D x
    //   w2(τ) = sin(τ·φ)·sin(τ·φ³)  — 4D y
    // Then stereographic projection 4D→2D:
    //   px = w1/(1+0.3·w2)  ,  py = w2/(1+0.3·w1)
    if (em.trail.length > 3) {
      const tailLen = em.trail.length;
      const PHI = 1.618033988749895; // golden ratio
      const PHI2 = PHI * PHI;  // φ²
      const PHI3 = PHI2 * PHI; // φ³

      // 3 strands with different dimensional projections
      for (let strand = 0; strand < 3; strand++) {
        ctx.beginPath();
        let first = true;
        for (let ti = 0; ti < tailLen; ti++) {
          const tp = em.trail[ti];
          const progress = ti / (tailLen - 1); // 0=oldest 1=newest
          const tau = (em.age - (tailLen - ti)) * 0.08 * em.spiralSpeed * spiralPulse;
          
          // Decay envelope — trail fades from head to tail
          const envelope = Math.pow(progress, 0.6); // 0→1 ease-in
          
          // 4D Lissajous coordinates with golden ratio frequency relationships
          const phaseOff = strand * Math.PI * 2 / 3; // 120° phase separation
          const w1 = Math.cos(tau * PHI + phaseOff) * Math.cos(tau * PHI2 * 0.5);
          const w2 = Math.sin(tau * PHI + phaseOff) * Math.sin(tau * PHI3 * 0.3);
          
          // Stereographic projection 4D → 2D (creates organic curvature)
          const denom = 1 + 0.3 * w2;
          const projX = w1 / denom;
          const projY = w2 / (1 + 0.3 * w1);
          
          // Scale by ember size + audio + envelope taper (wide at head, narrow at tail)
          const radius = em.spiralRadius * spiralExpand * em.size * 0.7 * (0.3 + envelope * 0.7);
          const ox = projX * radius * em.spiralDir;
          const oy = projY * radius * 0.65;
          
          const px = tp.x + ox;
          const py = tp.y + oy;
          if (first) { ctx.moveTo(px, py); first = false; }
          else ctx.lineTo(px, py);
        }
        
        // Each strand: different opacity + hue shift + width
        const strandAlpha = alpha * (0.25 - strand * 0.07);
        const strandHue = em.hue + strand * 12 - 8;
        const strandWidth = em.size * (0.6 - strand * 0.15);
        ctx.strokeStyle = hsl(strandHue, 75 + strand * 5, 58 + brill * 12, strandAlpha);
        ctx.lineWidth = strandWidth;
        ctx.stroke();
      }

      // Luminous center trail — Catmull-Rom spline for smoothness
      ctx.beginPath();
      for (let ti = 0; ti < tailLen; ti++) {
        const tp = em.trail[ti];
        if (ti === 0) ctx.moveTo(tp.x, tp.y);
        else if (ti < tailLen - 1) {
          // Smooth curve using midpoints
          const next = em.trail[ti + 1];
          const mx = (tp.x + next.x) / 2;
          const my = (tp.y + next.y) / 2;
          ctx.quadraticCurveTo(tp.x, tp.y, mx, my);
        } else {
          ctx.lineTo(tp.x, tp.y);
        }
      }
      ctx.strokeStyle = hsl(em.hue - 5, 60, 80, alpha * 0.15);
      ctx.lineWidth = em.size * 0.15;
      ctx.stroke();
    }

    // Glow layer — larger warm halo
    ctx.beginPath();
    ctx.arc(em.x, em.y, coreR * 5, 0, Math.PI * 2);
    ctx.fillStyle = hsl(em.hue, 80, 55, alpha * 0.06 + beatPulse * 0.03);
    ctx.fill();

    // Mid glow
    ctx.beginPath();
    ctx.arc(em.x, em.y, coreR * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = hsl(em.hue, 85, 60, alpha * 0.12 + beatPulse * 0.05);
    ctx.fill();

    // Core — bright dot
    ctx.beginPath();
    ctx.arc(em.x, em.y, coreR, 0, Math.PI * 2);
    ctx.fillStyle = hsl(em.hue, sat, Math.min(95, lit), alpha);
    ctx.fill();

    // Hot white center on beat
    if (beatPulse > 0.3 && em.size > 1.5) {
      ctx.beginPath();
      ctx.arc(em.x, em.y, coreR * 0.4, 0, Math.PI * 2);
      ctx.fillStyle = hsl(em.hue - 10, 40, 95, alpha * beatPulse * 0.6);
      ctx.fill();
    }

    return true;
  });

  // ── Water surface — subtle shimmer line ──
  ctx.beginPath();
  for (let x = 0; x <= w; x += 3) {
    const waveY = waterY + Math.sin(x * 0.02 + time * 0.8) * 1.5 + Math.sin(x * 0.007 + time * 0.3) * 3;
    x === 0 ? ctx.moveTo(x, waveY) : ctx.lineTo(x, waveY);
  }
  ctx.strokeStyle = `rgba(255,180,80,${0.015 + overall * 0.02})`;
  ctx.lineWidth = 0.8;
  ctx.stroke();

  // ── Water warm glow from embers above ──
  const warmGlow = ctx.createLinearGradient(0, waterY, 0, h);
  warmGlow.addColorStop(0, `rgba(255,160,50,${0.03 + overall * 0.04 + bass * 0.02})`);
  warmGlow.addColorStop(0.5, `rgba(200,100,20,${0.01 + overall * 0.02})`);
  warmGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = warmGlow;
  ctx.fillRect(0, waterY, w, h - waterY);

  // ── Water ripples from embers hitting surface ──
  STATE.nakhwaWaterRipples = STATE.nakhwaWaterRipples.filter(rp => {
    rp.r += rp.speed;
    rp.alpha *= 0.95;
    if (rp.alpha < 0.002) return false;
    ctx.beginPath();
    ctx.ellipse(rp.x, rp.y, rp.r, rp.r * 0.3, 0, 0, Math.PI * 2);
    ctx.strokeStyle = hsl(rp.hue, 60, 55, rp.alpha);
    ctx.lineWidth = 0.5 + rp.alpha * 2;
    ctx.stroke();
    // Inner shimmer ring
    if (rp.r > 4) {
      ctx.beginPath();
      ctx.ellipse(rp.x, rp.y, rp.r * 0.5, rp.r * 0.5 * 0.3, 0, 0, Math.PI * 2);
      ctx.strokeStyle = hsl(rp.hue - 5, 50, 65, rp.alpha * 0.4);
      ctx.lineWidth = 0.3;
      ctx.stroke();
    }
    return true;
  });

  // ── Splash sparks — tiny embers bouncing up from water impact ──
  STATE.nakhwaSplashSparks = STATE.nakhwaSplashSparks.filter(sp => {
    sp.vy += 0.06; // gravity pulls back down
    sp.x += sp.vx;
    sp.y += sp.vy;
    sp.life -= sp.decay;
    if (sp.life <= 0 || sp.y > waterY + 5) return false;
    const sa = sp.life * sp.bright;
    // Tiny bright dot
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.size, 0, Math.PI * 2);
    ctx.fillStyle = hsl(sp.hue, 80, 70, sa);
    ctx.fill();
    // Micro glow
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, sp.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = hsl(sp.hue, 70, 55, sa * 0.15);
    ctx.fill();
    return true;
  });

  // ── Steam wisps — soft warm fog rising from impact point ──
  STATE.nakhwaSteam = STATE.nakhwaSteam.filter(st => {
    st.y += st.vy;
    st.x += st.vx + Math.sin(time * 2 + st.x * 0.01) * 0.15;
    st.size += 0.3; // expand as it rises
    st.life -= st.decay;
    if (st.life <= 0) return false;
    const sa = st.life * 0.04;
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size, 0, Math.PI * 2);
    ctx.fillStyle = hsl(st.hue, 40, 50, sa);
    ctx.fill();
    // Outer haze
    ctx.beginPath();
    ctx.arc(st.x, st.y, st.size * 1.8, 0, Math.PI * 2);
    ctx.fillStyle = hsl(st.hue + 10, 30, 40, sa * 0.3);
    ctx.fill();
    return true;
  });

  // ── Overall warm ambient glow on water ──
  const ambGlow = ctx.createLinearGradient(0, waterY, 0, h);
  ambGlow.addColorStop(0, `rgba(255,160,50,${0.02 + overall * 0.03 + bass * 0.02})`);
  ambGlow.addColorStop(1, `rgba(100,50,10,${0.005 + overall * 0.005})`);
  ctx.fillStyle = ambGlow;
  ctx.fillRect(0, waterY, w, h - waterY);

  // ── Faint stars in dark sky ──
  for (let i = 0; i < 15; i++) {
    const sx = (simplex.noise2D(i * 17.3, 0.1) * 0.5 + 0.5) * w;
    const sy = (simplex.noise2D(0.1, i * 13.7) * 0.5 + 0.5) * waterY * 0.5;
    const tw = 0.3 + Math.sin(time * 0.5 + i * 4.1) * 0.3;
    ctx.fillStyle = `rgba(200,180,150,${0.02 * tw + brill * 0.03})`;
    ctx.beginPath(); ctx.arc(sx, sy, 0.5 + tw * 0.5, 0, Math.PI * 2); ctx.fill();
  }

  // ── Wind-blown sparkles — tiny embers drifting on the breeze ──
  // These are lightweight procedural particles (no state, pure math)
  const sparkleCount = 40 + Math.floor(bass * 30);
  const windDir = Math.sin(time * 0.15) * 2 + mid * 3;
  for (let i = 0; i < sparkleCount; i++) {
    // Each sparkle has a unique phase from noise
    const seed = i * 7.31;
    const phase = simplex.noise2D(seed, time * 0.2);
    const phase2 = simplex.noise2D(seed + 100, time * 0.15);

    // Position — scattered across the scene, drifting with wind
    const baseX = (simplex.noise2D(seed, 0.5) * 0.5 + 0.5) * w;
    const baseY = (simplex.noise2D(0.5, seed) * 0.5 + 0.5) * waterY * 0.95;
    const sx = baseX + Math.sin(time * 0.8 + seed) * 30 + windDir * (10 + phase * 15);
    const sy = baseY + Math.cos(time * 0.5 + seed * 1.3) * 20 + phase2 * 15;

    // Wrap X
    const wx = ((sx % w) + w) % w;
    if (sy < 0 || sy > waterY) continue;

    // Twinkle — beat-reactive brightness
    const twinkle = Math.sin(time * 3 + seed * 5) * 0.5 + 0.5;
    const sparkAlpha = (0.03 + twinkle * 0.08 + beatPulse * 0.15 + brill * 0.06) * (0.5 + phase * 0.5);
    const sparkSize = 0.3 + twinkle * 0.8 + beatPulse * 0.5;
    const sparkHue = 30 + phase * 20;

    // Glow
    ctx.beginPath();
    ctx.arc(wx, sy, sparkSize * 3, 0, Math.PI * 2);
    ctx.fillStyle = hsl(sparkHue, 70, 60, sparkAlpha * 0.3);
    ctx.fill();

    // Core
    ctx.beginPath();
    ctx.arc(wx, sy, sparkSize, 0, Math.PI * 2);
    ctx.fillStyle = hsl(sparkHue, 80, 75 + beatPulse * 15, sparkAlpha);
    ctx.fill();
  }
}

// ─── 10. RING SPECTRUM — ฉัพพรรณรังสี Sun Ray from single origin ───
// 6 layers radiate from same center — inner short, outer long
// Each layer covers a frequency band range with per-bar harmonic stretching
let _ringSmooth = null;
let _ringBeatSmooth = 0;
let _ringDbSmooth = 0;

const AURA_LAYERS = [
  { name:"นีล",     rgb:[89,199,107],  bandStart:0,    bandEnd:0.17 },  // SubBass+Bass
  { name:"ปีต",     rgb:[235,204,51],  bandStart:0.14, bandEnd:0.33 },  // Bass+LowMid
  { name:"โลหิต",   rgb:[217,56,51],   bandStart:0.28, bandEnd:0.50 },  // LowMid+Mid
  { name:"โอทาต",   rgb:[220,225,235], bandStart:0.42, bandEnd:0.65 },  // Mid+HighMid
  { name:"มัญเชฐ",  rgb:[242,115,38],  bandStart:0.58, bandEnd:0.82 },  // HighMid+Presence
  { name:"ประภัสสร", rgb:[191,217,242], bandStart:0.75, bandEnd:1.00 },  // Presence+Brilliance
];

function renderRingSpectrum(ctx, w, h, t, bands) {
  const time = t * 0.001;
  const bass = bands.bass||0, sub = bands.subBass||0, mid = bands.mid||0;
  const highMid = bands.highMid||0, pres = bands.presence||0, brill = bands.brilliance||0;
  const overall = bands.overall||0, lowMid = bands.lowMid||0;
  const cx = w / 2, cy = h / 2;
  const PHI = 1.618033988749895;

  // Beat + dB smoothing
  const beatTarget = bass * 0.7 + sub * 0.3;
  _ringBeatSmooth += (beatTarget - _ringBeatSmooth) * (beatTarget > _ringBeatSmooth ? 0.3 : 0.04);
  _ringDbSmooth += (overall - _ringDbSmooth) * 0.06;
  const sceneBright = 0.4 + _ringDbSmooth * 0.6;
  const beatPulse = _ringBeatSmooth;

  // All 6 layers share same origin radius
  const minDim = Math.min(w, h);
  const originR = minDim * 0.06 + beatPulse * minDim * 0.01;
  const breathe = Math.sin(time * 0.25) * 3;

  // Bar count + smoothing
  const barCount = 90;
  if (!_ringSmooth || _ringSmooth.length !== barCount) _ringSmooth = new Array(barCount).fill(0);

  // 7-band values as array for interpolation
  const bandArr = [sub, bass, lowMid, mid, highMid, pres, brill];
  const bandPos = [0, 0.14, 0.28, 0.43, 0.57, 0.71, 0.86]; // normalized positions

  // Interpolate frequency value at any normalized position 0→1
  function freqAt(norm) {
    for (let b = 0; b < 6; b++) {
      if (norm <= bandPos[b + 1]) {
        const t = (norm - bandPos[b]) / (bandPos[b + 1] - bandPos[b]);
        return bandArr[b] * (1 - t) + bandArr[b + 1] * t;
      }
    }
    return bandArr[6];
  }

  // Smooth bar values
  for (let i = 0; i < barCount; i++) {
    const norm = i / barCount;
    let val = freqAt(norm);
    // Harmonic overtone modulation — adds complexity
    val += Math.sin(norm * Math.PI * 4 + time * 0.5) * 0.05 * mid;
    val += simplex.noise2D(i * 0.3 + time * 0.1, norm * 5) * 0.08;
    val = Math.max(0.01, Math.min(1, val));
    _ringSmooth[i] += (val - _ringSmooth[i]) * (val > _ringSmooth[i] ? 0.12 : 0.03);
  }

  const angleStep = (Math.PI * 2) / barCount;

  // ── Center core glow — white prismatic ──
  const coreGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, originR * 3);
  coreGlow.addColorStop(0, `rgba(255,250,240,${0.06 * sceneBright + beatPulse * 0.06})`);
  coreGlow.addColorStop(0.3, `rgba(220,200,180,${0.02 * sceneBright})`);
  coreGlow.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = coreGlow;
  ctx.beginPath(); ctx.arc(cx, cy, originR * 3, 0, Math.PI * 2); ctx.fill();

  // ── Draw 6 aura layers — all from same origin, different lengths ──
  for (let li = 0; li < 6; li++) {
    const layer = AURA_LAYERS[li];
    const [lr, lg, lb] = layer.rgb;

    // Each layer has increasing max length — inner shortest, outer longest
    // Uses golden ratio scaling for aesthetically pleasing proportions
    const layerLenScale = 0.3 + (li / 5) * 0.7; // 0.3 → 1.0
    const maxLen = minDim * 0.35 * layerLenScale * Math.pow(PHI, li * 0.15);
    const maxLenBeat = maxLen * (1 + beatPulse * 0.3);

    // Layer-specific rotation — Fibonacci angle offsets for non-repeating overlap
    const fibAngle = li * Math.PI * 2 * PHI; // golden angle separation
    const layerRot = time * (0.008 + li * 0.003) * (li % 2 === 0 ? 1 : -1) + fibAngle;

    // Which frequency range this layer covers
    const bStart = layer.bandStart;
    const bEnd = layer.bandEnd;
    const bRange = bEnd - bStart;

    // Layer overall energy
    const layerE = freqAt((bStart + bEnd) / 2);

    // ── Ring circle at origin ──
    ctx.beginPath();
    ctx.arc(cx, cy, originR + breathe, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${lr},${lg},${lb},${(0.02 + layerE * 0.04) * sceneBright})`;
    ctx.lineWidth = 0.3 + layerE * 0.5;
    ctx.stroke();

    // ── Sun rays — each bar modulated by complex math ──
    for (let i = 0; i < barCount; i++) {
      const barNorm = i / barCount; // 0→1 around circle
      const angle = i * angleStep + layerRot;

      // Map this bar to a position in this layer's frequency range
      const freqNorm = bStart + barNorm * bRange;
      const freqNormWrapped = ((freqNorm - 1) % 1 + 1) % 1; // wrap around
      const val = _ringSmooth[Math.floor(freqNormWrapped * barCount) % barCount];

      // ── Per-bar harmonic length modulation ──
      // Lissajous-inspired: each bar stretches differently based on
      // golden ratio harmonics of its angle
      const harmonic1 = Math.sin(angle * 3 * PHI + time * 0.4) * 0.15;
      const harmonic2 = Math.cos(angle * 5 * PHI * PHI + time * 0.25) * 0.08;
      const harmonic3 = Math.sin(angle * 7 + time * 0.15 * PHI) * 0.05;
      const harmonicMod = 1 + (harmonic1 + harmonic2 + harmonic3) * (0.5 + layerE);

      // Envelope: Perlin noise creates organic variation per-bar
      const noiseEnv = 0.7 + simplex.noise2D(
        Math.cos(angle) * 2 + time * 0.08,
        Math.sin(angle) * 2 + li * 3
      ) * 0.3;

      // Final bar length
      const barLen = val * maxLenBeat * harmonicMod * noiseEnv;
      if (barLen < 1) continue;

      // Start from origin
      const x1 = cx + Math.cos(angle) * (originR + breathe);
      const y1 = cy + Math.sin(angle) * (originR + breathe);
      const x2 = cx + Math.cos(angle) * (originR + breathe + barLen);
      const y2 = cy + Math.sin(angle) * (originR + breathe + barLen);

      // Alpha — brighter for higher values, scaled by dB
      const barAlpha = (0.08 + val * 0.25 + beatPulse * 0.1) * sceneBright * (0.6 + layerLenScale * 0.4);

      // ── Pass 1: Wide soft glow ray ──
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${barAlpha * 0.3})`;
      ctx.lineWidth = 4 + val * 5 + beatPulse * 3;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Pass 2: Sharp core ray ──
      ctx.beginPath();
      ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
      ctx.strokeStyle = `rgba(${lr},${lg},${lb},${barAlpha})`;
      ctx.lineWidth = 1 + val * 2;
      ctx.lineCap = "round";
      ctx.stroke();

      // ── Tip bloom — bright end point ──
      if (val > 0.2) {
        const tipR = 1 + val * 2.5 + beatPulse * 1.5;
        ctx.beginPath();
        ctx.arc(x2, y2, tipR, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${Math.min(255,lr+60)},${Math.min(255,lg+60)},${Math.min(255,lb+60)},${barAlpha * 0.5})`;
        ctx.fill();
      }
    }

    // ── Layer halo — soft radial glow at layer's average reach ──
    const avgReach = originR + maxLenBeat * layerE * 0.5;
    const haloGrad = ctx.createRadialGradient(cx, cy, avgReach * 0.7, cx, cy, avgReach * 1.3);
    haloGrad.addColorStop(0, `rgba(${lr},${lg},${lb},${0.004 * sceneBright + layerE * 0.006})`);
    haloGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = haloGrad;
    ctx.beginPath(); ctx.arc(cx, cy, avgReach * 1.3, 0, Math.PI * 2); ctx.fill();
  }

  // ── ประภัสสร outer shimmer — prismatic rainbow particles ──
  for (let i = 0; i < 30; i++) {
    const seed = i * 7.13;
    const orbitR = originR + minDim * 0.35 * (0.5 + simplex.noise2D(seed, time * 0.1) * 0.5);
    const pAngle = time * 0.04 * (i % 2 === 0 ? 1 : -1) + seed;
    const wobble = simplex.noise2D(seed + 50, time * 0.3) * 8;
    const px = cx + Math.cos(pAngle) * (orbitR + wobble);
    const py = cy + Math.sin(pAngle) * (orbitR + wobble);
    const rainbowHue = (pAngle * 180 / Math.PI + time * 20) % 360;
    const tw = 0.5 + Math.sin(time * 2 + seed * 3) * 0.5;
    const pAlpha = tw * 0.06 * sceneBright + beatPulse * 0.03;
    const pSize = 0.5 + tw * 1.5 + beatPulse * 1;
    // Prismatic glow
    ctx.beginPath();
    ctx.arc(px, py, pSize * 3, 0, Math.PI * 2);
    ctx.fillStyle = hsl(rainbowHue, 60, 65, pAlpha * 0.4);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, pSize, 0, Math.PI * 2);
    ctx.fillStyle = hsl(rainbowHue, 70, 75, pAlpha);
    ctx.fill();
  }

  // ── Center beat flash — white pulse ──
  if (beatPulse > 0.2) {
    const pulseR = originR * (1.5 + beatPulse * 2);
    const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, pulseR);
    pg.addColorStop(0, `rgba(255,250,240,${0.06 * beatPulse * sceneBright})`);
    pg.addColorStop(0.5, `rgba(255,220,180,${0.02 * beatPulse * sceneBright})`);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.beginPath(); ctx.arc(cx, cy, pulseR, 0, Math.PI * 2); ctx.fill();
  }
}
const RENDER_MAP = {
  ethereal_breath: renderLuminousDrift,
  liquid_aurora: renderSilkRibbons,
  sacred_geometry: renderHyperPolyhedra,
  cosmic_flow: renderCosmicFlow,
  deep_ocean: renderDeepOcean,
  nebula_consciousness: renderPlasmaNebula,
  rain_drops: renderRainDrops,
  audio_spectrum: renderAmbientSpectrum,
  nakhwa_fire: renderNakhwaFire,
  ring_spectrum: renderRingSpectrum,
};

const TRAIL_MODES = new Set(["cosmic_flow"]);

/* ═══════════════════════════════════════════════════════════
   SONG TITLE
   ═══════════════════════════════════════════════════════════ */
function renderSongTitle(ctx, w, h, title, title2, bands, t, pos, fontSizePct, fontSizePct2) {
  if (!title && !title2) return;
  const time = t * 0.001;
  const bass = bands.bass||0, overall = bands.overall||0, brill = bands.brilliance||0, mid = bands.mid||0;
  const sub = bands.subBass||0, pres = bands.presence||0;
  const breathe = Math.sin(time * 0.2) * 4;

  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const calcFs = (text, pct) => {
    if (!text) return null;
    const targetW = w * (pct / 100);
    let fs = Math.round(w * 0.18);
    ctx.font = `800 ${fs}px "Sarabun", "Cormorant Garamond", sans-serif`;
    let measured = ctx.measureText(text).width;
    if (measured > targetW && measured > 0) fs = Math.round(fs * (targetW / measured));
    fs = Math.max(16, Math.min(fs, h * 0.35));
    ctx.font = `800 ${fs}px "Sarabun", "Cormorant Garamond", sans-serif`;
    measured = ctx.measureText(text).width;
    return { fs, measured, textH: fs * 0.85 };
  };

  const line1 = calcFs(title, fontSizePct);
  const line2 = calcFs(title2, fontSizePct2);

  const gap = line1 && line2 ? Math.max(line1.fs, line2.fs) * 0.2 : 0;
  const totalH = (line1 ? line1.textH : 0) + gap + (line2 ? line2.textH : 0);
  const maxMeasured = Math.max(line1 ? line1.measured : 0, line2 ? line2.measured : 0);

  const pad = Math.max((line1 ? line1.fs : line2 ? line2.fs : 40) * 0.6, 40);
  const posMap = {
    "top-left":      { x: pad + maxMeasured/2,    y: pad + totalH/2 },
    "top-center":    { x: w/2,                     y: pad + totalH/2 },
    "top-right":     { x: w - pad - maxMeasured/2, y: pad + totalH/2 },
    "middle-left":   { x: pad + maxMeasured/2,    y: h/2 },
    "middle-center": { x: w/2,                     y: h/2 },
    "middle-right":  { x: w - pad - maxMeasured/2, y: h/2 },
    "bottom-left":   { x: pad + maxMeasured/2,    y: h - pad - totalH/2 },
    "bottom-center": { x: w/2,                     y: h - pad - totalH/2 },
    "bottom-right":  { x: w - pad - maxMeasured/2, y: h - pad - totalH/2 },
  };
  const anchor = posMap[pos] || posMap["bottom-center"];
  const centerX = anchor.x;
  const centerY = anchor.y + breathe;

  const y1 = line1 && line2 ? centerY - totalH/2 + line1.textH/2 : centerY;
  const y2 = line1 && line2 ? centerY + totalH/2 - line2.textH/2 : centerY;

  const drawLine = (text, info, ty) => {
    if (!text || !info) return;
    const { fs, measured, textH } = info;
    ctx.font = `800 ${fs}px "Sarabun", "Cormorant Garamond", sans-serif`;

    // ── Layer 1: Deep ambient haze — wide blur ──
    ctx.shadowColor = `rgba(255,255,255,${0.04 + overall * 0.05})`;
    ctx.shadowBlur = 50 + bass * 40;
    ctx.fillStyle = `rgba(150,150,150,${0.01 + overall * 0.01})`;
    ctx.fillText(text, centerX, ty);
    ctx.shadowBlur = 0;

    // ── Layer 2: Drop shadow — offset dark for depth ──
    const shadowOff = 2 + bass * 3;
    ctx.fillStyle = `rgba(0,0,0,${0.15 + overall * 0.1})`;
    ctx.fillText(text, centerX + shadowOff, ty + shadowOff);

    // ── Layer 3: Back-light glow stroke ──
    ctx.strokeStyle = `rgba(180,200,220,${0.03 + brill * 0.06 + bass * 0.03})`;
    ctx.lineWidth = 3 + bass * 2;
    ctx.strokeText(text, centerX, ty);

    // ── Layer 4: Main horizontal gradient ──
    const gradShift = Math.sin(time * 0.15) * 0.15 + mid * 0.1;
    const tg = ctx.createLinearGradient(centerX - measured/2, 0, centerX + measured/2, 0);
    const bL = 40 + overall * 25, pL = 70 + brill * 25;
    const mA = 0.15 + overall * 0.3 + bass * 0.1;
    tg.addColorStop(0, `rgba(${bL},${bL},${bL},${mA*0.3})`);
    tg.addColorStop(Math.max(0,Math.min(1,0.1+gradShift)), `rgba(${bL+20},${bL+20},${bL+20},${mA*0.6})`);
    tg.addColorStop(Math.max(0,Math.min(1,0.35+gradShift+bass*0.1)), `rgba(${pL},${pL},${pL},${mA})`);
    tg.addColorStop(Math.max(0,Math.min(1,0.65-gradShift+mid*0.05)), `rgba(${pL-10},${pL-10},${pL-10},${mA*0.9})`);
    tg.addColorStop(Math.max(0,Math.min(1,0.9-gradShift)), `rgba(${bL+15},${bL+15},${bL+15},${mA*0.5})`);
    tg.addColorStop(1, `rgba(${bL},${bL},${bL},${mA*0.2})`);
    ctx.fillStyle = tg; ctx.fillText(text, centerX, ty);

    // ── Layer 5: Vertical top-light — 3D depth ──
    const vg = ctx.createLinearGradient(0, ty - textH/2, 0, ty + textH/2);
    const va = 0.06 + pres * 0.1;
    vg.addColorStop(0, `rgba(220,220,220,${va})`);
    vg.addColorStop(0.35, `rgba(150,150,150,${va*0.4})`);
    vg.addColorStop(0.65, `rgba(80,80,80,${va*0.1})`);
    vg.addColorStop(1, "rgba(40,40,40,0)");
    ctx.fillStyle = vg; ctx.fillText(text, centerX, ty);

    // ── Layer 6: Inner light highlight ──
    ctx.fillStyle = `rgba(255,255,255,${0.03 + brill * 0.08 + bass * 0.04})`;
    ctx.fillText(text, centerX, ty - 0.5);

    // ── Layer 7: Fine edge outline ──
    ctx.strokeStyle = `rgba(200,200,200,${0.02 + overall * 0.03})`;
    ctx.lineWidth = 0.5;
    ctx.strokeText(text, centerX, ty);

    // ── Layer 8: Beat flash ──
    if (bass > 0.4) {
      ctx.fillStyle = `rgba(255,255,255,${(bass - 0.4) * 0.15})`;
      ctx.fillText(text, centerX, ty);
    }
  };

  if (line1) drawLine(title, line1, line2 ? y1 : centerY);
  if (line2) drawLine(title2, line2, line1 ? y2 : centerY);

  // ── Enhanced multi-layer reflection ──
  const refInfo = line2 || line1;
  const refText = title2 || title;
  const refTy = line2 ? y2 : centerY;
  if (refInfo) {
    const refY = refTy + refInfo.textH * 0.5;
    ctx.save();
    ctx.translate(0, refY); ctx.scale(1, -1); ctx.translate(0, -refY);
    ctx.font = `800 ${refInfo.fs}px "Sarabun", "Cormorant Garamond", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // Vertical fade: bright near original, fading away
    const rg = ctx.createLinearGradient(0, refTy - refInfo.textH*0.4, 0, refTy + refInfo.textH*0.4);
    rg.addColorStop(0, "rgba(60,60,60,0)");
    rg.addColorStop(0.5, `rgba(120,120,120,${0.02 + overall * 0.03})`);
    rg.addColorStop(1, `rgba(180,180,180,${0.05 + overall * 0.06})`);
    ctx.fillStyle = rg; ctx.fillText(refText, centerX, refTy);
    // Horizontal shimmer on reflection
    const rg2 = ctx.createLinearGradient(centerX - refInfo.measured/2, 0, centerX + refInfo.measured/2, 0);
    const rShift = Math.sin(time * 0.2) * 0.2;
    rg2.addColorStop(0, "rgba(100,100,100,0)");
    rg2.addColorStop(Math.max(0,Math.min(1,0.4+rShift)), `rgba(140,140,140,${0.02 + overall * 0.02})`);
    rg2.addColorStop(Math.max(0,Math.min(1,0.6-rShift)), `rgba(140,140,140,${0.02 + overall * 0.02})`);
    rg2.addColorStop(1, "rgba(100,100,100,0)");
    ctx.fillStyle = rg2; ctx.fillText(refText, centerX, refTy);
    ctx.restore();
  }

  ctx.restore();
}

/* ═══════════════════════════════════════════════════════════
   DOWNLOAD HELPER — triggers immediately, no popup needed
   ═══════════════════════════════════════════════════════════ */
function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.target = "_self";
  a.rel = "noopener";
  a.style.display = "none";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Don't revoke immediately — browser needs time to start download
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ═══════════════════════════════════════════════════════════
   BUTTON COMPONENT (outside App to prevent remount on re-render)
   ═══════════════════════════════════════════════════════════ */
const Btn=({children,primary,disabled,onClick,sx})=>(
  <button onClick={onClick} disabled={disabled} style={{
    background:primary?(disabled?"#1A1814":"linear-gradient(135deg,#D4AF37,#B8973A)"):"transparent",
    color:primary?(disabled?"#6A6050":"#080604"):"#C8C4BE",
    border:primary?"none":"1px solid #2A2520",padding:"12px 32px",borderRadius:6,fontSize:15,
    fontFamily:"'Sarabun',sans-serif",fontWeight:primary?600:400,
    cursor:disabled?"default":"pointer",letterSpacing:0.5,transition:"all 0.3s",...sx
  }}>{children}</button>
);

/* ═══════════════════════════════════════════════════════════
   MAIN APP
   ═══════════════════════════════════════════════════════════ */
export default function App() {
  const [motion, setMotion] = useState(null);
  const [audioFile, setAudioFile] = useState(null);
  const [audioName, setAudioName] = useState("");
  const [songTitle, setSongTitle] = useState("");
  const [songTitle2, setSongTitle2] = useState("");
  const [loops, setLoops] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportProg, setExportProg] = useState(0);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [downloadName, setDownloadName] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [resolution, setResolution] = useState("1080p");
  const [step, setStep] = useState(1);
  const [showTitle, setShowTitle] = useState(true);
  const [bandLevels, setBandLevels] = useState(null);
  const [titlePos, setTitlePos] = useState("bottom-center");
  const [titleFontSize, setTitleFontSize] = useState(50);
  const [titleFontSize2, setTitleFontSize2] = useState(30);
  const [endLogo, setEndLogo] = useState(null); // HTMLImageElement

  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const audioBufferRef = useRef(null);
  const fileRef = useRef(null);
  const startTRef = useRef(0);
  const exportTimerRef = useRef(null);
  const downloadBlobRef = useRef(null);

  const RES = {"720p":[1280,720],"1080p":[1920,1080],"1440p":[2560,1440]};

  // Stop preview/audio only — does NOT touch exporting state
  const stopPreviewOnly = useCallback(() => {
    if (animRef.current) cancelAnimationFrame(animRef.current); animRef.current = null;
    if (exportTimerRef.current) { cancelAnimationFrame(exportTimerRef.current); clearTimeout(exportTimerRef.current); } exportTimerRef.current = null;
    if (sourceRef.current) { try{sourceRef.current.stop()}catch(e){} sourceRef.current=null; }
    setPlaying(false); setBandLevels(null); resetState();
  }, []);

  // Full stop including exporting reset
  const stopAll = useCallback(() => {
    stopPreviewOnly();
    setExporting(false);
  }, [stopPreviewOnly]);

  const startPreview = useCallback(() => {
    if (!motion) return; stopAll();
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const [cw,ch] = RES[resolution]; canvas.width=cw; canvas.height=ch;
    const renderFn = RENDER_MAP[motion]; if (!renderFn) return;
    let analyser=null, sampleRate=44100;
    if (audioBufferRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const actx = audioCtxRef.current; sampleRate=actx.sampleRate;
      analyser = actx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.82;
      const src = actx.createBufferSource(); src.buffer=audioBufferRef.current; src.loop=true;
      src.connect(analyser); analyser.connect(actx.destination);
      src.start(0); sourceRef.current=src;
    }
    const useTrail = TRAIL_MODES.has(motion);
    startTRef.current=0; let fc=0;
    const loop = (ts) => {
      if (!startTRef.current) startTRef.current=ts;
      const elapsed = ts-startTRef.current;
      const bands = analyzeBands(analyser, sampleRate);
      if (fc%3===0) setBandLevels(bands);
      if (useTrail) { ctx.fillStyle="rgba(0,0,0,0.08)"; ctx.fillRect(0,0,cw,ch); }
      else { ctx.fillStyle="#000"; ctx.fillRect(0,0,cw,ch); }
      renderFn(ctx,cw,ch,elapsed,bands);
      if (showTitle) renderSongTitle(ctx,cw,ch,songTitle||audioName,songTitle2,bands,elapsed,titlePos,titleFontSize,titleFontSize2);
      fc++; animRef.current=requestAnimationFrame(loop);
    };
    animRef.current=requestAnimationFrame(loop); setPlaying(true);
  }, [motion,resolution,audioName,songTitle,songTitle2,showTitle,titlePos,titleFontSize,titleFontSize2,stopAll]);

  const handleFile = useCallback(async(file) => {
    if (!file || !file.type.startsWith("audio/")) return;
    setAudioFile(file); setAudioName(file.name);
    setSongTitle(file.name.replace(/\.[^/.]+$/,"").replace(/[-_]/g," "));
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    audioBufferRef.current = await audioCtxRef.current.decodeAudioData(await file.arrayBuffer());
  },[]);

  const handleLogoFile = useCallback((file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const img = new Image();
    img.onload = () => setEndLogo(img);
    img.src = URL.createObjectURL(file);
  },[]);

  const generateCover = useCallback(() => {
    const src = canvasRef.current;
    if (!src) return;

    const cw = 1280, ch = 720;
    const cover = document.createElement("canvas");
    cover.width = cw; cover.height = ch;
    const ctx = cover.getContext("2d");

    ctx.drawImage(src, 0, 0, cw, ch);

    // Vignette
    const vig = ctx.createRadialGradient(cw/2, ch/2, cw*0.25, cw/2, ch/2, cw*0.7);
    vig.addColorStop(0, "rgba(0,0,0,0)");
    vig.addColorStop(1, "rgba(0,0,0,0.5)");
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, cw, ch);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const tx = cw / 2;

    const title1 = songTitle || audioName || "Relaxation";
    const title2Text = songTitle2 || "";

    // Calculate font sizes
    const calcCoverFs = (text, pct) => {
      let fs = Math.round(cw * 0.15);
      ctx.font = `800 ${fs}px "Sarabun", sans-serif`;
      let m = ctx.measureText(text).width;
      const target = cw * (pct / 100);
      if (m > target && m > 0) fs = Math.round(fs * (target / m));
      fs = Math.max(16, Math.min(fs, ch * 0.35));
      ctx.font = `800 ${fs}px "Sarabun", sans-serif`;
      m = ctx.measureText(text).width;
      return { fs, measured: m, textH: fs * 0.85 };
    };

    const l1 = calcCoverFs(title1, titleFontSize);
    const l2 = title2Text ? calcCoverFs(title2Text, titleFontSize2) : null;
    const gap = l2 ? Math.max(l1.fs, l2.fs) * 0.15 : 0;
    const totalH = l1.textH + gap + (l2 ? l2.textH : 0);
    const cy2 = ch / 2;
    const y1 = l2 ? cy2 - totalH/2 + l1.textH/2 : cy2;
    const y2 = l2 ? cy2 + totalH/2 - l2.textH/2 : 0;

    // Draw function for cover text
    const drawCoverLine = (text, info, ty) => {
      ctx.font = `800 ${info.fs}px "Sarabun", sans-serif`;
      // Shadow
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 40; ctx.shadowOffsetY = 4;
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillText(text, tx, ty + 3);
      ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
      // Gradient fill
      const tg = ctx.createLinearGradient(tx - info.measured/2, ty - info.fs/2, tx + info.measured/2, ty + info.fs/2);
      tg.addColorStop(0, "rgba(255,255,255,0.95)");
      tg.addColorStop(0.4, "rgba(220,220,220,0.9)");
      tg.addColorStop(0.7, "rgba(180,180,180,0.85)");
      tg.addColorStop(1, "rgba(140,140,140,0.8)");
      ctx.fillStyle = tg; ctx.fillText(text, tx, ty);
      // Highlight
      const hg = ctx.createLinearGradient(0, ty - info.fs*0.4, 0, ty);
      hg.addColorStop(0, "rgba(255,255,255,0.3)");
      hg.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = hg; ctx.fillText(text, tx, ty);
      // Stroke
      ctx.strokeStyle = "rgba(255,255,255,0.12)";
      ctx.lineWidth = 1; ctx.strokeText(text, tx, ty);
    };

    drawCoverLine(title1, l1, y1);
    if (l2 && title2Text) drawCoverLine(title2Text, l2, y2);

    // Reflection from bottom line
    const refInfo = l2 || l1;
    const refText = title2Text || title1;
    const refTy = l2 ? y2 : y1;
    const refY = refTy + refInfo.textH * 0.5;
    ctx.save();
    ctx.translate(0, refY); ctx.scale(1, -1); ctx.translate(0, -refY);
    ctx.font = `800 ${refInfo.fs}px "Sarabun", sans-serif`;
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    // Gradient reversed because we're in flipped context
    // In mirrored space: top of text = far from original = should be faint
    //                    bottom of text = close to original = should be brighter
    const rg = ctx.createLinearGradient(0, refTy - refInfo.textH*0.4, 0, refTy + refInfo.textH*0.4);
    rg.addColorStop(0, "rgba(80,80,80,0)");        // top in mirror = far = invisible
    rg.addColorStop(1, "rgba(200,200,200,0.15)");   // bottom in mirror = close = visible
    ctx.fillStyle = rg; ctx.fillText(refText, tx, refTy);
    ctx.restore();

    cover.toBlob((blob) => {
      if (!blob) return;
      const fname = `${(songTitle||"cover").replace(/\s+/g,"-")}-cover.png`;
      downloadBlobRef.current = { blob, name: fname };
      triggerDownload(blob, fname);
      // Show popup AFTER download starts (delay prevents interference)
      setTimeout(() => {
        const url = URL.createObjectURL(blob);
        setDownloadUrl(url);
        setDownloadName(fname);
      }, 500);
    }, "image/png");
  }, [songTitle, songTitle2, audioName, titleFontSize, titleFontSize2]);

  const handleExport = useCallback(async() => {
    if (!motion) return;
    setExporting(true); setExportProg(0); stopPreviewOnly();
    let rec = null;
    try {
    const [cw,ch]=RES[resolution]; const off=document.createElement("canvas");
    off.width=cw; off.height=ch; const octx=off.getContext("2d");
    const renderFn=RENDER_MAP[motion];
    const dur = audioBufferRef.current?audioBufferRef.current.duration:60;
    const totalDur=dur*loops; const stream=off.captureStream(30);
    let analyser=null,sampleRate=44100;
    let hasAudio = false;
    let exportGain = null;
    if (audioBufferRef.current) {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
      const actx=audioCtxRef.current;
      await actx.resume();
      sampleRate=actx.sampleRate;
      analyser=actx.createAnalyser(); analyser.fftSize=2048; analyser.smoothingTimeConstant=0.82;
      exportGain=actx.createGain(); exportGain.gain.value=1;
      const dest=actx.createMediaStreamDestination();
      const src=actx.createBufferSource(); src.buffer=audioBufferRef.current; src.loop=true;
      src.connect(analyser); analyser.connect(exportGain);
      exportGain.connect(dest); exportGain.connect(actx.destination);
      src.start(0); sourceRef.current=src;
      dest.stream.getAudioTracks().forEach(t=>stream.addTrack(t));
      hasAudio = stream.getAudioTracks().length > 0;
    }
    const mimeType = hasAudio ? "video/webm;codecs=vp9,opus" : "video/webm;codecs=vp9";
    rec=new MediaRecorder(stream,{mimeType,videoBitsPerSecond:30000000});
    const chunks=[]; rec.ondataavailable=e=>{if(e.data.size>0)chunks.push(e.data)};
    const done=new Promise(r=>{rec.onstop=r}); rec.start(100);
    const useTrail=TRAIL_MODES.has(motion); resetState();
    const visCanvas=canvasRef.current;
    const visCtx=visCanvas?visCanvas.getContext("2d"):null;
    if(visCanvas){visCanvas.width=cw;visCanvas.height=ch;}
    const exportStartTime = Date.now();
    const totalMs = totalDur * 1000;
    let lastProgUpdate = 0;
    await new Promise((resolveRender)=>{
      const render=()=>{
        const elapsed = Date.now() - exportStartTime;
        if(elapsed >= totalMs){
          try{rec.stop();}catch(e){}
          if(sourceRef.current){try{sourceRef.current.stop()}catch(e){}sourceRef.current=null;}
          resolveRender(); return;
        }
        const t = elapsed;
        const bands=analyzeBands(analyser,sampleRate);
        if(useTrail){octx.fillStyle="rgba(0,0,0,0.08)";octx.fillRect(0,0,cw,ch)}
        else{octx.fillStyle="#000";octx.fillRect(0,0,cw,ch)}
        renderFn(octx,cw,ch,t,bands);
        if(showTitle)renderSongTitle(octx,cw,ch,songTitle||audioName,songTitle2,bands,t,titlePos,titleFontSize,titleFontSize2);
        const fadeMs = 15000;
        const remaining = totalMs - elapsed;
        if(remaining < fadeMs){
          const fadeAlpha = 1 - (remaining / fadeMs);
          octx.fillStyle = `rgba(0,0,0,${fadeAlpha})`;
          octx.fillRect(0,0,cw,ch);
          if(exportGain) exportGain.gain.value = 1 - fadeAlpha;
          if(endLogo && remaining < fadeMs * 0.67){
            const logoFadeIn = 1 - (remaining / (fadeMs * 0.67));
            const logoAlpha = Math.min(1, logoFadeIn * 2) * (1 - Math.max(0, logoFadeIn - 0.7) / 0.3);
            const maxLogoH = ch * 0.2;
            const logoScale = Math.min(maxLogoH / endLogo.height, (cw * 0.3) / endLogo.width);
            const logoW = endLogo.width * logoScale;
            const logoH = endLogo.height * logoScale;
            octx.globalAlpha = logoAlpha * 0.9;
            octx.drawImage(endLogo, (cw - logoW)/2, (ch - logoH)/2, logoW, logoH);
            octx.globalAlpha = 1;
          }
        }
        if(visCtx)visCtx.drawImage(off,0,0);
        // Throttle progress updates to avoid React re-render overhead
        if(elapsed - lastProgUpdate > 500){
          lastProgUpdate = elapsed;
          setExportProg(Math.min(100, Math.round((elapsed / totalMs) * 100)));
        }
        // Use requestAnimationFrame for smooth frame pacing (browser VSync)
        exportTimerRef.current = requestAnimationFrame(render);
      };
      exportTimerRef.current = requestAnimationFrame(render);
    });
    await done;
    console.log("Export done. Chunks:", chunks.length, "Total size:", chunks.reduce((s,c)=>s+c.size,0));
    if(chunks.length === 0){
      console.error("No data recorded!");
      return;
    }
    const blob=new Blob(chunks,{type:"video/webm"});
    console.log("Blob size:", blob.size);
    const fname=`${(songTitle||"relaxation-mv").replace(/\s+/g,"-")}-${motion}.webm`;
    downloadBlobRef.current = { blob, name: fname };
    const url=URL.createObjectURL(blob);
    setDownloadUrl(url);
    setDownloadName(fname);
    } catch(err) {
      console.error("Export error:", err);
      if(rec && rec.state==="recording") try{rec.stop();}catch(e){}
      if(sourceRef.current){try{sourceRef.current.stop()}catch(e){}sourceRef.current=null;}
    } finally {
      setExporting(false);
      exportTimerRef.current = null;
    }
  },[motion,loops,resolution,audioName,songTitle,songTitle2,showTitle,titlePos,titleFontSize,titleFontSize2,endLogo,stopPreviewOnly]);

  useEffect(()=>()=>stopAll(),[stopAll]);

  // Set canvas size when step 3 loads
  useEffect(()=>{
    if(step===3 && canvasRef.current){
      const [cw,ch]=RES[resolution];
      canvasRef.current.width=cw;
      canvasRef.current.height=ch;
      const ctx=canvasRef.current.getContext("2d");
      ctx.fillStyle="#000";
      ctx.fillRect(0,0,cw,ch);
    }
  },[step,resolution]);

  const mData = MOTIONS.find(m=>m.id===motion);
  const bandNames=["Sub","Bass","Low","Mid","Hi","Pres","Air"];
  const bandKeys=["subBass","bass","lowMid","mid","highMid","presence","brilliance"];

  const gold = (a=1) => `rgba(212,175,55,${a})`;

  return (
    <div style={{minHeight:"100vh",background:"#030201",color:"#F0EDE8",fontFamily:"'Cormorant Garamond','Sarabun',Georgia,serif",position:"relative",overflowY:"auto"}}>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300&family=Sarabun:wght@200;300;400;600&display=swap" rel="stylesheet"/>
      <div style={{position:"absolute",inset:0,pointerEvents:"none",zIndex:0,background:"radial-gradient(ellipse at 30% 20%,rgba(212,175,55,0.015) 0%,transparent 50%),radial-gradient(ellipse at 70% 80%,rgba(139,110,199,0.01) 0%,transparent 50%)"}}/>
      <div style={{position:"relative",zIndex:1,maxWidth:1100,margin:"0 auto",padding:"36px 20px"}}>

        <header style={{textAlign:"center",marginBottom:48}}>
          <div style={{fontSize:16,letterSpacing:10,textTransform:"uppercase",color:gold(0.4),marginBottom:14,fontFamily:"'Sarabun'",fontWeight:200}}>◈ &nbsp; Audio-Reactive Generative Art &nbsp; ◈</div>
          <h1 style={{fontSize:38,fontWeight:300,margin:0,letterSpacing:3,background:"linear-gradient(135deg,#D4AF37 0%,#F5E6A3 40%,#D4AF37 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>Relaxation MV Studio</h1>
          <p style={{fontSize:17,fontWeight:200,color:"#B0AAA2",marginTop:10,fontFamily:"'Sarabun'"}}>Real-time FFT × 7 Frequency Bands × Simplex Noise × Multi-body Physics</p>
        </header>

        <div style={{display:"flex",justifyContent:"center",gap:32,marginBottom:44}}>
          {[{n:1,l:"Visual"},{n:2,l:"Audio & Title"},{n:3,l:"Preview"}].map(st=>(
            <div key={st.n} onClick={()=>{if(st.n===1||(st.n>=2&&motion))setStep(st.n)}} style={{display:"flex",alignItems:"center",gap:8,cursor:"pointer",opacity:step>=st.n?1:0.25,transition:"all 0.4s"}}>
              <div style={{width:28,height:28,borderRadius:"50%",border:step===st.n?"1px solid "+gold(0.6):"1px solid #1E1C18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,fontFamily:"'Sarabun'",background:step===st.n?"rgba(212,175,55,0.06)":"transparent",color:step===st.n?gold(0.8):"#4A4030"}}>{st.n}</div>
              <span style={{fontSize:16,fontFamily:"'Sarabun'",fontWeight:300,color:step===st.n?gold(0.7):"#4A4030"}}>{st.l}</span>
            </div>
          ))}
        </div>

        {step===1&&(
          <div>
            <p style={{textAlign:"center",fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:32}}>
              ทุก Motion มีการเคลื่อนไหวเฉพาะตัว — Orbits, Fluid Physics, 3D Projection, Flow Field, Wave Interference, Spiral Vortex
            </p>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(320px,1fr))",gap:12}}>
              {MOTIONS.map(m=>{
                const sel=motion===m.id;
                const accent=`rgb(${m.palette[1].join(",")})`;
                return(
                  <div key={m.id} onClick={()=>setMotion(m.id)} style={{
                    border:sel?`1px solid ${accent}`:"1px solid #0E0D0B",borderRadius:10,
                    padding:"20px 18px",cursor:"pointer",transition:"all 0.4s",position:"relative",
                    background:sel?`linear-gradient(135deg,rgba(${m.palette[1].join(",")},0.05),rgba(${m.palette[2].join(",")},0.02))`:"rgba(8,6,4,0.7)",
                  }}>
                    <div style={{display:"flex",gap:12}}>
                      <div style={{fontSize:24,color:accent,lineHeight:1,marginTop:2,textShadow:`0 0 25px rgba(${m.palette[1].join(",")},0.3)`,flexShrink:0}}>{m.icon}</div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontSize:16,fontWeight:400,color:"#F0EDE8",marginBottom:1}}>{m.name}</div>
                        <div style={{fontSize:17,color:accent,fontFamily:"'Sarabun'",fontWeight:200,marginBottom:8,opacity:0.8}}>{m.nameTh}</div>
                        <p style={{fontSize:16,color:"#B0AAA2",lineHeight:1.7,margin:"0 0 8px",fontFamily:"'Sarabun'",fontWeight:300}}>{m.desc}</p>
                        <div style={{fontSize:16,color:"#8A8478",fontStyle:"italic"}}>⟡ {m.research}</div>
                      </div>
                    </div>
                    {sel&&<div style={{position:"absolute",top:10,right:14,fontSize:16,color:accent,fontFamily:"'Sarabun'"}}>✓</div>}
                  </div>
                );
              })}
            </div>
            <div style={{textAlign:"center",marginTop:36}}><Btn primary disabled={!motion} onClick={()=>motion&&setStep(2)}>ถัดไป →</Btn></div>
          </div>
        )}

        {step===2&&(
          <div style={{maxWidth:580,margin:"0 auto"}}>
            <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)}
              onDrop={e=>{e.preventDefault();setDragOver(false);e.dataTransfer.files[0]&&handleFile(e.dataTransfer.files[0])}}
              onClick={()=>fileRef.current?.click()}
              style={{border:dragOver?"1px solid "+gold(0.6):audioFile?"1px solid #1E1C18":"1px dashed #1A1814",borderRadius:12,padding:"48px 28px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(212,175,55,0.03)":"rgba(8,6,4,0.7)",transition:"all 0.4s"}}>
              <input ref={fileRef} type="file" accept=".mp3,.wav,.flac,.ogg,.aac,.m4a,.wma,.opus,audio/mpeg,audio/wav,audio/flac,audio/ogg,audio/aac,audio/mp4,audio/*" style={{display:"none"}} onChange={e=>e.target.files[0]&&handleFile(e.target.files[0])}/>
              {audioFile?(
                <div>
                  <div style={{fontSize:28,color:gold(0.6),marginBottom:10}}>♪</div>
                  <div style={{fontSize:17,color:"#F0EDE8"}}>{audioName}</div>
                  <div style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",marginTop:4}}>
                    {audioBufferRef.current?`${Math.floor(audioBufferRef.current.duration/60)}:${String(Math.floor(audioBufferRef.current.duration%60)).padStart(2,"0")} · ${audioBufferRef.current.numberOfChannels}ch · ${audioBufferRef.current.sampleRate/1000}kHz`:"decoding..."}
                  </div>
                  <div style={{fontSize:17,color:gold(0.4),fontFamily:"'Sarabun'",fontWeight:200,marginTop:10}}>คลิกเพื่อเปลี่ยนไฟล์</div>
                </div>
              ):(
                <div>
                  <div style={{fontSize:36,color:"#5A5448",marginBottom:14}}>◈</div>
                  <div style={{fontSize:16,color:"#9A948C"}}>ลากไฟล์เพลงมาวางที่นี่</div>
                  <div style={{fontSize:17,color:"#7A746C",fontFamily:"'Sarabun'",marginTop:6}}>MP3 · WAV · FLAC · OGG · AAC</div>
                </div>
              )}
            </div>
            <div style={{marginTop:24}}>
              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>บรรทัดที่ 1</label>
              <input value={songTitle} onChange={e=>setSongTitle(e.target.value)} placeholder="ชื่อเพลง"
                style={{width:"100%",boxSizing:"border-box",background:"rgba(8,6,4,0.8)",border:"1px solid #1A1814",borderRadius:8,padding:"12px 16px",color:"#F0EDE8",fontSize:17,fontFamily:"'Sarabun'",fontWeight:400,outline:"none",letterSpacing:0.5}}
                onFocus={e=>e.target.style.borderColor=gold(0.3)} onBlur={e=>e.target.style.borderColor="#1A1814"}/>

              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6,marginTop:12}}>บรรทัดที่ 2 (ไม่บังคับ)</label>
              <input value={songTitle2} onChange={e=>setSongTitle2(e.target.value)} placeholder="ศิลปิน / คำโปรย"
                style={{width:"100%",boxSizing:"border-box",background:"rgba(8,6,4,0.8)",border:"1px solid #1A1814",borderRadius:8,padding:"12px 16px",color:"#F0EDE8",fontSize:17,fontFamily:"'Sarabun'",fontWeight:400,outline:"none",letterSpacing:0.5}}
                onFocus={e=>e.target.style.borderColor=gold(0.3)} onBlur={e=>e.target.style.borderColor="#1A1814"}/>

              <div style={{display:"flex",alignItems:"center",gap:8,marginTop:10}}>
                <div onClick={()=>setShowTitle(!showTitle)} style={{width:18,height:18,borderRadius:3,border:"1px solid "+(showTitle?gold(0.5):"#1E1C18"),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:showTitle?"rgba(212,175,55,0.1)":"transparent",fontSize:13,color:gold(0.7)}}>{showTitle?"✓":""}</div>
                <span style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200}}>แสดงชื่อเพลงบนวิดีโอ</span>
              </div>

              {/* Position & Font Size controls */}
              {showTitle && (
                <div style={{marginTop:16}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20}}>
                    {/* 9-Grid Position Picker */}
                    <div>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>ตำแหน่ง</label>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,width:90}}>
                        {[
                          ["top-left","↖"],["top-center","↑"],["top-right","↗"],
                          ["middle-left","←"],["middle-center","•"],["middle-right","→"],
                          ["bottom-left","↙"],["bottom-center","↓"],["bottom-right","↘"],
                        ].map(([pos,icon])=>(
                          <div key={pos} onClick={()=>setTitlePos(pos)} style={{
                            width:28,height:28,borderRadius:4,display:"flex",alignItems:"center",justifyContent:"center",
                            cursor:"pointer",fontSize:13,transition:"all 0.2s",
                            border:titlePos===pos?"1px solid "+gold(0.5):"1px solid #1A1814",
                            background:titlePos===pos?"rgba(212,175,55,0.1)":"rgba(8,6,4,0.6)",
                            color:titlePos===pos?gold(0.8):"#9A948C",
                          }}>{icon}</div>
                        ))}
                      </div>
                    </div>
                    {/* Font Sizes */}
                    <div>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>ขนาดบรรทัด 1 ({titleFontSize}%)</label>
                      <input type="range" min={10} max={90} value={titleFontSize} onChange={e=>setTitleFontSize(Number(e.target.value))}
                        style={{width:"100%",accentColor:"#D4AF37",cursor:"pointer"}}/>
                      <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6,marginTop:10}}>ขนาดบรรทัด 2 ({titleFontSize2}%)</label>
                      <input type="range" min={10} max={90} value={titleFontSize2} onChange={e=>setTitleFontSize2(Number(e.target.value))}
                        style={{width:"100%",accentColor:"#D4AF37",cursor:"pointer"}}/>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:20,marginTop:24}}>
              <div>
                <label style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>จำนวน Loop</label>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <button onClick={()=>setLoops(Math.max(1,loops-1))} style={{width:32,height:32,borderRadius:6,border:"1px solid #1E1C18",background:"rgba(8,6,4,0.8)",color:gold(0.6),fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>−</button>
                  <span style={{fontSize:20,fontWeight:300,color:gold(0.7),minWidth:32,textAlign:"center"}}>{loops}</span>
                  <button onClick={()=>setLoops(Math.min(99,loops+1))} style={{width:32,height:32,borderRadius:6,border:"1px solid #1E1C18",background:"rgba(8,6,4,0.8)",color:gold(0.6),fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>+</button>
                </div>
                {audioBufferRef.current&&<div style={{fontSize:16,color:"#8A8478",fontFamily:"'Sarabun'",marginTop:4}}>≈ {Math.floor(audioBufferRef.current.duration*loops/60)} min</div>}
              </div>
              <div>
                <label style={{fontSize:17,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>Resolution</label>
                <div style={{display:"flex",gap:6}}>
                  {["720p","1080p","1440p"].map(r=>(
                    <button key={r} onClick={()=>setResolution(r)} style={{padding:"7px 14px",borderRadius:6,fontSize:16,fontFamily:"'Sarabun'",cursor:"pointer",border:resolution===r?"1px solid "+gold(0.4):"1px solid #1E1C18",background:resolution===r?"rgba(212,175,55,0.06)":"rgba(8,6,4,0.8)",color:resolution===r?gold(0.7):"#4A4030",transition:"all 0.3s"}}>{r}</button>
                  ))}
                </div>
              </div>
            </div>

            {/* End Credit Logo */}
            <div style={{marginTop:20}}>
              <label style={{fontSize:14,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,display:"block",marginBottom:6}}>End Credit Logo (ไม่บังคับ — แสดง 15 วินาทีสุดท้าย)</label>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <button onClick={()=>{
                    const inp=document.createElement("input"); inp.type="file"; inp.accept="image/png,image/jpeg,image/webp,.png,.jpg,.jpeg,.webp";
                    inp.onchange=e=>e.target.files[0]&&handleLogoFile(e.target.files[0]); inp.click();
                  }}
                  style={{background:"rgba(8,6,4,0.8)",border:"1px solid #1E1C18",color:"#9A948C",padding:"8px 20px",borderRadius:6,fontSize:14,fontFamily:"'Sarabun'",cursor:"pointer"}}>
                  {endLogo ? "เปลี่ยน Logo" : "เลือกไฟล์ PNG"}
                </button>
                {endLogo && (
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <img src={endLogo.src} alt="logo" style={{height:32,borderRadius:4,border:"1px solid #1E1C18"}}/>
                    <span style={{fontSize:13,color:"#8A8478",fontFamily:"'Sarabun'"}}>✓ พร้อมใช้งาน</span>
                    <button onClick={()=>setEndLogo(null)} style={{background:"none",border:"none",color:"#6A6050",cursor:"pointer",fontSize:13}}>✕</button>
                  </div>
                )}
              </div>
            </div>

            <div style={{display:"flex",justifyContent:"space-between",marginTop:36}}>
              <Btn onClick={()=>setStep(1)}>← ย้อนกลับ</Btn>
              <Btn primary onClick={()=>setStep(3)}>Preview & Export →</Btn>
            </div>
          </div>
        )}

        {step===3&&(
          <div>
            {mData&&(
              <div style={{textAlign:"center",marginBottom:20}}>
                <span style={{fontSize:17,color:`rgb(${mData.palette[1].join(",")})`,fontFamily:"'Sarabun'",fontWeight:300}}>{mData.icon} {mData.name}</span>
                {songTitle&&<span style={{fontSize:17,color:"#8A8478",fontFamily:"'Sarabun'",fontWeight:200}}> · {songTitle}</span>}
                <span style={{fontSize:16,color:"#7A746C",fontFamily:"'Sarabun'",fontWeight:200}}> · {loops}× · {resolution}</span>
              </div>
            )}
            <div style={{position:"relative",border:"1px solid #0E0D0B",borderRadius:10,overflow:"hidden",background:"#000",maxWidth:880,margin:"0 auto"}}>
              <canvas ref={canvasRef} style={{width:"100%",height:"auto",display:"block"}}/>
              {!playing&&!exporting&&(
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.5)",backdropFilter:"blur(2px)"}}>
                  <div onClick={startPreview} style={{width:64,height:64,borderRadius:"50%",border:"1px solid "+gold(0.3),display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",background:"rgba(212,175,55,0.05)",transition:"all 0.3s"}}
                    onMouseEnter={e=>{e.currentTarget.style.background="rgba(212,175,55,0.12)";e.currentTarget.style.borderColor=gold(0.6)}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(212,175,55,0.05)";e.currentTarget.style.borderColor=gold(0.3)}}>
                    <span style={{fontSize:22,color:gold(0.7),marginLeft:3}}>▶</span>
                  </div>
                </div>
              )}
            </div>
            {playing&&bandLevels&&(
              <div style={{maxWidth:880,margin:"12px auto 0",display:"flex",justifyContent:"center",gap:6,alignItems:"flex-end"}}>
                {bandKeys.map((key,i)=>{
                  const val=bandLevels[key]||0;
                  const accent=mData?`rgb(${mData.palette[1].join(",")})`:"rgba(212,175,55,0.5)";
                  return(
                    <div key={key} style={{textAlign:"center"}}>
                      <div style={{width:24,height:50,background:"rgba(15,13,10,0.8)",borderRadius:3,position:"relative",overflow:"hidden",border:"1px solid #0E0D0B"}}>
                        <div style={{position:"absolute",bottom:0,left:0,right:0,height:`${val*100}%`,background:`linear-gradient(to top,${accent},${gold(0.3)})`,borderRadius:2,transition:"height 0.08s"}}/>
                      </div>
                      <div style={{fontSize:8,color:"#8A8478",fontFamily:"'Sarabun'",marginTop:3,fontWeight:200}}>{bandNames[i]}</div>
                    </div>
                  );
                })}
              </div>
            )}
            <div style={{display:"flex",justifyContent:"center",gap:12,marginTop:20,flexWrap:"wrap"}}>
              <Btn onClick={playing?stopAll:startPreview} sx={{color:playing?"#C85050":gold(0.7),borderColor:playing?"rgba(200,80,80,0.2)":"#1E1C18",background:playing?"rgba(200,80,80,0.06)":"transparent"}}>
                {playing?"■  Stop":"▶  Start Preview"}
              </Btn>
              <Btn primary disabled={exporting} onClick={handleExport}>{exporting?`Exporting ${exportProg}%`:"⬇  Export WebM"}</Btn>
              <Btn onClick={generateCover} disabled={exporting} sx={{borderColor:gold(0.2),color:gold(0.6)}}>
                🖼  Generate Cover
              </Btn>
            </div>
            {exporting&&(
              <div style={{maxWidth:380,margin:"16px auto 0"}}>
                <div style={{background:"#080604",borderRadius:6,overflow:"hidden",height:3}}>
                  <div style={{height:"100%",width:`${exportProg}%`,background:"linear-gradient(90deg,#D4AF37,#F5E6A3)",transition:"width 0.3s",borderRadius:6}}/>
                </div>
                <div style={{textAlign:"center",fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginTop:6}}>
                  Export แบบ real-time (เสียง+ภาพ sync) · ใช้เวลาเท่าความยาววิดีโอ
                  {audioBufferRef.current && <span> · ≈ {Math.ceil(audioBufferRef.current.duration * loops / 60)} นาที</span>}
                </div>
              </div>
            )}
            <div style={{textAlign:"center",marginTop:24}}><Btn onClick={()=>{stopAll();setStep(2)}}>← ย้อนกลับ</Btn></div>
          </div>
        )}

        {/* ═══ DOWNLOAD POPUP ═══ */}
        {downloadUrl&&(
          <div style={{position:"fixed",inset:0,zIndex:100,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.75)",backdropFilter:"blur(8px)"}}>
            <div style={{background:"#0C0A08",border:"1px solid #1E1C18",borderRadius:14,padding:"36px 40px",maxWidth:420,width:"90%",textAlign:"center"}}>
              <div style={{fontSize:36,marginBottom:16}}>✓</div>
              <div style={{fontSize:18,fontWeight:400,color:"#F0EDE8",marginBottom:6}}>{downloadName.endsWith(".png") ? "Cover สำเร็จ" : "Export สำเร็จ"}</div>
              <div style={{fontSize:14,color:"#8A8478",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:16}}>
                {downloadName.endsWith(".png") ? "ไฟล์ถูกดาวน์โหลดอัตโนมัติแล้ว" : "กดปุ่มด้านล่างเพื่อดาวน์โหลดวิดีโอ"}
              </div>
              <div style={{fontSize:16,color:"#9A948C",fontFamily:"'Sarabun'",fontWeight:200,marginBottom:24}}>
                {downloadName}
                {downloadName.endsWith(".png") && downloadUrl && (
                  <div style={{marginTop:12,borderRadius:8,overflow:"hidden",border:"1px solid #1E1C18",maxWidth:360,margin:"12px auto 0"}}>
                    <img src={downloadUrl} alt="cover" style={{width:"100%",display:"block"}} />
                  </div>
                )}
              </div>
              <div style={{display:"flex",gap:12,justifyContent:"center",flexWrap:"wrap",alignItems:"center"}}>
                {/* Hidden iframe for download */}
                {downloadUrl && <iframe id="dl-frame" style={{display:"none"}} title="download"/>}
                <button onClick={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    const d = downloadBlobRef.current;
                    if(!d) return;
                    // Create fresh blob URL
                    const url = URL.createObjectURL(d.blob);
                    // Try multiple download methods
                    let downloaded = false;
                    // Method 1: Navigator.msSaveBlob (Edge/IE)
                    if(navigator.msSaveBlob){
                      navigator.msSaveBlob(d.blob, d.name);
                      downloaded = true;
                    }
                    // Method 2: Use link with click
                    if(!downloaded){
                      const link = document.createElement("a");
                      link.href = url;
                      link.download = d.name;
                      link.style.display = "none";
                      // Must be in DOM for Firefox
                      const container = document.body || document.documentElement;
                      container.appendChild(link);
                      link.click();
                      // Remove sync
                      container.removeChild(link);
                    }
                    // Cleanup URL later
                    setTimeout(() => URL.revokeObjectURL(url), 30000);
                  }}
                  style={{background:"linear-gradient(135deg,#D4AF37,#B8973A)",border:"none",color:"#080604",padding:"12px 36px",borderRadius:8,fontSize:14,fontFamily:"'Sarabun'",fontWeight:600,cursor:"pointer"}}>
                  ⬇  {downloadName.endsWith(".png") ? "ดาวน์โหลดอีกครั้ง" : "ดาวน์โหลด WebM"}
                </button>
                <button onClick={(e)=>{
                    e.preventDefault();
                    e.stopPropagation();
                    URL.revokeObjectURL(downloadUrl);setDownloadUrl(null);setDownloadName("");downloadBlobRef.current=null;
                  }}
                  style={{background:"transparent",border:"1px solid #2A2520",color:"#B0AAA2",padding:"12px 28px",borderRadius:8,fontSize:14,fontFamily:"'Sarabun'",cursor:"pointer"}}>
                  ปิด
                </button>
              </div>
              <div style={{fontSize:12,color:"#7A746C",fontFamily:"'Sarabun'",fontWeight:200,marginTop:16}}>
                หากดาวน์โหลดไม่ขึ้น ให้ทดสอบบน GitHub Pages โดยตรง
              </div>
            </div>
          </div>
        )}

        <footer style={{textAlign:"center",marginTop:64,paddingTop:24,borderTop:"1px solid #0A0908"}}>
          <div style={{fontSize:17,color:"#5A5448",fontFamily:"'Sarabun'",fontWeight:200,letterSpacing:3}}>AUDIO-REACTIVE GENERATIVE ART · THERAPEUTIC VISUAL · SPA THERAPY</div>
        </footer>
      </div>
    </div>
  );
}
