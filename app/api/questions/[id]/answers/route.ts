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
  const body = (await request.json()) as { content?: string };
  const content = body.content?.trim();

  if (!content) {
    return NextResponse.json({ error: "content가 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 답변 저장을 처리할 수 없습니다." },
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
    return NextResponse.json(
      { error: "자신이 작성한 질문에는 답변할 수 없습니다." },
      { status: 403 },
    );
  }

  let canWrite = false;
  if (actor.role === "teacher") {
    const { data: room } = await admin
      .from("rooms")
      .select("teacher_id")
      .eq("id", question.room_id)
      .single();
    canWrite = room?.teacher_id === actor.id;
  } else {
    const { data: membership } = await admin
      .from("room_members")
      .select("id")
      .eq("room_id", question.room_id)
      .eq("student_id", actor.id)
      .maybeSingle();
    canWrite = Boolean(membership);
  }

  if (!canWrite) {
    return NextResponse.json({ error: "답변 작성 권한이 없습니다." }, { status: 403 });
  }

  const { data: inserted, error } = await admin
    .from("answers")
    .insert({
      question_id: id,
      author_id: actor.id,
      content,
    })
    .select("id, question_id, content")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "답변 저장 실패" }, { status: 500 });
  }

  return NextResponse.json({
    answer: {
      id: inserted.id,
      questionId: inserted.question_id,
      author: actor.name,
      content: inserted.content,
      createdAt: "방금 전",
    },
  });
}
