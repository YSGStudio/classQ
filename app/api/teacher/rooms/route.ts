import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

function generateRoomCode() {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let code = "";

  for (let i = 0; i < 2; i += 1) {
    code += letters[Math.floor(Math.random() * letters.length)];
  }
  for (let i = 0; i < 4; i += 1) {
    code += digits[Math.floor(Math.random() * digits.length)];
  }
  return code;
}

async function issueUniqueCode(admin: ReturnType<typeof createAdminClient>) {
  for (let i = 0; i < 20; i += 1) {
    const code = generateRoomCode();
    const { data } = await admin.from("rooms").select("id").eq("code", code).maybeSingle();
    if (!data) return code;
  }

  throw new Error("고유 코드 생성 실패");
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 방 목록 조회를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rooms")
    .select("id, name, subject, code, is_active")
    .eq("teacher_id", actor.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "방 목록 조회 실패" }, { status: 500 });
  }

  return NextResponse.json({
    rooms: (data ?? []).map((room) => ({
      id: room.id,
      name: room.name,
      subject: room.subject ?? "미지정",
      code: room.code,
      teacherName: actor.name,
      isActive: room.is_active,
    })),
  });
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { name?: string; subject?: string };
  const name = body.name?.trim();
  const subject = body.subject?.trim() ?? "";

  if (!name) {
    return NextResponse.json({ error: "방 이름이 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 방 생성을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const code = await issueUniqueCode(admin);

  const { data, error } = await admin
    .from("rooms")
    .insert({
      teacher_id: actor.id,
      name,
      subject: subject || null,
      code,
      is_active: true,
    })
    .select("id, name, subject, code, is_active")
    .single();

  if (error || !data) {
    return NextResponse.json({ error: "방 생성 실패" }, { status: 500 });
  }

  return NextResponse.json({
    room: {
      id: data.id,
      name: data.name,
      subject: data.subject ?? "미지정",
      code: data.code,
      teacherName: actor.name,
      isActive: data.is_active,
    },
  });
}
