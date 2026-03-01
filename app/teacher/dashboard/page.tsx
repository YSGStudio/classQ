import ClearStudentSessionOnTeacherDashboard from "@/components/ClearStudentSessionOnTeacherDashboard";
import LogoutButton from "@/components/LogoutButton";
import TeacherRoomsPanel from "@/components/TeacherRoomsPanel";
import TeacherStudentsPanel from "@/components/TeacherStudentsPanel";
import { requireTeacher } from "@/lib/auth";
import { getTeacherDashboardData } from "@/lib/teacher-dashboard-data";

export default async function TeacherDashboardPage() {
  await requireTeacher();
  const data = await getTeacherDashboardData();

  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <ClearStudentSessionOnTeacherDashboard />
      <header className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2E6DB4]">교사 대시보드</p>
            <h1 className="text-3xl font-black text-[#113459]">학급 운영 현황</h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">교사 계정</p>
          </div>
          <LogoutButton />
        </div>
      </header>

      <section className="mt-5 grid gap-4 lg:grid-cols-2">
        <TeacherRoomsPanel initialRooms={data.rooms} />
        <TeacherStudentsPanel />
      </section>
    </main>
  );
}
