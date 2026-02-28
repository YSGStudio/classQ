import TeacherRoomActions from "@/components/TeacherRoomActions";
import { requireTeacher } from "@/lib/auth";
import { getTeacherRoomView } from "@/lib/teacher-room-data";
import { notFound } from "next/navigation";

export default async function TeacherRoomPage({ params }: { params: Promise<{ id: string }> }) {
  await requireTeacher();

  const { id } = await params;
  const { room, questions } = await getTeacherRoomView(id);
  if (!room) notFound();

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <section className="rounded-2xl bg-white p-6 shadow-lg">
        <p className="text-sm font-semibold text-[#2E6DB4]">방 관리</p>
        <h1 className="text-3xl font-black text-[#113459]">{room.name}</h1>
        <p className="mt-2 text-sm text-slate-600">
          과목: {room.subject} · 방 코드: {room.code}
        </p>

        <TeacherRoomActions roomId={room.id} isActive={room.isActive} />
      </section>

      <section className="mt-5 rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 text-xl font-black text-[#113459]">질문/답변 현황</h2>
        <ul className="space-y-2">
          {questions.map((question) => (
            <li key={question.id} className="rounded-lg border border-slate-200 p-3">
              <p className="font-semibold text-slate-800">{question.content}</p>
              <p className="mt-1 text-sm text-slate-500">
                작성자 {question.author} · ⭐ {question.avgRating.toFixed(1)} · 💬 {question.answerCount}
              </p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
