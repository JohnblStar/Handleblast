// ─── 게임/외부 서비스 설정 (값 변경은 여기서만) ───────────────

// Supabase 대시보드 → Project Settings → API 에서 복사
export const SUPABASE_URL = 'https://YOUR-PROJECT.supabase.co';
export const SUPABASE_ANON_KEY = 'YOUR-ANON-KEY';

export const COLS = 8, ROWS = 8;

export const BLOCK_COLORS = [
  '#fed60a','#ff3b30','#2f6bff','#f2f2f2','#ff8a00','#00c2a8','#b36bff'
];

export const LEVELS = [
  { minScore: 0,    label: 'LV.1', bigBlockChance: 0.2 },
  { minScore: 300,  label: 'LV.2', bigBlockChance: 0.3 },
  { minScore: 700,  label: 'LV.3', bigBlockChance: 0.45 },
  { minScore: 1200, label: 'LV.4', bigBlockChance: 0.6 },
  { minScore: 2000, label: 'LV.5', bigBlockChance: 0.75 },
];

export const SCORE = { perLine: 100, perPlace: 10 };

export const HAND = {
  cdn: 'https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1646424915',
  detectIntervalMs: 66,     // 손 인식 주기 (~15fps)
  grabCooldown: 20,         // 설치 후 재설치까지 인식 횟수
  fistConfirmFrames: 2,     // 주먹이 연속 N회 인식돼야 설치 (오인식 방지)
  edgeMargin: 0.02,         // 랜드마크가 화면 가장자리 이 범위 안에 있으면 '화면 밖'으로 판단
  // 손목이 이 영역(미러 기준, 0~1) 안에서 움직이면 보드 전체에 매핑.
  // 가장자리까지 손을 뻗지 않아도 보드 끝에 닿도록 → 손이 화면 밖으로 잘 안 나감
  area: { x0: 0.15, x1: 0.85, y0: 0.3, y1: 0.9 },
  smoothing: 0.5,           // 커서 따라가는 속도 (0~1, 작을수록 부드럽지만 느림)
  hysteresis: 0.25,         // 칸 경계에서 이만큼(칸 단위) 더 넘어가야 칸 이동 → 경계 떨림 방지
  lockLookback: 2,          // 주먹 쥐기 직전 N 프레임 전 위치에 설치 (~0.13초)
  options: {
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6,
  },
};

export const GAME = {
  timeLimitSec: 120,        // 제한 시간 (0 = 무제한). 첫 손 인식 시점부터 카운트
  urgentSec: 10,            // 남은 시간이 이 이하면 빨간색 경고
};

export const IDLE = {
  gameMs: 45000,            // 게임 중 손이 이 시간 동안 안 보이면 자동 종료 (점수 저장)
  warnMs: 30000,            // 손이 안 보인 지 이 시간이 지나면 남은 초 안내
  resultMs: 30000,          // 결과 화면에서 입력이 없으면 시작 화면으로
};

export const QUEUE_FLUSH_MS = 30000; // 저장 실패한 점수 재전송 주기

export const STUDENT_ID_RE = /^[A-Za-z0-9]{2,15}$/;
