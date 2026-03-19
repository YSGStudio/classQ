create or replace view public.room_student_scores as
select
  q.room_id,
  a.author_id as student_id,
  coalesce(sum(s.score), 0)::int as total_score
from public.answers a
join public.questions q on q.id = a.question_id
left join public.answer_scores s on s.answer_id = a.id
group by q.room_id, a.author_id;
