import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveActor } from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase-admin";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const actor = await resolveActor(request);
  if (!actor) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 질문 삭제를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const { id } = await context.params;
  const admin = createAdminClient();

  const { data: question } = await admin
    .from("questions")
    .select("id, room_id, author_id")
    .eq("id", id)
    .single();

  if (!question) {
    return NextResponse.json({ error: "질문을 찾을 수 없습니다." }, { status: 404 });
  }

  let canDelete = question.author_id === actor.id;
  if (!canDelete && actor.role === "teacher") {
    const { data: room } = await admin
      .from("rooms")
      .select("teacher_id")
      .eq("id", question.room_id)
      .single();
    canDelete = room?.teacher_id === actor.id;
  }

  if (!canDelete) {
    return NextResponse.json({ error: "질문 삭제 권한이 없습니다." }, { status: 403 });
  }

  const { error } = await admin.from("questions").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: "질문 삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

