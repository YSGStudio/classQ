import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(
  _request: Request,
  context: { params: Promise<{ code: string }> },
) {
  const { code } = await context.params;

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 학생 목록 조회를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, code, name, teacher_id")
    .eq("code", code)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: profiles, error: profileError } = await admin
    .from("profiles")
    .select("id, name")
    .eq("role", "student")
    .eq("teacher_id", room.teacher_id);

  if (profileError) {
    return NextResponse.json({ error: "학생 프로필 조회 실패" }, { status: 500 });
  }

  return NextResponse.json({
    room,
    students: (profiles ?? []).sort((a, b) => a.name.localeCompare(b.name, "ko")),
  });
}
