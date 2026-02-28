# ClassQ

초등학교 교육용 Q&A 플랫폼입니다.

## Local 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://localhost:3000` 접속.

## 필수 환경변수

```bash
cp .env.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
STUDENT_SESSION_SECRET=...
```

## Supabase 초기화

Supabase SQL Editor에서 순서대로 실행:

1. `supabase/schema.sql`
2. `supabase/rls.sql`

기존 DB를 이미 사용 중이라면 추가 마이그레이션:

```sql
alter table public.profiles add column if not exists teacher_id uuid references public.profiles(id);
alter table public.profiles drop column if exists qr_token;
create index if not exists idx_profiles_teacher_id on public.profiles(teacher_id);
```

## 배포 전 체크

```bash
npm run verify:env
npm run check
npm run predeploy
```

- `verify:env`: 배포 환경 변수 누락 검사 (CI/production에서 강제)
- `check`: lint + typecheck + build
- `predeploy`: verify-env + check 일괄 실행

## Vercel 배포

### 1) Git 연결 배포

1. Vercel에서 프로젝트 생성
2. `classq` 디렉토리 루트로 설정
3. Environment Variables에 위 4개 변수 등록
4. Deploy

### 2) CLI 배포

```bash
npm i -g vercel
vercel login
vercel --prod
```

## 운영 헬스체크

- 앱 상태: `GET /api/health`
- DB 상태: `GET /api/health/db`

## 주요 API

- `GET /api/rooms/by-code/:code/students`
- `POST /api/student/session`
- `DELETE /api/student/session`
- `POST /api/questions`
- `POST /api/questions/:id/rate`
- `POST /api/questions/:id/answers`
- `POST /api/answers/:id/score`
- `GET /api/me/score`
- `GET /api/teacher/rooms`
- `POST /api/teacher/rooms`
- `PATCH /api/teacher/rooms/:id`
- `DELETE /api/teacher/rooms/:id`
- `GET /api/teacher/rooms/:id/students`
- `POST /api/teacher/rooms/:id/students`
- `DELETE /api/teacher/rooms/:id/students/:studentId`
- `POST /api/teacher/signup`
- `GET /api/teacher/students`
- `POST /api/teacher/students`
- `DELETE /api/teacher/students/:studentId`
