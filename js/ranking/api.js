import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config.js';

// Supabase 설정 전에는 localStorage 로 동작
const sb = (window.supabase && !SUPABASE_URL.includes('YOUR-PROJECT'))
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export const isGlobal = !!sb;

// 학번별 최고 점수만 남김 (score 내림차순 정렬된 rows 기준)
function bestPerStudent(rows) {
  const seen = new Set();
  return rows.filter(r => !seen.has(r.student_id) && seen.add(r.student_id));
}

const byScoreDesc = (a, b) => b.score - a.score;

function readJson(key) {
  try { return JSON.parse(localStorage.getItem(key)) || []; } catch(e) { return []; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch(e) {}
}

// ─── Supabase 미설정 시 로컬 랭킹 ──────────────────────────────
const RANK_KEY = 'blockblast_ranking_v2';
function saveLocalRow(id, score) {
  const rows = readJson(RANK_KEY);
  rows.push({ student_id: id, score });
  rows.sort(byScoreDesc);
  writeJson(RANK_KEY, rows.slice(0, 200));
}

// ─── 오프라인 대기열 ──────────────────────────────────────────
// 네트워크 문제로 저장 못 한 점수를 보관 → flushQueue() 로 재전송.
// client_id(UUID) 로 중복 저장 방지 (응답만 유실되고 실제로는 저장된 경우 대비)
const QUEUE_KEY = 'blockblast_pending_v1';
const loadQueue = () => readJson(QUEUE_KEY);

export const pendingCount = () => (sb ? loadQueue().length : 0);

const uuid = () => crypto.randomUUID?.() ??
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random()*16 | 0;
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
  });

// Postgres 가 거부한 오류(제약 위반 등)는 재시도해도 소용없음 — 네트워크 오류와 구분
const isRejected = err => /^[0-9A-Z]{5}$/.test(err?.code ?? '');

async function insertRow(row) {
  const { error } = await sb.from('rankings')
    .upsert(row, { onConflict: 'client_id', ignoreDuplicates: true });
  if(error) throw error;
}

let flushing = null;
export function flushQueue() {
  if(!sb) return Promise.resolve(0);
  // 동시에 여러 번 호출돼도 한 번만 실행
  flushing ??= (async () => {
    let sent = 0;
    for(const row of loadQueue()) {
      try {
        await insertRow(row);
        sent++;
      } catch(e) {
        if(!isRejected(e)) break;   // 아직 오프라인 → 다음 기회에
        console.error('rejected queued score', row, e);
      }
      writeJson(QUEUE_KEY, loadQueue().filter(r => r.client_id !== row.client_id));
    }
    return sent;
  })().finally(() => { flushing = null; });
  return flushing;
}

// returns 'saved' | 'queued' (오프라인, 나중에 자동 저장) | 'rejected'
export async function submitScore(id, score) {
  if(!sb) { saveLocalRow(id, score); return 'saved'; }
  const row = { client_id: uuid(), student_id: id, score };
  try {
    await insertRow(row);
    flushQueue(); // 연결된 김에 밀린 점수도 전송
    return 'saved';
  } catch(e) {
    console.error(e);
    if(isRejected(e)) return 'rejected';
    writeJson(QUEUE_KEY, [...loadQueue(), row]);
    return 'queued';
  }
}

// returns { top: [{student_id, score}] (≤10), myBest: number|null, myRank: number|null }
// 아직 전송 못 한 점수도 랭킹에 포함해서 보여줌
export async function fetchRanking(id) {
  if(!sb) return rankFrom(readJson(RANK_KEY), id);

  const [topRes, mineRes] = await Promise.all([
    sb.from('rankings').select('student_id, score').order('score', { ascending: false }).limit(200),
    sb.from('rankings').select('score').eq('student_id', id).order('score', { ascending: false }).limit(1),
  ]);
  if(topRes.error) throw topRes.error;
  if(mineRes.error) throw mineRes.error;

  const pending = loadQueue();
  const top = bestPerStudent([...topRes.data, ...pending].sort(byScoreDesc)).slice(0, 10);
  const myScores = [...mineRes.data, ...pending.filter(r => r.student_id === id)].map(r => r.score);
  const myBest = myScores.length ? Math.max(...myScores) : null;

  let myRank = null;
  const inTop = top.findIndex(r => r.student_id === id);
  if(inTop >= 0) {
    myRank = inTop + 1;
  } else if(myBest !== null) {
    // 내 최고점보다 높은 점수를 가진 학번 수 + 1
    const { data, error } = await sb.from('rankings').select('student_id').gt('score', myBest).limit(1000);
    if(!error) myRank = new Set(data.map(r => r.student_id)).size + 1;
  }
  return { top, myBest, myRank };
}

function rankFrom(rows, id) {
  const all = bestPerStudent([...rows].sort(byScoreDesc));
  const idx = all.findIndex(r => r.student_id === id);
  return { top: all.slice(0, 10), myBest: idx>=0 ? all[idx].score : null, myRank: idx>=0 ? idx+1 : null };
}
