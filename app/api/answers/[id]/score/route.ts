import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
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
  const body = (await request.json()) as { score?: number };
  const score = body.score;

  if (!score || score < 1 || score > 5) {
    return NextResponse.json({ error: "score는 1~5여야 합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 채점 저장을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  const { data: answer } = await admin
    .from("answers")
    .select("id, author_id, question_id")
    .eq("id", id)
    .single();

  if (!answer) {
    return NextResponse.json({ error: "답변을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: question } = await admin
    .from("questions")
    .select("id, author_id, room_id")
    .eq("id", answer.question_id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  let canGrade = false;

  if (actor.role === "teacher") {
    const { data: room } = await admin
      .from("rooms")
      .select("teacher_id")
      .eq("id", question.room_id)
      .single();

    canGrade = room?.teacher_id === actor.id;
  } else {
    canGrade = question.author_id === actor.id;
  }

  if (!canGrade) {
    return NextResponse.json({ error: "채점 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await admin.from("answer_scores").upsert(
    {
      answer_id: id,
      grader_id: actor.id,
      score,
    },
    { onConflict: "answer_id" },
  );

  if (error) {
    return NextResponse.json({ error: "채점 저장 실패" }, { status: 500 });
  }

  const { data: refreshed } = await admin
    .from("answer_scores")
    .select("score")
    .eq("answer_id", id)
    .single();

  return NextResponse.json({ score: refreshed?.score ?? score });
}
