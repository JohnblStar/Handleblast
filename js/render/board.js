import { ROWS, COLS } from '../config.js';
import { blockCells, fits, inBounds, canPlaceAnywhere } from '../game/blocks.js';
import { layout } from './layout.js';
import { drawEffects, shakeOffset } from './effects.js';

const boardCanvas = document.getElementById('board-canvas');
const bctx = boardCanvas.getContext('2d');
export const trayCanvases = [0,1,2].map(i => document.getElementById('tray'+i));
const trayCtxs = trayCanvases.map(c => c.getContext('2d'));

const EMPTY_CELL = '#1c1c1c';

function drawCell(ctx, x, y, size, color, alpha=1) {
  const pad = 2, s = size - pad*2;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.roundRect(x+pad, y+pad, s, s, 2);
  ctx.fill();
  // 상단 하이라이트 + 하단 그림자로 입체감
  ctx.fillStyle = 'rgba(255,255,255,0.22)';
  ctx.fillRect(x+pad, y+pad, s, Math.max(2, s*0.12));
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.fillRect(x+pad, y+pad + s - Math.max(2, s*0.12), s, Math.max(2, s*0.12));
  ctx.globalAlpha = 1;
}

// 고스트: 반투명 채움 + 테두리
function drawGhost(ctx, x, y, size, color, valid) {
  const pad = 3, s = size - pad*2;
  ctx.globalAlpha = valid ? 0.35 : 0.15;
  ctx.fillStyle = color;
  ctx.fillRect(x+pad, y+pad, s, s);
  ctx.globalAlpha = valid ? 1 : 0.35;
  ctx.strokeStyle = valid ? color : '#ffffff';
  ctx.lineWidth = 2;
  ctx.setLineDash(valid ? [] : [4, 3]);
  ctx.strokeRect(x+pad+1, y+pad+1, s-2, s-2);
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

export function drawBoard(state) {
  const cs = layout.cellSize;
  const w = boardCanvas.width, h = boardCanvas.height;
  const [sx, sy] = shakeOffset();

  bctx.save();
  bctx.translate(sx, sy);
  bctx.clearRect(-10, -10, w+20, h+20);

  // 빈 칸은 한 번의 path 로 묶어서 fill
  bctx.fillStyle = EMPTY_CELL;
  bctx.beginPath();
  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) bctx.roundRect(c*cs+2, r*cs+2, cs-4, cs-4, 2);
  }
  bctx.fill();

  // 커서 위치 행/열 가이드
  if(state.handOpen && !state.gameOver) {
    bctx.fillStyle = 'rgba(254,214,10,0.05)';
    bctx.fillRect(0, state.cursorRow*cs, w, cs);
    bctx.fillRect(state.cursorCol*cs, 0, cs, h);
  }

  for(let r=0; r<ROWS; r++) {
    for(let c=0; c<COLS; c++) {
      if(state.board[r][c]) drawCell(bctx, c*cs, r*cs, cs, state.board[r][c]);
    }
  }

  // Ghost preview
  const block = state.trayBlocks[state.activeIdx];
  if(block && state.handOpen && !state.gameOver) {
    const cells = blockCells(block.shape, state.cursorRow, state.cursorCol);
    const valid = fits(state.board, cells);
    cells.forEach(([r, c]) => {
      if(inBounds(r, c)) drawGhost(bctx, c*cs, r*cs, cs, block.color, valid);
    });
  }

  drawEffects(bctx);
  bctx.restore();
}

// 트레이는 바뀔 때만 다시 그림
let trayKey = '';
export function drawTray(state) {
  const key = state.activeIdx + '|' + trayCanvases[0].width + '|' + state.trayBlocks.map(b => b ? b.color + b.shape : '-').join('|');
  if(key === trayKey) return;
  trayKey = key;

  trayCtxs.forEach((ctx, i) => {
    const c = trayCanvases[i];
    ctx.clearRect(0, 0, c.width, c.height);
    const block = state.trayBlocks[i];
    if(!block) return;
    const { shape, color } = block;
    const rows = shape.length, cols = shape[0].length;
    const cs = Math.floor((c.width - 8) / Math.max(rows, cols));
    const ox = Math.floor((c.width - cols*cs)/2);
    const oy = Math.floor((c.height - rows*cs)/2);
    const active = i === state.activeIdx;
    for(let r=0; r<rows; r++) {
      for(let cc=0; cc<cols; cc++) {
        if(shape[r][cc]) drawCell(ctx, ox+cc*cs, oy+r*cs, cs, color, active ? 1 : 0.4);
      }
    }
  });
  // 활성 슬롯 강조 / 놓을 자리 없는 블록 표시는 CSS (.tray-slot.active / .blocked)
  trayCanvases.forEach((c, i) => {
    const block = state.trayBlocks[i];
    c.parentElement.classList.toggle('active', i === state.activeIdx && !!block);
    c.parentElement.classList.toggle('blocked', !!block && !canPlaceAnywhere(state.board, block.shape));
  });
}
