import { currentStudent, questions } from "@/data/mock";
import { getCurrentStudentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { toRelativeKorean } from "@/lib/time";
import type { Question } from "@/types";
import { createServerClient } from "@/utils/supabase/server";

type StudentProfileData = {
  name: string;
  score: number;
  questions: Question[];
};

export async function getStudentProfileData(): Promise<StudentProfileData> {
  if (!hasSupabaseEnv()) {
    return {
      name: currentStudent.name,
      score: currentStudent.score,
      questions: questions.filter((question) => question.author === currentStudent.name),
    };
  }

  const profile = await getCurrentStudentProfile();
  if (!profile || profile.role !== "student") {
    return {
      name: currentStudent.name,
      score: 0,
      questions: [],
    };
  }

  const supabase = await createServerClient();

  const { data: scoreRow } = await supabase
    .from("student_scores")
    .select("total_score")
    .eq("student_id", profile.id)
    .single();

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, room_id, content, answer_count, avg_rating, created_at, rooms(code)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  const mappedQuestions: Question[] = (questionRows ?? []).map((row) => ({
    // Supabase relation typing may come as object or object[] depending on query planner.
    roomCode: (() => {
      const rel = row.rooms as { code: string } | { code: string }[] | null;
      return Array.isArray(rel) ? rel[0]?.code ?? "UNKNOWN" : rel?.code ?? "UNKNOWN";
    })(),
    id: row.id,
    roomId: row.room_id,
    author: profile.name,
    content: row.content,
    createdAt: toRelativeKorean(row.created_at),
    avgRating: row.avg_rating ?? 0,
    answerCount: row.answer_count ?? 0,
  }));

  return {
    name: profile.name,
    score: scoreRow?.total_score ?? 0,
    questions: mappedQuestions,
  };
}
