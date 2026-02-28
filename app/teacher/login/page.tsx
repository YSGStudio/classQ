import TeacherLoginForm from "@/components/TeacherLoginForm";
import Link from "next/link";

export default function TeacherLoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-3xl font-black text-[#113459]">교사 로그인</h1>
        <p className="mt-2 text-sm text-slate-600">이메일/비밀번호로 ClassQ에 접속하세요.</p>
        <p className="mt-2 text-xs text-slate-500">
          계정이 없나요?{" "}
          <Link href="/teacher/signup" className="font-semibold text-[#2E6DB4]">
            회원가입
          </Link>
        </p>
        <TeacherLoginForm />
      </section>
    </main>
  );
}
