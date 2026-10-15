import { STUDENT_ID_RE, IDLE } from '../config.js';
import { submitScore, fetchRanking, isGlobal } from '../ranking/api.js';

const screen = document.getElementById('overlay-screen');

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, ch =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

export function hideScreen() {
  clearIdleTimer();
  screen.style.display = 'none';
}

// 학번 입력폼 검증 → onSubmit(학번)
function bindIdForm(onSubmit) {
  const inp = document.getElementById('id-input');
  const msg = document.getElementById('id-msg');
  const submit = () => {
    const id = inp.value.trim();
    if(!STUDENT_ID_RE.test(id)) {
      msg.textContent = '학번은 영문/숫자 2~15자로 입력해주세요';
      inp.focus();
      return;
    }
    onSubmit(id);
  };
  document.getElementById('start-btn').onclick = submit;
  inp.addEventListener('keydown', e => { if(e.key === 'Enter') submit(); });
  inp.focus();
  inp.select();
}

// ─── 결과 화면 방치 타이머 ────────────────────────────────────
// 입력이 없으면 남은 초를 보여주다가 onIdle 호출. 키보드/마우스 입력 시 리셋
let idleInterval = null;
const IDLE_EVENTS = ['keydown', 'input', 'pointerdown', 'pointermove'];
let resetIdle = null;

function clearIdleTimer() {
  clearInterval(idleInterval);
  idleInterval = null;
  if(resetIdle) IDLE_EVENTS.forEach(ev => screen.removeEventListener(ev, resetIdle));
  resetIdle = null;
}

function startIdleTimer(onIdle) {
  clearIdleTimer();
  const total = Math.round(IDLE.resultMs / 1000);
  let left = total;
  const el = document.getElementById('idle-sec');
  resetIdle = () => { left = total; if(el) el.textContent = left; };
  IDLE_EVENTS.forEach(ev => screen.addEventListener(ev, resetIdle));
  resetIdle();
  idleInterval = setInterval(() => {
    left--;
    if(el) el.textContent = left;
    if(left <= 0) { clearIdleTimer(); onIdle(); }
  }, 1000);
}

// 시작 화면 — 처음 마크업을 기억해 두었다가 다시 보여줄 때 복원
const START_HTML = screen.innerHTML;
export function showStartScreen(onStart) {
  clearIdleTimer();
  screen.innerHTML = START_HTML;
  screen.style.display = 'flex';
  bindIdForm(onStart);
}

// 게임오버 → 점수 저장 → 랭킹 표시 → 다음 플레이어 학번 입력
const btnLabel = text => `<span>${text}</span><span>${text}</span>`;

const END_REASONS = {
  moves: 'No More Moves',
  time:  'Time Up',
  idle:  'Idle — Auto End',
};

const SAVE_NOTES = {
  queued:   '⚠ 오프라인 상태예요. 점수는 이 컴퓨터에 보관했다가 인터넷이 연결되면 자동으로 저장됩니다.',
  rejected: '⚠ 점수 저장이 거부되었습니다. 운영자에게 문의해주세요.',
};

function resultHeader(score, studentId, myRank, reason) {
  return `
    <div class="screen-top reveal">
      <span class="eyebrow"><span class="num">FINISH</span>${END_REASONS[reason] ?? 'Game Over'}</span>
      <span class="eyebrow">${isGlobal ? 'Global Ranking' : 'Local Ranking'}</span>
    </div>
    <div>
      <div class="eyebrow reveal">Final Score</div>
      <div class="final-score reveal d1">${score.toLocaleString()}</div>
      <dl class="result-meta reveal d2">
        <dt>Student ID</dt><dd>${escapeHtml(studentId)}</dd>
        ${myRank ? `<dt>Position</dt><dd>P${myRank}</dd>` : ''}
      </dl>
    </div>`;
}

/**
 * reason: 'moves' | 'time' | 'idle'
 * onRestart(학번) — 다음 게임 시작, onIdle() — 방치 시 시작 화면으로
 */
export async function showGameOver(score, studentId, { reason, onRestart, onIdle }) {
  clearIdleTimer();
  screen.innerHTML = `
    <section class="screen">
      ${resultHeader(score, studentId, null, reason)}
      <div class="reveal d2">
        <p id="save-status">점수 저장 중…</p>
        <div class="loading-bar"></div>
      </div>
    </section>
  `;
  screen.style.display = 'flex';

  const saved = await submitScore(studentId, score);

  let ranking = null;
  try { ranking = await fetchRanking(studentId); } catch(e) { console.error(e); }

  const rankingHtml = ranking
    ? rankingTable(ranking, studentId)
    : '<p class="lead">지금은 랭킹을 불러올 수 없어요. 인터넷 연결을 확인해주세요.</p>';

  screen.innerHTML = `
    <section class="screen">
      <div class="result-grid">
        <div style="display:flex;flex-direction:column;gap:28px">
          ${resultHeader(score, studentId, ranking?.myRank, reason)}
          ${SAVE_NOTES[saved] ? `<p class="save-note reveal d2">${SAVE_NOTES[saved]}</p>` : ''}
          <div class="reveal d3">
            <div id="id-form">
              <label class="field">
                <span class="eyebrow"><span class="num">NEXT</span>다음 플레이어 학번</span>
                <input id="id-input" maxlength="15" placeholder="학번 입력" autocomplete="off" inputmode="numeric" value="${escapeHtml(studentId)}" />
              </label>
              <button class="btn" id="start-btn">${btnLabel('Restart →')}</button>
            </div>
            <div id="id-msg"></div>
            <div class="idle-note"><span id="idle-sec"></span>초 동안 입력이 없으면 처음 화면으로 돌아갑니다</div>
          </div>
        </div>
        <div class="reveal d2">
          <div class="eyebrow" style="margin-bottom:14px"><span class="num">TOP 10</span>${isGlobal ? '전체 랭킹' : '로컬 랭킹'}</div>
          ${rankingHtml}
          ${isGlobal ? '' : '<div class="rank-source">Supabase 미설정 — 이 브라우저에만 저장됨</div>'}
        </div>
      </div>
    </section>
  `;
  bindIdForm(id => { clearIdleTimer(); onRestart(id); });
  startIdleTimer(onIdle);
}

function rankingTable({ top, myBest, myRank }, studentId) {
  let rows = top.map((entry, i) => {
    const isMe = entry.student_id === studentId;
    return `<tr class="rank-${i+1}${isMe ? ' highlight' : ''}" style="--i:${i}">
      <td>P${i+1}</td>
      <td>${escapeHtml(entry.student_id)}</td>
      <td>${entry.score.toLocaleString()}</td>
    </tr>`;
  }).join('');

  // Top 10 밖이면 내 순위를 아래에 한 줄 추가
  if(myBest !== null && !top.some(r => r.student_id === studentId)) {
    rows += `<tr class="highlight me-outside" style="--i:${top.length}">
      <td>P${myRank ?? '-'}</td>
      <td>${escapeHtml(studentId)}</td>
      <td>${myBest.toLocaleString()}</td>
    </tr>`;
  }
  return `
    <table class="ranking-table">
      <thead><tr><th>Pos</th><th>학번</th><th>Best</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>`;
}
