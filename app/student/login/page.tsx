import StudentQuickLoginForm from "@/components/StudentQuickLoginForm";

export default async function StudentLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ room?: string }>;
}) {
  const { room } = await searchParams;
  const initialRoomCode = room?.trim().toUpperCase() ?? "";

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <section className="rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-3xl font-black text-[#113459]">학생 로그인</h1>
        <p className="mt-2 text-sm text-slate-600">방코드 + 이름 선택으로 10초 내 입장</p>

        <StudentQuickLoginForm initialRoomCode={initialRoomCode} />
      </section>
    </main>
  );
}
