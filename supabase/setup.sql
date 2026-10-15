-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 안전)
create table if not exists public.rankings (
  id          bigint generated always as identity primary key,
  client_id   uuid unique,  -- 게임이 만든 ID: 오프라인 재전송 시 중복 저장 방지
  student_id  text not null check (student_id ~ '^[A-Za-z0-9]{2,15}$'),
  score       int  not null check (score >= 0 and score <= 1000000),
  created_at  timestamptz not null default now()
);

-- 예전 버전 SQL 로 이미 테이블을 만든 경우
alter table public.rankings add column if not exists client_id uuid unique;

create index if not exists rankings_score_idx on public.rankings (score desc);
create index if not exists rankings_student_idx on public.rankings (student_id, score desc);

-- anon key 로는 조회와 추가만 허용 (수정/삭제 불가)
alter table public.rankings enable row level security;

drop policy if exists "anon read"   on public.rankings;
drop policy if exists "anon insert" on public.rankings;

create policy "anon read"   on public.rankings for select to anon using (true);
create policy "anon insert" on public.rankings for insert to anon with check (true);
