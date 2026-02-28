import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveActor } from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await resolveActor(request);
  if (!actor) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await context.params;
  const body = (await request.json()) as { rating?: number };
  const rating = body.rating;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "rating은 1~5여야 합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 별점 저장을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  const { data: question } = await admin
    .from("questions")
    .select("id, room_id, author_id")
    .eq("id", id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  if (question.author_id === actor.id) {
    return NextResponse.json({ error: "자신의 질문은 평가할 수 없습니다." }, { status: 403 });
  }

  let canRate = false;
  if (actor.role === "teacher") {
    const { data: room } = await admin
      .from("rooms")
      .select("teacher_id")
      .eq("id", question.room_id)
      .single();
    canRate = room?.teacher_id === actor.id;
  } else {
    const { data: membership } = await admin
      .from("room_members")
      .select("id")
      .eq("room_id", question.room_id)
      .eq("student_id", actor.id)
      .maybeSingle();
    canRate = Boolean(membership);
  }

  if (!canRate) {
    return NextResponse.json({ error: "별점 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await admin.from("question_ratings").upsert(
    {
      question_id: id,
      rater_id: actor.id,
      rating,
    },
    { onConflict: "question_id,rater_id" },
  );

  if (error) {
    return NextResponse.json({ error: "별점 저장 실패" }, { status: 500 });
  }

  const { data: refreshed } = await admin
    .from("questions")
    .select("avg_rating")
    .eq("id", id)
    .single();

  const { data: ratingRows } = await admin
    .from("question_ratings")
    .select("rating")
    .eq("question_id", id);

  const ratingTotal = (ratingRows ?? []).reduce((sum, row) => sum + (row.rating ?? 0), 0);
  const ratingCount = (ratingRows ?? []).length;

  return NextResponse.json({
    avgRating: refreshed?.avg_rating ?? rating,
    ratingTotal,
    ratingCount,
  });
}
