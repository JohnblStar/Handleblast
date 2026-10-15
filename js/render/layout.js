import { COLS, ROWS } from '../config.js';

// css/style.css 의 --app-pad / --app-gap / --main-gap / --panel-gap 과 맞출 것
const CAM_ASPECT = 4/3;
const SIDE_RATIO = 0.55; // 왼쪽 컬럼(캠·트레이) 폭 = 보드 폭 × 이 비율
const APP_PAD = 16;
const APP_GAP = 16;
const MAIN_GAP = 16;
const PANEL_GAP = 12;
const SLOT_CHROME = 22;  // 트레이 슬롯 패딩 20 + 보더 2
const SAFETY = 8;        // 보드 코너 브래킷 여유

export const layout = { cellSize: 50 };

// 화면 크기에 맞춰 보드·캠·트레이 캔버스 크기 계산
// [ 캠 + 트레이 (작게) ] [ 보드 (화면 높이 가득) ]
export function applyLayout() {
  const app = document.getElementById('app');
  const main = document.getElementById('main');
  const headerH = document.getElementById('header').offsetHeight;

  const maxByHeight = app.clientHeight - APP_PAD*2 - headerH - APP_GAP - SAFETY;
  const maxByWidth = (main.clientWidth - MAIN_GAP - SAFETY) / (1 + SIDE_RATIO);
  const cellSize = Math.max(10, Math.floor(Math.min(maxByHeight, maxByWidth) / Math.max(COLS, ROWS)));
  layout.cellSize = cellSize;

  const board = document.getElementById('board-canvas');
  board.width = cellSize * COLS;
  board.height = cellSize * ROWS;

  const sideW = Math.round(board.width * SIDE_RATIO);
  document.getElementById('side').style.width = sideW + 'px';

  const camW = sideW;
  const camH = Math.round(camW / CAM_ASPECT);
  const camPanel = document.getElementById('cam-panel');
  camPanel.style.width = camW + 'px';
  camPanel.style.height = camH + 'px';

  const video = document.getElementById('video');
  const overlay = document.getElementById('overlay');
  video.width = overlay.width = camW;
  video.height = overlay.height = camH;

  // 헤더 폭을 왼쪽 컬럼+보드 폭에 맞춤
  document.getElementById('header').style.maxWidth = (sideW + MAIN_GAP + board.width) + 'px';

  const slotPx = Math.max(30, Math.min(100, Math.floor((sideW - PANEL_GAP*2) / 3) - SLOT_CHROME));
  document.querySelectorAll('#tray canvas').forEach(c => { c.width = c.height = slotPx; });
}
