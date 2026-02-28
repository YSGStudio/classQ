import { questions, rooms } from "@/data/mock";
import { getCurrentProfile } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { toRelativeKorean } from "@/lib/time";
import type { Question, Room } from "@/types";
import { createServerClient } from "@/utils/supabase/server";

export type TeacherRoomView = {
  room: Room | null;
  questions: Question[];
};

export async function getTeacherRoomView(roomId: string): Promise<TeacherRoomView> {
  if (!hasSupabaseEnv()) {
    const room = rooms.find((item) => item.id === roomId) ?? rooms[0];
    return {
      room,
      questions: questions.filter((question) => question.roomCode === room.code),
    };
  }

  const supabase = await createServerClient();
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    return {
      room: null,
      questions: [],
    };
  }

  const { data: roomData } = await supabase
    .from("rooms")
    .select("id, name, subject, code, is_active, teacher_id")
    .eq("id", roomId)
    .eq("teacher_id", profile.id)
    .maybeSingle();

  if (!roomData) {
    return {
      room: null,
      questions: [],
    };
  }

  const { data: questionRows } = await supabase
    .from("questions")
    .select("id, room_id, author_id, content, answer_count, avg_rating, created_at")
    .eq("room_id", roomId)
    .order("created_at", { ascending: false });

  const authorIds = [...new Set((questionRows ?? []).map((row) => row.author_id))];
  const { data: authors } = authorIds.length
    ? await supabase.from("profiles").select("id, name").in("id", authorIds)
    : { data: [] as { id: string; name: string }[] };

  const authorMap = new Map((authors ?? []).map((author) => [author.id, author.name]));

  const mappedQuestions: Question[] = (questionRows ?? []).map((row) => ({
    id: row.id,
    roomCode: roomData.code,
    roomId: row.room_id,
    author: authorMap.get(row.author_id) ?? "익명",
    content: row.content,
    createdAt: toRelativeKorean(row.created_at),
    avgRating: row.avg_rating ?? 0,
    answerCount: row.answer_count ?? 0,
  }));

  return {
    room: {
      id: roomData.id,
      name: roomData.name,
      subject: roomData.subject ?? "미지정",
      code: roomData.code,
      teacherName: profile.name,
      isActive: roomData.is_active,
    },
    questions: mappedQuestions,
  };
}
