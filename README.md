# Handleblast

웹캠 손 제스처로 조작하는 8×8 블록 퍼즐 게임 (SW Week 전시작)

- 🖐 손 펴기 → 블록 이동
- ✊ 주먹 쥐기 → 블록 설치
- 가로/세로 한 줄을 채우면 클리어, 연속 클리어 시 콤보
- 제한 시간 2분, 학번별 랭킹 (Supabase)

## 실행

빌드 과정 없는 정적 사이트입니다. 웹캠과 ES 모듈 때문에 `file://` 로는 열리지 않으니 로컬 서버나 HTTPS 에서 실행하세요.

```bash
python -m http.server 5500
# → http://localhost:5500
```

VS Code 의 Live Server 확장으로 열어도 됩니다.

## 랭킹 설정 (Supabase)

1. Supabase 프로젝트 생성 → SQL Editor 에서 [`supabase/setup.sql`](supabase/setup.sql) 실행
2. [`js/config.js`](js/config.js) 의 `SUPABASE_URL`, `SUPABASE_ANON_KEY` 입력

설정 전에는 브라우저 localStorage 에 로컬 랭킹으로 저장됩니다.

## 구조

```
index.html          화면 마크업
css/style.css       스타일
js/
  main.js           진입점, 게임 진행 단계 / 타이머 / 방치 처리
  config.js         모든 설정값 (Supabase, 제한 시간, 제스처 감도 등)
  game/             보드 상태, 블록, 설치·클리어·점수 로직
  hand/             웹캠 + MediaPipe 손 인식, 커서 보정
  render/           캔버스 레이아웃, 보드/트레이 그리기, 이펙트
  ranking/          Supabase 랭킹 + 오프라인 저장 대기열
  ui/               HUD, 시작/결과 화면
supabase/setup.sql  랭킹 테이블 생성 SQL
```

## 기술

MediaPipe Hands · HTML Canvas · Supabase · 순수 JavaScript (ES 모듈)
