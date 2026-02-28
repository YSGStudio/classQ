import {
  rooms,
  studentStats,
  topAnsweredQuestions,
  topRatedQuestions,
  topScoreStudents,
} from "@/data/mock";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { toRelativeKorean } from "@/lib/time";
import type { Question, Room, StudentStats } from "@/types";
import { createServerClient } from "@/utils/supabase/server";

type TeacherDashboardData = {
  rooms: Room[];
  studentStats: StudentStats[];
  topScoreStudents: StudentStats[];
  topRatedQuestions: Question[];
  topAnsweredQuestions: Question[];
};

export async function getTeacherDashboardData(): Promise<TeacherDashboardData> {
  if (!hasSupabaseEnv()) {
    return {
      rooms,
      studentStats,
      topScoreStudents,
      topRatedQuestions,
      topAnsweredQuestions,
    };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return {
      rooms: [],
      studentStats: [],
      topScoreStudents: [],
      topRatedQuestions: [],
      topAnsweredQuestions: [],
    };
  }

  const supabase = await createServerClient();
  const { data: roomRows } = await supabase
    .from("rooms")
    .select("id, name, subject, code, is_active")
    .eq("teacher_id", profile.id)
    .order("created_at", { ascending: false });

  const mappedRooms: Room[] = (roomRows ?? []).map((room) => ({
    id: room.id,
    name: room.name,
    subject: room.subject ?? "미지정",
    code: room.code,
    teacherName: profile.name,
    isActive: room.is_active,
  }));

  const roomIds = mappedRooms.map((room) => room.id);
  if (roomIds.length === 0) {
    return {
      rooms: [],
      studentStats: [],
      topScoreStudents: [],
      topRatedQuestions: [],
      topAnsweredQuestions: [],
    };
  }

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, room_id, author_id, content, answer_count, avg_rating, created_at")
    .in("room_id", roomIds)
    .order("created_at", { ascending: false });

  const questionAuthorIds = [
    ...new Set((questionRows ?? []).map((row) => row.author_id).filter(Boolean)),
  ] as string[];

  const { data: questionAuthors } = questionAuthorIds.length
    ? await supabase.from("profiles").select("id, name").in("id", questionAuthorIds)
    : { data: [] as { id: string; name: string }[] };

  const authorMap = new Map((questionAuthors ?? []).map((row) => [row.id, row.name]));
  const roomCodeMap = new Map(mappedRooms.map((room) => [room.id, room.code]));

  const mappedQuestions: Question[] = (questionRows ?? []).map((row) => ({
    id: row.id,
    roomCode: roomCodeMap.get(row.room_id) ?? "UNKNOWN",
    roomId: row.room_id,
    author: authorMap.get(row.author_id) ?? "익명",
    content: row.content,
    createdAt: toRelativeKorean(row.created_at),
    avgRating: row.avg_rating ?? 0,
    answerCount: row.answer_count ?? 0,
  }));

  const topRated = [...mappedQuestions].sort((a, b) => b.avgRating - a.avgRating).slice(0, 3);
  const topAnswered = [...mappedQuestions]
    .sort((a, b) => b.answerCount - a.answerCount)
    .slice(0, 3);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .eq("role", "student")
    .eq("teacher_id", profile.id);

  const studentIds = (profiles ?? []).map((p) => p.id);

  const { data: scores } = studentIds.length
    ? await supabase
        .from("student_scores")
        .select("student_id, total_score")
        .in("student_id", studentIds)
    : { data: [] as { student_id: string; total_score: number }[] };

  const { data: answers } = studentIds.length
    ? await supabase
        .from("answers")
        .select("author_id")
        .in("author_id", studentIds)
    : { data: [] as { author_id: string }[] };

  const questionCountMap = new Map<string, number>();
  for (const row of questionRows ?? []) {
    const authorId = row.author_id;
    questionCountMap.set(authorId, (questionCountMap.get(authorId) ?? 0) + 1);
  }

  const answerCountMap = new Map<string, number>();
  for (const row of answers ?? []) {
    answerCountMap.set(row.author_id, (answerCountMap.get(row.author_id) ?? 0) + 1);
  }

  const scoreMap = new Map((scores ?? []).map((row) => [row.student_id, row.total_score]));

  const stats: StudentStats[] = (profiles ?? []).map((p) => ({
    name: p.name,
    score: scoreMap.get(p.id) ?? 0,
    questionCount: questionCountMap.get(p.id) ?? 0,
    answerCount: answerCountMap.get(p.id) ?? 0,
  }));

  const topScore = [...stats].sort((a, b) => b.score - a.score).slice(0, 3);

  return {
    rooms: mappedRooms,
    studentStats: stats,
    topScoreStudents: topScore,
    topRatedQuestions: topRated,
    topAnsweredQuestions: topAnswered,
  };
}
