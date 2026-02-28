import crypto from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

function randomHex(length = 16) {
  return crypto.randomBytes(length).toString("hex");
}

export async function GET(request: NextRequest) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 학생 목록 조회를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const admin = createAdminClient();
  const { data: students, error } = await admin
    .from("profiles")
    .select("id, name, created_at")
    .eq("role", "student")
    .eq("teacher_id", actor.id)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "학생 목록 조회 실패" }, { status: 500 });
  }

  return NextResponse.json({
    students: (students ?? []).map((student) => ({
      id: student.id,
      name: student.name,
    })),
  });
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 학생 생성을 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const actor = await resolveActor(request);
  if (!actor || actor.role !== "teacher") {
    return NextResponse.json({ error: "교사 권한이 필요합니다." }, { status: 403 });
  }

  const body = (await request.json()) as { name?: string };
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json({ error: "학생 이름이 필요합니다." }, { status: 400 });
  }

  const admin = createAdminClient();

  const email = `student-${Date.now()}-${randomHex(4)}@classq.local`;
  const password = randomHex(12);

  const { data: userResult, error: userError } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (userError || !userResult.user) {
    return NextResponse.json({ error: "학생 계정 생성 실패" }, { status: 500 });
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: userResult.user.id,
    role: "student",
    teacher_id: actor.id,
    name,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userResult.user.id);
    return NextResponse.json({ error: "학생 프로필 생성 실패" }, { status: 500 });
  }

  return NextResponse.json({
    student: {
      id: userResult.user.id,
      name,
    },
  });
}
