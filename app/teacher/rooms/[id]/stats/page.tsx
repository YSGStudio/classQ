import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { getTeacherRoomStatsView } from "@/lib/teacher-room-stats-data";

export default async function TeacherRoomStatsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireTeacher();

  const { id } = await params;
  const view = await getTeacherRoomStatsView(id);
  if (!view.room) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-2xl bg-white p-6 shadow-lg">
          <p className="text-sm font-semibold text-[#2E6DB4]">방 통계</p>
          <h1 className="mt-1 text-2xl font-black text-[#113459]">통계 정보를 찾을 수 없습니다.</h1>
          <p className="mt-2 text-sm text-slate-600">
            방이 삭제되었거나 권한 확인이 되지 않았습니다. 대시보드에서 다시 시도해주세요.
          </p>
          <Link
            href="/teacher/dashboard"
            className="mt-4 inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            대시보드로 이동
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2E6DB4]">방 통계</p>
            <h1 className="text-3xl font-black text-[#113459]">{view.room.name}</h1>
            <p className="mt-2 text-sm text-slate-600">
              과목: {view.room.subject} · 방 코드: {view.room.code}
            </p>
          </div>
          <Link
            href="/teacher/dashboard"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            대시보드로
          </Link>
        </div>
      </section>

      <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-black text-[#113459]">학생별 질문 카드 및 점수</h2>

        {view.students.length === 0 ? (
          <p className="text-sm text-slate-600">이 방에 참여 중인 학생이 없습니다.</p>
        ) : (
          <ul className="space-y-4">
            {view.students.map((student) => (
              <li key={student.studentId} className="rounded-xl border border-slate-200 p-4">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-lg font-bold text-slate-800">{student.studentName}</p>
                  <p className="rounded-full bg-[#F0F4FF] px-3 py-1 text-sm font-bold text-[#2E6DB4]">
                    획득 점수 {student.score}점
                  </p>
                </div>

                {student.questions.length === 0 ? (
                  <p className="text-sm text-slate-500">이 방에서 작성한 질문이 없습니다.</p>
                ) : (
                  <ul className="space-y-2">
                    {student.questions.map((question) => (
                      <li key={question.id} className="rounded-lg bg-slate-50 p-3">
                        <p className="font-semibold text-slate-800">{question.content}</p>
                        <p className="mt-1 text-xs text-slate-600">
                          {question.createdAt} · ⭐ {question.avgRating.toFixed(1)} · 💬{" "}
                          {question.answerCount}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
