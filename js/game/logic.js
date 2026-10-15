import { ROWS, COLS, SCORE } from '../config.js';
import { state } from './state.js';
import { blockCells, fits, canPlaceAnywhere, getLevel, newTray } from './blocks.js';
import { spawnPulse, spawnClearParticles } from '../render/effects.js';
import { updateHud, showScorePopup } from '../ui/hud.js';

// 현재 커서 위치에 활성 블록 설치. 설치 못 하면 false
export function tryPlace() {
  const block = state.trayBlocks[state.activeIdx];
  if(!block || state.gameOver) return false;

  const { shape, color } = block;
  const cells = blockCells(shape, state.cursorRow, state.cursorCol);
  if(!fits(state.board, cells)) return false;

  const board = state.board;
  cells.forEach(([r, c]) => { board[r][c] = color; });
  spawnPulse(cells, color);
  state.trayBlocks[state.activeIdx] = null;

  const lines = clearFullLines(board);
  const prevLevel = getLevel(state.score).label;

  if(lines > 0) {
    state.combo++;
    const gained = lines * SCORE.perLine * state.combo;
    state.score += gained;
    showScorePopup(`+${gained}${state.combo>1 ? ' ×'+state.combo+' 콤보' : ''} 🔥`);
  } else {
    state.combo = 0;
    state.score += SCORE.perPlace;
  }

  const level = getLevel(state.score).label;
  if(level !== prevLevel) showScorePopup('⬆️ ' + level + ' 레벨 업!');
  updateHud(state);

  if(state.trayBlocks.every(b => !b)) state.trayBlocks = newTray(state.score);

  // 손 제스처로는 블록을 고를 수 없으므로, 놓을 수 있는 블록을 자동 선택.
  // 놓을 수 있는 블록이 하나도 없으면 게임 종료
  const placeable = state.trayBlocks.findIndex(b => b && canPlaceAnywhere(board, b.shape));
  state.gameOver = placeable < 0;
  state.activeIdx = placeable >= 0 ? placeable : state.trayBlocks.findIndex(b => b);
  return true;
}
// 가득 찬 행/열을 제자리에서 비움 (행·열 동시 클리어 지원). 지운 줄 수 반환
function clearFullLines(board) {
  const fullRows = [], fullCols = [];
  for(let r=0; r<ROWS; r++) if(board[r].every(v => v)) fullRows.push(r);
  for(let c=0; c<COLS; c++) if(board.every(row => row[c])) fullCols.push(c);

  const cleared = new Map(); // 'r,c' → {r, c, color}  (교차 칸 중복 제거)
  fullRows.forEach(r => { for(let c=0; c<COLS; c++) cleared.set(r+','+c, { r, c, color: board[r][c] }); });
  fullCols.forEach(c => { for(let r=0; r<ROWS; r++) cleared.set(r+','+c, { r, c, color: board[r][c] }); });

  if(cleared.size) {
    spawnClearParticles([...cleared.values()]);
    cleared.forEach(({ r, c }) => { board[r][c] = 0; });
  }
  return fullRows.length + fullCols.length;
}
