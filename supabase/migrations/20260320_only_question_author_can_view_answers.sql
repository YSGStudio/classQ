drop policy if exists "limited read answers" on public.answers;
drop policy if exists "room members read answers" on public.answers;
drop policy if exists "question author reads answers" on public.answers;

create policy "question author reads answers" on public.answers
for select using (
  exists (
    select 1
    from public.questions q
    where q.id = question_id
      and q.author_id = auth.uid()
  )
);

drop policy if exists "teacher or question author score answer" on public.answer_scores;
drop policy if exists "read answer scores if can read answers" on public.answer_scores;
drop policy if exists "read answer scores if room member" on public.answer_scores;
drop policy if exists "read answer scores if question author" on public.answer_scores;
drop policy if exists "question author score answer" on public.answer_scores;

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
