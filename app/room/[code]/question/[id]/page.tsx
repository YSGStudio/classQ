import Link from "next/link";
import QuestionDetailClient from "@/components/QuestionDetailClient";
import { getCurrentProfile } from "@/lib/auth";
import { getQuestionDetail } from "@/lib/classq-data";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>;
}) {
  const { code, id } = await params;
  const { question, answers } = await getQuestionDetail(code, id);
  const current = await getCurrentProfile();

  let canAccessQuestion = Boolean(question && current);
  if (question && current && hasSupabaseEnv() && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const admin = createAdminClient();

    if (current.role === "teacher") {
      const { data: room } = await admin
        .from("rooms")
        .select("teacher_id")
        .eq("id", question.roomId)
        .single();
      canAccessQuestion = room?.teacher_id === current.id;
    } else {
      const { data: membership } = await admin
        .from("room_members")
        .select("id")
        .eq("room_id", question.roomId)
        .eq("student_id", current.id)
        .maybeSingle();
      canAccessQuestion = Boolean(membership);
    }
  }

  if (!question || !current || !canAccessQuestion) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-600">이 질문을 볼 권한이 없습니다.</p>
          <Link
            href={`/room/${code}`}
            className="mt-3 inline-block text-sm font-semibold text-[#2E6DB4]"
          >
            피드로 돌아가기
          </Link>
        </section>
      </main>
    );
  }

  return (
    <QuestionDetailClient
      code={code}
      question={question}
      initialAnswers={answers}
      canWriteAnswer={question.authorId !== current.id}
      canScoreAnswers={current.role === "teacher" || question.authorId === current.id}
    />
  );
}
