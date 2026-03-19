alter table public.profiles
  add column if not exists teacher_id uuid references public.profiles(id);

alter table public.profiles
  drop column if exists qr_token;

create index if not exists idx_profiles_teacher_id
  on public.profiles(teacher_id);
