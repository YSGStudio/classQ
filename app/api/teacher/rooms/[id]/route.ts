import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

async function assertOwner(admin: ReturnType<typeof createAdminClient>, roomId: string, teacherId: string) {
  const { data: room } = await admin
    .from("rooms")
    .select("id, teacher_id")
    .eq("id", roomId)
    .single();

  if (!room || room.teacher_id !== teacherId) return false;
  return true;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const body = (await request.json()) as { isActive?: boolean; name?: string; subject?: string };

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 방 수정을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const owned = await assertOwner(admin, id, actor.id);
  if (!owned) {
    return NextResponse.json({ error: "방 접근 권한이 없습니다." }, { status: 403 });
  }

  const updatePayload: { is_active?: boolean; name?: string; subject?: string | null } = {};
  if (typeof body.isActive === "boolean") updatePayload.is_active = body.isActive;
  if (typeof body.name === "string") updatePayload.name = body.name.trim();
  if (typeof body.subject === "string") updatePayload.subject = body.subject.trim() || null;

  const { error } = await admin.from("rooms").update(updatePayload).eq("id", id);

  if (error) {
    return NextResponse.json({ error: "방 수정 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 방 삭제를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const owned = await assertOwner(admin, id, actor.id);
  if (!owned) {
    return NextResponse.json({ error: "방 접근 권한이 없습니다." }, { status: 403 });
  }

  // Defensive cleanup for legacy schemas where cascade constraints may be missing.
  const { data: questionRows, error: questionFetchError } = await admin
    .from("questions")
    .select("id")
    .eq("room_id", id);

  if (questionFetchError) {
    return NextResponse.json({ error: "방 질문 조회 실패" }, { status: 500 });
  }

  const questionIds = (questionRows ?? []).map((row) => row.id);
  if (questionIds.length > 0) {
    const { data: answerRows, error: answerFetchError } = await admin
      .from("answers")
      .select("id")
      .in("question_id", questionIds);

    if (answerFetchError) {
      return NextResponse.json({ error: "방 답변 조회 실패" }, { status: 500 });
    }

    const answerIds = (answerRows ?? []).map((row) => row.id);
    if (answerIds.length > 0) {
      const { error: scoreDeleteError } = await admin
        .from("answer_scores")
        .delete()
        .in("answer_id", answerIds);
      if (scoreDeleteError) {
        return NextResponse.json({ error: "답변 점수 삭제 실패" }, { status: 500 });
      }
    }

    const { error: ratingDeleteError } = await admin
      .from("question_ratings")
      .delete()
      .in("question_id", questionIds);
    if (ratingDeleteError) {
      return NextResponse.json({ error: "질문 별점 삭제 실패" }, { status: 500 });
    }

    const { error: answerDeleteError } = await admin
      .from("answers")
      .delete()
      .in("question_id", questionIds);
    if (answerDeleteError) {
      return NextResponse.json({ error: "답변 삭제 실패" }, { status: 500 });
    }

    const { error: questionDeleteError } = await admin
      .from("questions")
      .delete()
      .in("id", questionIds);
    if (questionDeleteError) {
      return NextResponse.json({ error: "질문 삭제 실패" }, { status: 500 });
    }
  }

  const { error: memberDeleteError } = await admin
    .from("room_members")
    .delete()
    .eq("room_id", id);
  if (memberDeleteError) {
    return NextResponse.json({ error: "방 구성원 삭제 실패" }, { status: 500 });
  }

  const { error: roomDeleteError } = await admin.from("rooms").delete().eq("id", id);
  if (roomDeleteError) {
    return NextResponse.json({ error: "방 삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
