import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";
import { toRelativeKorean } from "@/lib/time";
import { createServerClient } from "@/utils/supabase/server";

type StudentQuestionCard = {
  id: string;
  content: string;
  createdAt: string;
  avgRating: number;
  answerCount: number;
};

export type TeacherRoomStudentStats = {
  studentId: string;
  studentName: string;
  score: number;
  questions: StudentQuestionCard[];
};

export type TeacherRoomStatsView = {
  room: {
    id: string;
    name: string;
    subject: string;
    code: string;
  } | null;
  students: TeacherRoomStudentStats[];
};

export async function getTeacherRoomStatsView(roomId: string): Promise<TeacherRoomStatsView> {
  if (!hasSupabaseEnv()) {
    return {
      room: null,
      students: [],
    };
  }

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return {
      room: null,
      students: [],
    };
  }

  const supabase =
    process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createServerClient();

  const { data: roomData } = await supabase
    .from("rooms")
    .select("id, name, subject, code, teacher_id")
    .eq("id", roomId)
    .eq("teacher_id", profile.id)
    .maybeSingle();

  if (!roomData) {
    return {
      room: null,
      students: [],
    };
  }

  const { data: members } = await supabase
    .from("room_members")
    .select("student_id")
    .eq("room_id", roomId);

  const memberIds = [...new Set((members ?? []).map((item) => item.student_id))];
  const memberIdSet = new Set(memberIds);
  if (memberIds.length === 0) {
    return {
      room: {
        id: roomData.id,
        name: roomData.name,
        subject: roomData.subject ?? "미지정",
        code: roomData.code,
      },
      students: [],
    };
  }

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, name")
    .in("id", memberIds)
    .eq("role", "student");

  const nameMap = new Map((profiles ?? []).map((p) => [p.id, p.name]));

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, author_id, content, created_at, avg_rating, answer_count")
    .eq("room_id", roomId)
    .in("author_id", memberIds)
    .order("created_at", { ascending: false });

  const { data: roomQuestionRows } = await supabase
    .from("questions")
    .select("id")
    .eq("room_id", roomId);

  const roomQuestionIds = (roomQuestionRows ?? []).map((row) => row.id);
  const { data: answerRows } = roomQuestionIds.length
    ? await supabase
        .from("answers")
        .select("id, author_id, question_id")
        .in("question_id", roomQuestionIds)
    : { data: [] as { id: string; author_id: string; question_id: string }[] };

  const answerIds = (answerRows ?? []).map((row) => row.id);
  const { data: scoreRows } = answerIds.length
    ? await supabase.from("answer_scores").select("answer_id, score").in("answer_id", answerIds)
    : { data: [] as { answer_id: string; score: number }[] };

  const scoreByAnswerId = new Map((scoreRows ?? []).map((row) => [row.answer_id, row.score]));
  const scoreByStudentId = new Map<string, number>();
  for (const answer of answerRows ?? []) {
    if (!memberIdSet.has(answer.author_id)) continue;
    const score = scoreByAnswerId.get(answer.id) ?? 0;
    scoreByStudentId.set(answer.author_id, (scoreByStudentId.get(answer.author_id) ?? 0) + score);
  }

  const questionsByStudentId = new Map<string, StudentQuestionCard[]>();
  for (const row of questionRows ?? []) {
    const cards = questionsByStudentId.get(row.author_id) ?? [];
    cards.push({
      id: row.id,
      content: row.content,
      createdAt: toRelativeKorean(row.created_at),
      avgRating: row.avg_rating ?? 0,
      answerCount: row.answer_count ?? 0,
    });
    questionsByStudentId.set(row.author_id, cards);
  }

  const stats = memberIds
    .map((studentId) => ({
      studentId,
      studentName: nameMap.get(studentId) ?? "이름 없음",
      score: scoreByStudentId.get(studentId) ?? 0,
      questions: questionsByStudentId.get(studentId) ?? [],
    }))
    .sort((a, b) => a.studentName.localeCompare(b.studentName, "ko"));

  return {
    room: {
      id: roomData.id,
      name: roomData.name,
      subject: roomData.subject ?? "미지정",
      code: roomData.code,
    },
    students: stats,
  };
}
