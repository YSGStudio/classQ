import Link from "next/link";
import RefreshButton from "@/components/RefreshButton";
import ScoreBadge from "@/components/ScoreBadge";
import { requireStudent } from "@/lib/auth";
import { getStudentProfileData } from "@/lib/student-profile-data";

export default async function StudentProfilePage() {
  await requireStudent();

  const data = await getStudentProfileData();
  const myQuestions = data.questions;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-black text-[#113459]">내 프로필</h1>
          <div className="flex items-center gap-2">
            <RefreshButton />
            <ScoreBadge name={data.name} score={data.score} />
          </div>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <p className="text-sm text-slate-600">내 질문 수</p>
            <p className="text-2xl font-black text-[#2E6DB4]">{myQuestions.length}개</p>
          </div>
          <div className="rounded-xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <p className="text-sm text-slate-600">이번 주 목표</p>
            <p className="text-2xl font-black text-[#2E6DB4]">질문 1개 더!</p>
          </div>
        </div>

        <section className="mt-6">
          <h2 className="mb-3 text-xl font-black text-[#113459]">내 질문</h2>
          <ul className="space-y-2">
            {myQuestions.map((question) => (
              <li key={question.id} className="rounded-lg border border-slate-200 p-3">
                <p className="font-semibold text-slate-800">{question.content}</p>
                <p className="mt-1 text-sm text-slate-500">
                  {question.createdAt} · ⭐ {question.avgRating.toFixed(1)} · 💬 {question.answerCount}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <Link
          href="/room/AB1234"
          className="mt-6 inline-block rounded-lg bg-[#2E6DB4] px-4 py-3 text-sm font-bold text-white hover:bg-[#245990]"
        >
          질문 피드로 돌아가기
        </Link>
      </section>
    </main>
  );
}
