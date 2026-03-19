-- Enable RLS
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.room_members enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.answer_scores enable row level security;
alter table public.question_ratings enable row level security;

-- Helpers
create or replace function public.is_teacher(uid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = uid and p.role = 'teacher'
  );
$$;

create or replace function public.is_room_member(uid uuid, rid uuid)
returns boolean
language sql
stable
as $$
  select exists (
    select 1
    from public.room_members rm
    where rm.student_id = uid and rm.room_id = rid
  )
  or exists (
    select 1
    from public.rooms r
    where r.id = rid and r.teacher_id = uid
  );
$$;

-- profiles
create policy "read own profile" on public.profiles
for select using (auth.uid() = id);

create policy "teacher reads own students" on public.profiles
for select using (
  teacher_id = auth.uid()
);

create policy "teacher manages own student profiles" on public.profiles
for all using (
  teacher_id = auth.uid()
) with check (
  teacher_id = auth.uid()
);

-- rooms
create policy "teacher manages own rooms" on public.rooms
for all using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "student reads joined rooms" on public.rooms
for select using (
  exists (
    select 1 from public.room_members rm
    where rm.room_id = id and rm.student_id = auth.uid()
  )
);

-- room_members
create policy "teacher reads room members" on public.room_members
for select using (
  exists (
    select 1 from public.rooms r
    where r.id = room_id and r.teacher_id = auth.uid()
  )
);

create policy "teacher writes room members" on public.room_members
for insert with check (
  exists (
    select 1 from public.rooms r
    where r.id = room_id and r.teacher_id = auth.uid()
  )
);

create policy "teacher deletes room members" on public.room_members
for delete using (
  exists (
    select 1 from public.rooms r
    where r.id = room_id and r.teacher_id = auth.uid()
  )
);

-- questions
create policy "room members read questions" on public.questions
for select using (public.is_room_member(auth.uid(), room_id));

create policy "students write questions" on public.questions
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'student'
  )
  and public.is_room_member(auth.uid(), room_id)
);

-- answers (질문 작성자만 읽기)
create policy "question author reads answers" on public.answers
for select using (
  exists (
    select 1 from public.questions q
    where q.id = question_id
      and q.author_id = auth.uid()
  )
);

create policy "room members write answers" on public.answers
for insert with check (
  author_id = auth.uid()
  and exists (
    select 1
    from public.questions q
    where q.id = question_id
      and public.is_room_member(auth.uid(), q.room_id)
  )
);

-- answer_scores: 교사 또는 질문 작성자만
create policy "question author score answer" on public.answer_scores
for insert with check (
  exists (
    select 1
    from public.answers a
    join public.questions q on q.id = a.question_id
    where a.id = answer_id
      and q.author_id = auth.uid()
  )
);

create policy "read answer scores if question author" on public.answer_scores
for select using (
  exists (
    select 1
    from public.answers a
    join public.questions q on q.id = a.question_id
    where a.id = answer_id
      and q.author_id = auth.uid()
  )
);

-- question_ratings: 자기 질문 제외
create policy "room members rate questions except own" on public.question_ratings
for insert with check (
  rater_id = auth.uid()
  and exists (
    select 1
    from public.questions q
    where q.id = question_id
      and q.author_id <> auth.uid()
      and public.is_room_member(auth.uid(), q.room_id)
  )
);

create policy "read ratings if room member" on public.question_ratings
for select using (
  exists (
    select 1
    from public.questions q
    where q.id = question_id
      and public.is_room_member(auth.uid(), q.room_id)
  )
);
