import Link from "next/link";
import QuestionDetailClient from "@/components/QuestionDetailClient";
import { getCurrentProfile } from "@/lib/auth";
import { getQuestionDetail } from "@/lib/classq-data";

export const dynamic = "force-dynamic";

export default async function QuestionDetailPage({
  params,
}: {
  params: Promise<{ code: string; id: string }>;
}) {
  const { code, id } = await params;
  const { question, answers } = await getQuestionDetail(code, id);
  const current = await getCurrentProfile();

  if (
    !question ||
    !current ||
    (current.role !== "teacher" && question.authorId !== current.id)
  ) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <section className="rounded-2xl bg-white p-6 shadow">
          <p className="text-sm text-slate-600">출제자 또는 교사만 상세보기를 열 수 있습니다.</p>
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

  return <QuestionDetailClient code={code} question={question} initialAnswers={answers} />;
}
