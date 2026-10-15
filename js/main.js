// ─── 진입점: 모듈 연결 + 게임 루프 ────────────────────────────
import { GAME, IDLE, QUEUE_FLUSH_MS } from './config.js';
import { state, resetState } from './game/state.js';
import { tryPlace } from './game/logic.js';
import { applyLayout } from './render/layout.js';
import { drawBoard, drawTray, trayCanvases } from './render/board.js';
import { updateEffects, clearEffects } from './render/effects.js';
import { createHandTracker } from './hand/tracker.js';
import { updateHud, setStatus, setHandAlert, setIdleCountdown, setTime, showScorePopup } from './ui/hud.js';
import { showStartScreen, showGameOver, hideScreen } from './ui/screens.js';
import { flushQueue } from './ranking/api.js';

// 게임 진행 단계
//  start   : 시작 화면 (학번 입력)
//  ready   : 게임 화면, 손이 처음 보이기를 기다리는 중 (타이머 정지)
//  playing : 진행 중 (타이머 동작)
//  ending  : 종료 연출 중
//  result  : 결과/랭킹 화면
let phase = 'start';
let playStartedAt = 0;   // 첫 손 인식 시각
let phaseSince = 0;      // ready 진입 시각
let lastSeenAt = 0;      // 마지막으로 손이 보인 시각 (가장자리 포함)

const tracker = createHandTracker({
  video: document.getElementById('video'),
  canvas: document.getElementById('overlay'),
  onHand({ col, row, open }) {
    state.cursorCol = col;
    state.cursorRow = row;
    state.handOpen = open;
  },
  onPresence(kind) {
    if(kind !== 'ok') state.handOpen = false;
    if(kind !== 'lost') lastSeenAt = performance.now();
    // 손이 처음 보이는 순간부터 시간 측정
    if(kind === 'ok' && phase === 'ready') {
      phase = 'playing';
      playStartedAt = performance.now();
    }
    setHandAlert(phase === 'ready' || phase === 'playing' ? kind : 'ok');
  },
  onGrab(cell) {
    if(phase !== 'playing') return;
    // 주먹을 쥐기 직전 위치에 설치
    state.cursorCol = cell.col;
    state.cursorRow = cell.row;
    if(tryPlace() && state.gameOver) endGame('moves');
  },
  onStatus: setStatus,
});

const POPUPS = { moves: 'No more moves', time: 'Time up!', idle: 'Auto end' };

// reason: 'moves'(놓을 자리 없음) | 'time'(시간 종료) | 'idle'(방치)
function endGame(reason) {
  if(phase !== 'playing' && phase !== 'ready') return;
  const wasPlaying = phase === 'playing';
  phase = 'ending';
  state.gameOver = true;
  state.handOpen = false;
  setHandAlert('ok');
  setIdleCountdown(null);
  showScorePopup(POPUPS[reason]);

  setTimeout(() => {
    // 손을 한 번도 안 보였거나 0점으로 방치된 판은 저장하지 않고 처음 화면으로
    if(reason === 'idle' && (!wasPlaying || state.score === 0)) { goToStart(); return; }
    phase = 'result';
    showGameOver(state.score, state.studentId, { reason, onRestart: startGame, onIdle: goToStart });
  }, 1200);
}

function goToStart() {
  phase = 'start';
  state.gameOver = true;
  setHandAlert('ok');
  showStartScreen(startGame);
}

let cameraStarted = false;
async function startGame(studentId) {
  state.studentId = studentId;
  resetState();
  clearEffects();
  updateHud(state);
  hideScreen();
  phase = 'ready';
  phaseSince = lastSeenAt = performance.now();
  updateTimer(phaseSince);

  if(cameraStarted) return;
  cameraStarted = true;
  applyLayout();
  requestAnimationFrame(loop);
  try {
    await tracker.start();
    setStatus('손을 보여주세요');
  } catch(e) {
    console.error(e);
    setStatus('카메라 권한 필요');
  }
}

function updateTimer(now) {
  if(!GAME.timeLimitSec) { setTime(null); return; }
  if(phase === 'ready') { setTime(GAME.timeLimitSec, { waiting: true }); return; }
  if(phase !== 'playing') return;
  const left = GAME.timeLimitSec - (now - playStartedAt) / 1000;
  setTime(left, { urgent: left <= GAME.urgentSec });
  if(left <= 0) endGame('time');
}

// 손이 오래 안 보이면 안내 후 자동 종료
function checkIdle(now) {
  if(phase !== 'playing' && phase !== 'ready') { setIdleCountdown(null); return; }
  const unseen = now - Math.max(lastSeenAt, phaseSince);
  setIdleCountdown(unseen > IDLE.warnMs ? Math.ceil((IDLE.gameMs - unseen) / 1000) : null);
  if(unseen > IDLE.gameMs) endGame('idle');
}

function loop(ts) {
  tracker.detect(ts);
  updateTimer(ts);
  checkIdle(ts);
  updateEffects();
  drawBoard(state);
  drawTray(state);
  requestAnimationFrame(loop);
}

// 트레이 클릭으로 활성 블록 변경 (마우스 보조)
trayCanvases.forEach((c, i) => {
  c.addEventListener('click', () => {
    if(state.trayBlocks[i]) state.activeIdx = i;
  });
});

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(applyLayout, 100);
});

// 저장 못 한 점수 재전송: 시작 시, 인터넷 재연결 시, 주기적으로
flushQueue();
window.addEventListener('online', () => flushQueue());
setInterval(() => flushQueue(), QUEUE_FLUSH_MS);

setTime(GAME.timeLimitSec || null, { waiting: true });
showStartScreen(startGame);
