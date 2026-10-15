// ─── 손 위치 → 보드 칸 변환 (떨림 보정 + 주먹 직전 위치 고정) ─────

const clampInt = (v, n) => Math.max(0, Math.min(n-1, Math.floor(v)));

/**
 * smoothing   0~1, 클수록 손을 빠르게 따라감 (지수 이동 평균)
 * hysteresis  칸 경계를 넘어 이 비율(칸 단위)만큼 더 가야 칸이 바뀜
 * lockLookback 주먹을 쥘 때, 마지막으로 편 손 위치보다 N 프레임 전 위치에 설치
 */
export function createCursor({ cols, rows, smoothing, hysteresis, lockLookback }) {
  let sx = null, sy = null;      // 보정된 정규화 좌표
  let col = null, row = null;    // 현재 칸
  const openHistory = [];        // 손을 편 상태의 최근 칸들

  // 현재 칸 기준으로 경계 + 여유를 넘어야 새 칸으로 이동
  function snap(p, cur, n) {
    if(cur === null || p < cur - hysteresis || p >= cur + 1 + hysteresis) return clampInt(p, n);
    return cur;
  }

  return {
    // 손이 사라지거나 가장자리에 걸치면 초기화 (다시 들어올 때 이전 위치에서 끌려오지 않게)
    reset() {
      sx = sy = col = row = null;
      openHistory.length = 0;
    },

    // nx, ny: 0~1 정규화 좌표 → 현재 칸
    update(nx, ny) {
      sx = sx === null ? nx : sx + (nx - sx) * smoothing;
      sy = sy === null ? ny : sy + (ny - sy) * smoothing;
      col = snap(sx * cols, col, cols);
      row = snap(sy * rows, row, rows);
      return { col, row };
    },

    // 손을 편 프레임마다 호출
    markOpen() {
      openHistory.push({ col, row });
      if(openHistory.length > lockLookback + 1) openHistory.shift();
    },

    // 주먹을 쥐기 시작했을 때 설치할 칸 (쥐는 동안의 손목 흔들림 무시)
    lockedCell() {
      return openHistory[0] ? { ...openHistory[0] } : { col, row };
    },
  };
}
