import { layout } from './layout.js';

const SHAKE_FRAMES = 8, SHAKE_AMT = 3;

let particles = [];
let pulses = [];
let shake = 0;

export function clearEffects() {
  particles = []; pulses = []; shake = 0;
}

// 라인 클리어 파티클 — cells: [{r, c, color}]
export function spawnClearParticles(cells) {
  const cs = layout.cellSize;
  cells.forEach(({ r, c, color }) => {
    const cx = c*cs + cs/2, cy = r*cs + cs/2;
    for(let i=0; i<12; i++) {
      const angle = (Math.PI*2/12)*i + Math.random()*0.3;
      const speed = 2 + Math.random()*3.5;
      particles.push({
        x: cx, y: cy,
        vx: Math.cos(angle)*speed,
        vy: Math.sin(angle)*speed,
        r: 3 + Math.random()*3,
        color,
        life: 1,
        decay: 0.025 + Math.random()*0.025,
      });
    }
  });
}

// 설치 펄스 — 설치된 칸들의 bounding box 중심에서 링 3개 + 보드 진동
export function spawnPulse(cells, color) {
  const cs = layout.cellSize;
  const rs = cells.map(([r]) => r), cols = cells.map(([, c]) => c);
  const cx = (Math.min(...cols) + Math.max(...cols) + 1) / 2 * cs;
  const cy = (Math.min(...rs) + Math.max(...rs) + 1) / 2 * cs;
  for(let k=0; k<3; k++) {
    pulses.push({
      x: cx, y: cy,
      r: cs * 0.5,
      maxR: cs * (2.5 + k*1.2),
      alpha: 0.7 - k*0.15,
      color,
      delay: k * 6,
    });
  }
  shake = SHAKE_FRAMES;
}

export function updateEffects() {
  for(let i=particles.length-1; i>=0; i--) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.12; // gravity
    p.vx *= 0.97;
    p.life -= p.decay;
    if(p.life <= 0) particles.splice(i, 1);
  }
  for(let i=pulses.length-1; i>=0; i--) {
    const p = pulses[i];
    if(p.delay > 0) { p.delay--; continue; }
    p.r += (p.maxR - p.r) * 0.18;
    p.alpha *= 0.88;
    if(p.alpha < 0.01) pulses.splice(i, 1);
  }
  if(shake > 0) shake--;
}

export function shakeOffset() {
  if(shake <= 0) return [0, 0];
  const amt = SHAKE_AMT * shake / SHAKE_FRAMES;
  return [(Math.random()*2-1) * amt, (Math.random()*2-1) * amt];
}

export function drawEffects(ctx) {
  ctx.lineWidth = 3;
  pulses.forEach(p => {
    if(p.delay > 0) return;
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
    ctx.stroke();
  });
  particles.forEach(p => {
    ctx.globalAlpha = p.life * p.life;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI*2);
    ctx.fill();
  });
  ctx.globalAlpha = 1;
}
