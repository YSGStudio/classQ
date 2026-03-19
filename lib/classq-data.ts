import {
  answersByQuestion,
  currentStudent,
  questions,
  rooms,
  studentStats,
} from "@/data/mock";
import { getCurrentProfile, getCurrentStudentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";
import { toRelativeKorean } from "@/lib/time";
import type { Answer, Question, Room, StudentStats } from "@/types";

type FeedData = {
  room: Room | null;
  current: { id: string; role: "teacher" | "student"; name: string; score: number };
  questions: Question[];
  unanswered: Question[];
  scoreTop3: StudentStats[];
  ratedTop3: Question[];
  answeredTop3: Question[];
};

function fromMock(code: string): FeedData {
  const room = rooms.find((item) => item.code === code) ?? null;
  const roomQuestions = questions.filter((item) => item.roomCode === code);
  const scoreTop3 = [...studentStats].sort((a, b) => b.score - a.score).slice(0, 3);
  const ratedTop3 = [...roomQuestions].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
  const answeredTop3 = [...roomQuestions]
    .sort((a, b) => b.answerCount - a.answerCount)
    .slice(0, 3);

  return {
    room,
    current: { id: "mock-student", role: "student", ...currentStudent },
    questions: roomQuestions,
    unanswered: roomQuestions.filter((item) => item.answerCount === 0),
    scoreTop3,
    ratedTop3,
    answeredTop3,
  };
}

async function getCurrentDisplayProfile() {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return { id: "mock-student", role: "student" as const, ...currentStudent };
  }

  const studentProfile = await getCurrentStudentProfile();
  const profile = studentProfile ?? (await getCurrentProfile());
  if (!profile) {
    return { id: "mock-student", role: "student" as const, ...currentStudent };
  }

  const admin = createAdminClient();
  const { data: scoreRow } = await admin
    .from("student_scores")
    .select("total_score")
    .eq("student_id", profile.id)
    .single();

  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
    score: scoreRow?.total_score ?? 0,
  };
}

export async function getQuestionBaseDetail(
  code: string,
  questionId: string,
): Promise<{ question: Question | null; admin: ReturnType<typeof createAdminClient> | null }> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const question =
      questions.find((item) => item.roomCode === code && item.id === questionId) ?? null;
    return { question, admin: null };
  }

  const admin = createAdminClient();

  const { data: roomData } = await admin
    .from("rooms")
    .select("id, code")
    .eq("code", code)
    .single();

  if (!roomData) return { question: null, admin };

  const { data: questionRow } = await admin
    .from("questions")
    .select("id, room_id, author_id, content, answer_count, avg_rating, created_at")
    .eq("id", questionId)
    .eq("room_id", roomData.id)
    .single();

  if (!questionRow) return { question: null, admin };

  const { data: authorRow } = await admin
    .from("profiles")
    .select("id, name")
    .eq("id", questionRow.author_id)
    .single();

  return {
    question: {
      id: questionRow.id,
      roomCode: roomData.code,
      roomId: questionRow.room_id,
      authorId: questionRow.author_id,
      author: authorRow?.name ?? "익명",
      content: questionRow.content,
      answerCount: questionRow.answer_count ?? 0,
      avgRating: questionRow.avg_rating ?? 0,
      createdAt: toRelativeKorean(questionRow.created_at),
    },
    admin,
  };
}

