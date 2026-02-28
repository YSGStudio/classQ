import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET(request: NextRequest) {
  const actor = await resolveActor(request);
  if (!actor || actor.role !== "student") {
    return NextResponse.json({ score: 0 });
  }

  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 환경변수가 없어 점수 조회를 처리할 수 없습니다." },
      { status: 503 },
    );
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("student_scores")
    .select("total_score")
    .eq("student_id", actor.id)
    .single();

  return NextResponse.json({ score: data?.total_score ?? 0 });
}
