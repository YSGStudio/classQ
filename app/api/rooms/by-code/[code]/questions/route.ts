import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveActor } from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase-admin";
import { toRelativeKorean } from "@/lib/time";

export async function GET(
  request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const actor = await resolveActor(request);
  const { code } = await context.params;
  const roomCode = code.trim().toUpperCase();

  if (!roomCode) {
    return NextResponse.json({ error: "방 코드가 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 질문 목록 조회를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: room } = await admin
    .from("rooms")
    .select("id, code")
    .eq("code", roomCode)
    .single();

  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: questionRows, error: questionError } = await admin
    .from("questions")
    .select("id, room_id, author_id, content, answer_count, avg_rating, created_at")
    .eq("room_id", room.id)
    .order("created_at", { ascending: false });

  if (questionError) {
    return NextResponse.json({ error: "질문 목록 조회 실패" }, { status: 500 });
  }

  const authorIds = [
    ...new Set((questionRows ?? []).map((row) => row.author_id).filter(Boolean)),
  ] as string[];

  const { data: authors } = authorIds.length
    ? await admin.from("profiles").select("id, name").in("id", authorIds)
    : { data: [] as { id: string; name: string }[] };

  const authorMap = new Map((authors ?? []).map((author) => [author.id, author.name]));

  const questionIds = (questionRows ?? []).map((row) => row.id);
  const { data: ratingRows } = questionIds.length
    ? await admin
        .from("question_ratings")
        .select("question_id, rating")
        .in("question_id", questionIds)
    : { data: [] as { question_id: string; rating: number }[] };

  const ratingSummary = new Map<string, { total: number; count: number }>();
  for (const row of ratingRows ?? []) {
    const prev = ratingSummary.get(row.question_id) ?? { total: 0, count: 0 };
    ratingSummary.set(row.question_id, {
      total: prev.total + (row.rating ?? 0),
      count: prev.count + 1,
    });
  }

  const questions = (questionRows ?? []).map((row) => {
    const summary = ratingSummary.get(row.id) ?? { total: 0, count: 0 };
    return {
      id: row.id,
      roomCode: room.code,
      roomId: row.room_id,
      authorId: row.author_id,
      author: authorMap.get(row.author_id) ?? "익명",
      content: row.content,
      createdAt: toRelativeKorean(row.created_at),
      avgRating: row.avg_rating ?? 0,
      ratingTotal: summary.total,
      ratingCount: summary.count,
      answerCount: row.answer_count ?? 0,
    };
  });

  const { data: myRatingRows } =
    actor && questionIds.length
      ? await admin
          .from("question_ratings")
          .select("question_id, rating")
          .eq("rater_id", actor.id)
          .in("question_id", questionIds)
      : { data: [] as { question_id: string; rating: number }[] };

  const myRatingMap = new Map((myRatingRows ?? []).map((row) => [row.question_id, row.rating]));

  return NextResponse.json({
    questions: questions.map((question) => ({
      ...question,
      hasRated: myRatingMap.has(question.id),
      myRating: myRatingMap.get(question.id) ?? null,
    })),
  });
}
