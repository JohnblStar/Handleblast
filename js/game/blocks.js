import { ROWS, COLS, BLOCK_COLORS, LEVELS } from '../config.js';

const SHAPES_EASY = [
  [[1]],
  [[1,1]],
  [[1],[1]],
  [[1,1,1]],
  [[1],[1],[1]],
  [[1,1],[1,1]],
];
const SHAPES_HARD = [
  [[1,1,1],[1,0,0]],
  [[1,1,1],[0,0,1]],
  [[1,0],[1,0],[1,1]],
  [[0,1],[0,1],[1,1]],
  [[1,1,1,1]],
  [[1],[1],[1],[1]],
  [[1,1,0],[0,1,1]],
  [[0,1,1],[1,1,0]],
  [[1,0],[1,1],[0,1]],
  [[0,1],[1,1],[1,0]],
  [[1,1,1],[0,1,0]],
  [[0,1,0],[1,1,1]],
  [[1,0],[1,1],[1,0]],
  [[0,1],[1,1],[0,1]],
];

const pick = arr => arr[Math.floor(Math.random() * arr.length)];

export function getLevel(score) {
  for(let i = LEVELS.length-1; i >= 0; i--) {
    if(score >= LEVELS[i].minScore) return LEVELS[i];
  }
  return LEVELS[0];
}

export function randomBlock(score) {
  const pool = Math.random() < getLevel(score).bigBlockChance ? SHAPES_HARD : SHAPES_EASY;
  return { shape: pick(pool), color: pick(BLOCK_COLORS) };
}

export const newTray = score => [randomBlock(score), randomBlock(score), randomBlock(score)];

// 커서(row, col)를 블록 중심으로 둘 때 차지하는 보드 칸 [[r, c], ...]
export function blockCells(shape, row, col) {
  const offR = Math.floor(shape.length/2);
  const offC = Math.floor(shape[0].length/2);
  const cells = [];
  for(let r=0; r<shape.length; r++) {
    for(let c=0; c<shape[r].length; c++) {
      if(shape[r][c]) cells.push([row-offR+r, col-offC+c]);
    }
  }
  return cells;
}

export const inBounds = (r, c) => r>=0 && r<ROWS && c>=0 && c<COLS;

export const fits = (board, cells) => cells.every(([r, c]) => inBounds(r, c) && !board[r][c]);

export function canPlaceAnywhere(board, shape) {
  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      if(fits(board, blockCells(shape, r, c))) return true;
    }
  }
  return false;
}
