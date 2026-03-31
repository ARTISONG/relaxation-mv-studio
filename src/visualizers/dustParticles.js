// ─── 1. DUST PARTICLES — floating motes in warm light ───
import { simplex } from "../utils/simplex.js";
import { hsl } from "../utils/audio.js";

let _dustMotes = null;

function initDust(w, h) {
  _dustMotes = Array.from({ length: 500 }, (_, i) => ({
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

export function resetDust() {
  _dustMotes = null;
}

export function renderLuminousDrift(ctx, w, h, t, bands) {
  if (!_dustMotes) initDust(w, h);
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
  _dustMotes.forEach((d, di) => {
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
