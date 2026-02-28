import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { resolveActor } from "@/lib/actor";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as { roomCode?: string; content?: string };
  const roomCode = body.roomCode?.trim().toUpperCase();
  const content = body.content?.trim();

  if (!roomCode || !content) {
    return NextResponse.json({ error: "roomCode와 content가 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 질문 저장을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  const { data: room } = await admin
    .from("rooms")
    .select("id, code, teacher_id")
    .eq("code", roomCode)
    .single();

  if (!room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: membership } = await admin
    .from("room_members")
    .select("id")
    .eq("room_id", room.id)
    .eq("student_id", actor.id)
    .maybeSingle();

  const canWrite = actor.role === "teacher" ? room.teacher_id === actor.id : Boolean(membership);

  if (!canWrite) {
    return NextResponse.json({ error: "이 방에 질문을 작성할 권한이 없습니다." }, { status: 403 });
  }

  const { data: inserted, error } = await admin
    .from("questions")
    .insert({
      room_id: room.id,
      author_id: actor.id,
      content,
    })
    .select("id, room_id, content, avg_rating, answer_count, created_at")
    .single();

  if (error || !inserted) {
    return NextResponse.json({ error: "질문 저장 실패" }, { status: 500 });
  }

  return NextResponse.json({
    question: {
      id: inserted.id,
      roomCode: room.code,
      roomId: inserted.room_id,
      authorId: actor.id,
      author: actor.name,
      content: inserted.content,
      avgRating: inserted.avg_rating ?? 0,
      ratingTotal: 0,
      ratingCount: 0,
      answerCount: inserted.answer_count ?? 0,
      createdAt: "방금 전",
    },
  });
}