export async function getRoomFeedData(code: string): Promise<FeedData> {
  const roomCode = code.trim().toUpperCase();
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) return fromMock(code);

  const admin = createAdminClient();
  const { data: roomData } = await admin
    .from("rooms")
    .select("id, name, subject, code, teacher_id")
    .eq("code", roomCode)
    .single();

  if (!roomData) {
    return {
      room: null,
      current: await getCurrentDisplayProfile(),
      questions: [],
      unanswered: [],
      scoreTop3: [],
      ratedTop3: [],
      answeredTop3: [],
    };
  }

  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("id, room_id, author_id, content, answer_count, avg_rating, created_at")
    .eq("room_id", roomData.id)
    .order("created_at", { ascending: false });

  if (questionError || !questionRows) {
    return {
      room: {
        id: roomData.id,
        name: roomData.name,
        subject: roomData.subject ?? "미지정",
        code: roomData.code,
        teacherName: "담당 교사",
      },
      current: await getCurrentDisplayProfile(),
      questions: [],
      unanswered: [],
      scoreTop3: [],
      ratedTop3: [],
      answeredTop3: [],
    };
  }

  const authorIds = [...new Set(questionRows.map((row) => row.author_id).filter(Boolean))] as string[];
  const questionIds = questionRows.map((row) => row.id);
  const currentPromise = getCurrentDisplayProfile();
  const [authorRowsResult, ratingRowsResult, membersResult, current] = await Promise.all([
    authorIds.length
      ? admin.from("profiles").select("id, name").in("id", authorIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    questionIds.length
      ? admin
          .from("question_ratings")
          .select("question_id, rating")
          .in("question_id", questionIds)
      : Promise.resolve({ data: [] as { question_id: string; rating: number }[] }),
    admin.from("room_members").select("student_id").eq("room_id", roomData.id),
    currentPromise,
  ]);

  const authorMap = new Map((authorRowsResult.data ?? []).map((author) => [author.id, author.name]));

  const mappedQuestions: Question[] = questionRows.map((row) => ({
    id: row.id,
    roomCode: roomData.code,
    roomId: row.room_id,
    authorId: row.author_id,
    author: authorMap.get(row.author_id) ?? "익명",
    content: row.content,
    answerCount: row.answer_count ?? 0,
    avgRating: row.avg_rating ?? 0,
    createdAt: toRelativeKorean(row.created_at),
  }));

  const ratingRows = ratingRowsResult.data;

  const ratingSummary = new Map<string, { total: number; count: number }>();
  for (const row of ratingRows ?? []) {
    const prev = ratingSummary.get(row.question_id) ?? { total: 0, count: 0 };
    ratingSummary.set(row.question_id, {
      total: prev.total + (row.rating ?? 0),
      count: prev.count + 1,
    });
  }

  const questionsWithTotals = mappedQuestions.map((item) => {
    const summary = ratingSummary.get(item.id) ?? { total: 0, count: 0 };
    return {
      ...item,
      ratingTotal: summary.total,
      ratingCount: summary.count,
    };
  });

  const ratedTop3 = [...questionsWithTotals].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
  const answeredTop3 = [...questionsWithTotals]
    .sort((a, b) => b.answerCount - a.answerCount)
    .slice(0, 3);

  const memberIds = [...new Set((membersResult.data ?? []).map((member) => member.student_id))];
  const { data: scoreRows } = memberIds.length
    ? await admin
        .from("student_scores")
        .select("student_id, name, total_score")
        .in("student_id", memberIds)
    : { data: [] as { student_id: string; name: string; total_score: number }[] };

  const scoreTop3: StudentStats[] = (scoreRows ?? [])
    .map((row) => ({
      name: row.name,
      score: row.total_score ?? 0,
      questionCount: 0,
      answerCount: 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const { data: myRatingRows } =
    questionIds.length && current.id
      ? await admin
          .from("question_ratings")
          .select("question_id, rating")
          .eq("rater_id", current.id)
          .in("question_id", questionIds)
      : { data: [] as { question_id: string; rating: number }[] };

  const myRatingMap = new Map((myRatingRows ?? []).map((row) => [row.question_id, row.rating]));

  const questionsWithRatingState = questionsWithTotals.map((item) => ({
    ...item,
    hasRated: myRatingMap.has(item.id),
    myRating: myRatingMap.get(item.id) ?? null,
  }));

  return {
    room: {
      id: roomData.id,
      name: roomData.name,
      subject: roomData.subject ?? "미지정",
      code: roomData.code,
      teacherName: "담당 교사",
    },
    current,
    questions: questionsWithRatingState,
    unanswered: questionsWithRatingState.filter((item) => item.answerCount === 0),
    scoreTop3: scoreTop3.length ? scoreTop3 : [...studentStats].sort((a, b) => b.score - a.score).slice(0, 3),
    ratedTop3,
    answeredTop3,
  };
}

export async function getQuestionDetail(
  code: string,
  questionId: string,
  includeAnswers = true,
): Promise<{ question: Question | null; answers: Answer[] }> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const question =
      questions.find((item) => item.roomCode === code && item.id === questionId) ?? null;
    return { question, answers: answersByQuestion[questionId] ?? [] };
  }

  const { question, admin } = await getQuestionBaseDetail(code, questionId);

  if (!question || !admin) return { question, answers: [] };
  if (!includeAnswers) return { question, answers: [] };

  const { data: answerRows } = await admin
    .from("answers")
    .select("id, question_id, author_id, content, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false });

  if (!answerRows?.length) return { question, answers: [] };

  const answerAuthorIds = [
    ...new Set(answerRows.map((row) => row.author_id).filter(Boolean)),
  ] as string[];
  const { data: answerAuthors } = await admin
    .from("profiles")
    .select("id, name")
    .in("id", answerAuthorIds);

  const answerAuthorMap = new Map(
    (answerAuthors ?? []).map((author) => [author.id, author.name]),
  );

  const { data: scoreRows } = await admin
    .from("answer_scores")
    .select("answer_id, score")
    .in("answer_id", answerRows.map((row) => row.id));

  const scoreMap = new Map((scoreRows ?? []).map((row) => [row.answer_id, row.score]));

  const answers: Answer[] = answerRows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    author: answerAuthorMap.get(row.author_id) ?? "익명",
    content: row.content,
    score: scoreMap.get(row.id),
    createdAt: toRelativeKorean(row.created_at),
  }));

  return { question, answers };
}

export async function getQuestionAnswers(questionId: string): Promise<Answer[]> {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return answersByQuestion[questionId] ?? [];
  }

  const admin = createAdminClient();
  const { data: answerRows } = await admin
    .from("answers")
    .select("id, question_id, author_id, content, created_at")
    .eq("question_id", questionId)
    .order("created_at", { ascending: false });

  if (!answerRows?.length) return [];

  const answerAuthorIds = [
    ...new Set(answerRows.map((row) => row.author_id).filter(Boolean)),
  ] as string[];
  const { data: answerAuthors } = await admin
    .from("profiles")
    .select("id, name")
    .in("id", answerAuthorIds);

  const answerAuthorMap = new Map(
    (answerAuthors ?? []).map((author) => [author.id, author.name]),
  );

  const { data: scoreRows } = await admin
    .from("answer_scores")
    .select("answer_id, score")
    .in("answer_id", answerRows.map((row) => row.id));

  const scoreMap = new Map((scoreRows ?? []).map((row) => [row.answer_id, row.score]));

  return answerRows.map((row) => ({
    id: row.id,
    questionId: row.question_id,
    author: answerAuthorMap.get(row.author_id) ?? "익명",
    content: row.content,
    score: scoreMap.get(row.id),
    createdAt: toRelativeKorean(row.created_at),
  }));
}
