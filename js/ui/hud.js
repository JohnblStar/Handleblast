import { getLevel } from '../game/blocks.js';

const scoreEl = document.getElementById('score-el');
const comboEl = document.getElementById('combo-el');
const levelEl = document.getElementById('level-badge');
const pillEl = document.getElementById('status-pill');
const popupEl = document.getElementById('score-popup');

// 값이 올라가면 숫자에 bump 애니메이션
function setStat(el, value) {
  const prev = Number(el.textContent);
  el.textContent = value;
  if(value > prev) {
    el.classList.remove('bump');
    void el.offsetWidth; // 애니메이션 재시작
    el.classList.add('bump');
  }
}

export function updateHud(state) {
  setStat(scoreEl, state.score);
  setStat(comboEl, state.combo);
  levelEl.textContent = getLevel(state.score).label;
}

// 같은 값이면 DOM 을 건드리지 않음 (손 인식마다 호출됨)
let lastStatus = '';
export function setStatus(text, mode = '') {
  const key = text + '|' + mode;
  if(key === lastStatus) return;
  lastStatus = key;
  pillEl.textContent = text;
  pillEl.className = mode;
}

// 손 위치 안내 — kind: 'ok' | 'edge' | 'lost'
const alertEl = document.getElementById('hand-alert');
const camPanelEl = document.getElementById('cam-panel');
const ALERTS = {
  edge: ['화면 안으로 손을 넣어주세요', '손이 카메라 밖으로 나갔어요. 노란 점선 안으로 돌아오면 다시 조작할 수 있어요.'],
  lost: ['손을 카메라에 보여주세요', '손바닥을 펴서 카메라 쪽으로 보여주면 블록이 따라옵니다.'],
};
let lastAlert = 'ok';
export function setHandAlert(kind) {
  if(kind === lastAlert) return;
  lastAlert = kind;
  const show = kind !== 'ok';
  alertEl.classList.toggle('show', show);
  alertEl.classList.toggle('edge', kind === 'edge');
  camPanelEl.classList.toggle('alert', kind === 'edge');
  if(show) {
    alertEl.querySelector('.alert-title').textContent = ALERTS[kind][0];
    alertEl.querySelector('.alert-desc').textContent = ALERTS[kind][1];
  }
}

// 손이 오래 안 보일 때 자동 종료까지 남은 초 (null 이면 숨김)
const alertCountEl = alertEl.querySelector('.alert-count');
let lastCount = null;
export function setIdleCountdown(sec) {
  if(sec === lastCount) return;
  lastCount = sec;
  alertCountEl.textContent = sec === null ? '' : `${sec}초 뒤 자동 종료`;
}

// 남은 시간 표시. sec === null 이면 무제한(숨김), waiting 이면 손 인식 전 대기
const timeStatEl = document.getElementById('time-stat');
const timeEl = document.getElementById('time-el');
let lastTime = '';
export function setTime(sec, { waiting = false, urgent = false } = {}) {
  timeStatEl.style.display = sec === null ? 'none' : '';
  if(sec === null) return;
  const s = Math.max(0, Math.ceil(sec));
  const text = `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`;
  const key = text + waiting + urgent;
  if(key === lastTime) return;
  lastTime = key;
  timeEl.textContent = text;
  timeEl.classList.toggle('waiting', waiting);
  timeEl.classList.toggle('urgent', urgent);
}

let popupTimer = null;
export function showScorePopup(text) {
  clearTimeout(popupTimer);
  popupEl.textContent = text;
  popupEl.style.transition = 'none';
  popupEl.style.opacity = '1';
  popupEl.style.transform = 'translateX(-50%) translateY(0)';
  requestAnimationFrame(() => {
    popupEl.style.transition = 'opacity .8s ease, transform .8s ease';
    popupEl.style.opacity = '0';
    popupEl.style.transform = 'translateX(-50%) translateY(-30px)';
  });
  popupTimer = setTimeout(() => { popupEl.style.opacity = '0'; }, 1000);
}
