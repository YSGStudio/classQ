import { NextResponse, type NextRequest } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  createStudentSessionToken,
  STUDENT_SESSION_COOKIE,
} from "@/lib/student-session";

export async function POST(request: NextRequest) {
  const body = (await request.json()) as { roomCode?: string; studentId?: string };
  const roomCode = body.roomCode?.trim().toUpperCase();
  const studentId = body.studentId?.trim();

  if (!roomCode || !studentId) {
    return NextResponse.json({ error: "roomCode와 studentId가 필요합니다." }, { status: 400 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 학생 로그인을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();

  const { data: room, error: roomError } = await admin
    .from("rooms")
    .select("id, code, teacher_id")
    .eq("code", roomCode)
    .single();

  if (roomError || !room) {
    return NextResponse.json({ error: "방을 찾을 수 없습니다." }, { status: 404 });
  }

  const { data: profile, error: profileError } = await admin
    .from("profiles")
    .select("id, name, role, teacher_id")
    .eq("id", studentId)
    .single();

  if (profileError || !profile || profile.role !== "student") {
    return NextResponse.json({ error: "학생 정보를 찾을 수 없습니다." }, { status: 404 });
  }

  if (profile.teacher_id !== room.teacher_id) {
    return NextResponse.json(
      { error: "해당 방 교사가 발급한 학생 계정이 아닙니다." },
      { status: 403 },
    );
  }

  await admin.from("room_members").upsert(
    { room_id: room.id, student_id: profile.id },
    { onConflict: "room_id,student_id" },
  );

  const token = createStudentSessionToken({
    profileId: profile.id,
    role: "student",
    name: profile.name,
    roomId: room.id,
    exp: Date.now() + 1000 * 60 * 60 * 24 * 7,
  });

  const response = NextResponse.json({ ok: true, redirectTo: `/room/${room.code}` });
  response.cookies.set(STUDENT_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(STUDENT_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return response;
}
