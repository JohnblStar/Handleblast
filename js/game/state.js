import { ROWS, COLS } from '../config.js';
import { newTray } from './blocks.js';

export const emptyBoard = () => Array.from({ length: ROWS }, () => new Array(COLS).fill(0));

// 게임 전역 상태 — 모든 모듈이 이 객체 하나를 공유
export const state = {
  board: emptyBoard(),
  score: 0,
  combo: 0,
  trayBlocks: newTray(0),
  activeIdx: 0,
  cursorCol: 3,
  cursorRow: 3,
  handOpen: false,
  gameOver: false,
  studentId: '',
};

export function resetState() {
  state.board = emptyBoard();
  state.score = 0;
  state.combo = 0;
  state.trayBlocks = newTray(0);
  state.activeIdx = 0;
  state.gameOver = false;
}
