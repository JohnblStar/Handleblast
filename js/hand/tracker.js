import { COLS, ROWS, HAND } from '../config.js';
import { createCursor } from './cursor.js';

const CONNECTIONS = [
  [0,1],[1,2],[2,3],[3,4],
  [0,5],[5,6],[6,7],[7,8],
  [5,9],[9,10],[10,11],[11,12],
  [9,13],[13,14],[14,15],[15,16],
  [13,17],[17,18],[18,19],[19,20],[0,17]
];

// 손가락 끝(tip)이 두 번째 마디보다 아래면 접힌 것으로 판단 — 3개 이상이면 주먹
export function isFist(landmarks) {
  const tips = [8,12,16,20];
  const knuckles = [6,10,14,18];
  let curled = 0;
  tips.forEach((tip, i) => {
    if(landmarks[tip].y > landmarks[knuckles[i]].y) curled++;
  });
  return curled >= 3;
}

function drawSkeleton(ctx, lm, fist, warn) {
  const W = ctx.canvas.width, H = ctx.canvas.height;
  ctx.strokeStyle = warn ? '#ff3b30' : fist ? '#fed60a' : '#ffffff';
  ctx.lineWidth = 2;
  ctx.beginPath();
  CONNECTIONS.forEach(([a, b]) => {
    ctx.moveTo(lm[a].x*W, lm[a].y*H);
    ctx.lineTo(lm[b].x*W, lm[b].y*H);
  });
  ctx.stroke();
  ctx.fillStyle = warn ? '#ff3b30' : fist ? '#fed60a' : '#ffffff';
  ctx.beginPath();
  lm.forEach(p => {
    ctx.moveTo(p.x*W + 3, p.y*H);
    ctx.arc(p.x*W, p.y*H, 3, 0, Math.PI*2);
  });
  ctx.fill();
}

// 손 전체(21개 랜드마크)가 가장자리 여백 안쪽에 있는지
function fullyInFrame(lm) {
  const m = HAND.edgeMargin;
  return lm.every(p => p.x > m && p.x < 1-m && p.y > m && p.y < 1-m);
}

// 조작 영역 가이드 (overlay 캔버스는 CSS 로 미러링되므로 x 를 뒤집어서 그림)
function drawArea(ctx, alert) {
  const W = ctx.canvas.width, H = ctx.canvas.height, A = HAND.area;
  ctx.save();
  ctx.strokeStyle = alert ? 'rgba(255,59,48,.9)' : 'rgba(254,214,10,.55)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.strokeRect((1-A.x1)*W, A.y0*H, (A.x1-A.x0)*W, (A.y1-A.y0)*H);
  ctx.restore();
}

const clamp01 = v => Math.max(0, Math.min(0.9999, v));

/**
 * 웹캠 + MediaPipe Hands 래퍼.
 * onHand({col, row, open}) — 손이 화면 안에 온전히 있을 때 커서/손 상태
 * onPresence(kind)         — 'ok' | 'edge'(가장자리에 걸침) | 'lost'(안 보임)
 * onGrab({col, row})       — 손 편 상태 → 주먹 전환. 설치할 칸(주먹 쥐기 직전 위치)
 * onStatus(text, mode)     — 상태 표시 ('', 'open', 'fist', 'warn')
 */
export function createHandTracker({ video, canvas, onHand, onPresence, onGrab, onStatus }) {
  const ctx = canvas.getContext('2d');
  const cursor = createCursor({
    cols: COLS, rows: ROWS,
    smoothing: HAND.smoothing, hysteresis: HAND.hysteresis, lockLookback: HAND.lockLookback,
  });
  let hands = null;
  let ready = false;
  let busy = false;
  let lastDetect = 0;
  let wasOpen = false;   // 마지막 설치 이후 손을 편 적이 있는지
  let fistFrames = 0;
  let locked = null;     // 주먹을 쥐는 동안 고정된 칸
  let cooldown = 0;

  // 손이 사라지거나 가장자리에 걸치면 설치 준비 상태 해제 → 다시 손을 펴야 설치 가능
  function disarm() { wasOpen = false; fistFrames = 0; locked = null; cursor.reset(); }

  function onResults(results) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if(cooldown > 0) cooldown--;

    const lm = results.multiHandLandmarks?.[0];
    if(!lm) {
      disarm();
      drawArea(ctx, false);
      onPresence('lost');
      onStatus('손 인식 중', '');
      return;
    }

    if(!fullyInFrame(lm)) {
      disarm();
      drawArea(ctx, true);
      drawSkeleton(ctx, lm, false, true);
      onPresence('edge');
      onStatus('⚠ 화면 밖', 'warn');
      return;
    }

    const fist = isFist(lm);
    const A = HAND.area;
    const wrist = lm[0];
    const nx = clamp01(((1 - wrist.x) - A.x0) / (A.x1 - A.x0)); // 미러 보정
    const ny = clamp01((wrist.y - A.y0) / (A.y1 - A.y0));
    const cell = cursor.update(nx, ny);
    drawArea(ctx, false);
    drawSkeleton(ctx, lm, fist, false);
    onPresence('ok');

    if(fist) {
      if(fistFrames === 0) locked = cursor.lockedCell(); // 쥐기 시작한 순간 위치 고정
      fistFrames++;
      if(fistFrames >= HAND.fistConfirmFrames && wasOpen) {
        if(cooldown <= 0) { onGrab(locked); cooldown = HAND.grabCooldown; }
        wasOpen = false;
      }
    } else {
      fistFrames = 0;
      locked = null;
      wasOpen = true;
      cursor.markOpen();
    }
    onHand({ ...(locked ?? cell), open: !fist });
    onStatus(fist ? '✊ 주먹' : '🖐 손 펴기', fist ? 'fist' : 'open');
  }

  async function start() {
    hands = new Hands({ locateFile: file => `${HAND.cdn}/${file}` });
    hands.setOptions(HAND.options);
    hands.onResults(onResults);

    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'user', width: 640, height: 480 }, audio: false,
    });
    video.srcObject = stream;
    await new Promise(res => { video.onloadedmetadata = res; });
    await video.play();
    ready = true;
  }

  // 렌더 루프에서 매 프레임 호출 — 인식은 비동기로 돌리고 렌더링을 막지 않음
  function detect(ts) {
    if(!ready || busy || video.paused || ts - lastDetect < HAND.detectIntervalMs) return;
    busy = true;
    lastDetect = ts;
    hands.send({ image: video })
      .catch(err => console.error(err))
      .finally(() => { busy = false; });
  }

  return { start, detect };
}
