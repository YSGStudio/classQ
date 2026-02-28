import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

async function assertTeacherOwnsRoom(admin: ReturnType<typeof createAdminClient>, roomId: string, teacherId: string) {
  const { data: room } = await admin
    .from("rooms")
    .select("id, teacher_id")
    .eq("id", roomId)
    .single();

  if (!room || room.teacher_id !== teacherId) return null;
  return room;
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; studentId: string }> },
) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 학생 삭제를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const { id, studentId } = await context.params;

  const admin = createAdminClient();
  const room = await assertTeacherOwnsRoom(admin, id, actor.id);
  if (!room) {
    return NextResponse.json({ error: "방 접근 권한이 없습니다." }, { status: 403 });
  }

  await admin
    .from("room_members")
    .delete()
    .eq("room_id", room.id)
    .eq("student_id", studentId);

  return NextResponse.json({ ok: true });
}
