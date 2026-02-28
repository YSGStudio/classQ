import { NextResponse, type NextRequest } from "next/server";
import { resolveActor } from "@/lib/actor";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ studentId: string }> },
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

  const { studentId } = await context.params;
  const admin = createAdminClient();

  const { data: student } = await admin
    .from("profiles")
    .select("id")
    .eq("id", studentId)
    .eq("role", "student")
    .eq("teacher_id", actor.id)
    .single();

  if (!student) {
    return NextResponse.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  // Defensive cleanup for historical data without full cascading relations.
  const { error: questionRatingDeleteError } = await admin
    .from("question_ratings")
    .delete()
    .eq("rater_id", studentId);
  if (questionRatingDeleteError) {
    return NextResponse.json({ error: "학생 별점 기록 삭제 실패" }, { status: 500 });
  }

  const { error: answerScoreDeleteError } = await admin
    .from("answer_scores")
    .delete()
    .eq("grader_id", studentId);
  if (answerScoreDeleteError) {
    return NextResponse.json({ error: "학생 채점 기록 삭제 실패" }, { status: 500 });
  }

  const { error: answerDeleteError } = await admin
    .from("answers")
    .delete()
    .eq("author_id", studentId);
  if (answerDeleteError) {
    return NextResponse.json({ error: "학생 답변 삭제 실패" }, { status: 500 });
  }

  const { error: questionDeleteError } = await admin
    .from("questions")
    .delete()
    .eq("author_id", studentId);
  if (questionDeleteError) {
    return NextResponse.json({ error: "학생 질문 삭제 실패" }, { status: 500 });
  }

  const { error: roomMemberDeleteError } = await admin
    .from("room_members")
    .delete()
    .eq("student_id", studentId);
  if (roomMemberDeleteError) {
    return NextResponse.json({ error: "학생 방 참여정보 삭제 실패" }, { status: 500 });
  }

  const { error: profileDeleteError } = await admin.from("profiles").delete().eq("id", studentId);
  if (profileDeleteError) {
    return NextResponse.json({ error: "학생 프로필 삭제 실패" }, { status: 500 });
  }

  const { error: authDeleteError } = await admin.auth.admin.deleteUser(studentId);
  if (authDeleteError) {
    return NextResponse.json({ error: "학생 인증계정 삭제 실패" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
