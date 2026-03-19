-- ClassQ base schema
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('teacher', 'student')),
  teacher_id uuid references public.profiles(id),
  name text not null,
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists teacher_id uuid references public.profiles(id);
alter table public.profiles drop column if exists qr_token;
create index if not exists idx_profiles_teacher_id on public.profiles(teacher_id);

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id),
  name text not null,
  subject text,
  code char(6) not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.room_members (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(room_id, student_id)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  answer_count int not null default 0,
  avg_rating float not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  author_id uuid not null references public.profiles(id),
  content text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.answer_scores (
  id uuid primary key default gen_random_uuid(),
  answer_id uuid not null references public.answers(id) on delete cascade,
  grader_id uuid not null references public.profiles(id),
  score int not null check (score between 1 and 5),
  created_at timestamptz not null default now(),
  unique(answer_id)
);

create table if not exists public.question_ratings (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.questions(id) on delete cascade,
  rater_id uuid not null references public.profiles(id),
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  unique(question_id, rater_id)
);

create or replace view public.student_scores as
select
  p.id as student_id,
  p.name,
  coalesce(sum(s.score), 0)::int as total_score
from public.profiles p
left join public.answers a on a.author_id = p.id
left join public.answer_scores s on s.answer_id = a.id
where p.role = 'student'
group by p.id, p.name;

create or replace view public.room_student_scores as
select
  q.room_id,
  a.author_id as student_id,
  coalesce(sum(s.score), 0)::int as total_score
from public.answers a
join public.questions q on q.id = a.question_id
left join public.answer_scores s on s.answer_id = a.id
group by q.room_id, a.author_id;

create or replace function public.sync_question_answer_count()
returns trigger
language plpgsql
as $$
begin
  update public.questions
  set answer_count = (
    select count(*)::int from public.answers where question_id = coalesce(new.question_id, old.question_id)
  )
  where id = coalesce(new.question_id, old.question_id);

  return null;
end;
$$;

create or replace function public.sync_question_avg_rating()
returns trigger
language plpgsql
as $$
begin
  update public.questions
  set avg_rating = coalesce((
    select round(avg(rating)::numeric, 1)::float
    from public.question_ratings
    where question_id = coalesce(new.question_id, old.question_id)
  ), 0)
  where id = coalesce(new.question_id, old.question_id);

  return null;
end;
$$;

drop trigger if exists trg_sync_answer_count_ins on public.answers;
drop trigger if exists trg_sync_answer_count_del on public.answers;
create trigger trg_sync_answer_count_ins
after insert on public.answers
for each row execute function public.sync_question_answer_count();
create trigger trg_sync_answer_count_del
after delete on public.answers
for each row execute function public.sync_question_answer_count();

drop trigger if exists trg_sync_avg_rating_insupd on public.question_ratings;
drop trigger if exists trg_sync_avg_rating_del on public.question_ratings;
create trigger trg_sync_avg_rating_insupd
after insert or update on public.question_ratings
for each row execute function public.sync_question_avg_rating();
create trigger trg_sync_avg_rating_del
after delete on public.question_ratings
for each row execute function public.sync_question_avg_rating();
