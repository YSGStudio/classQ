import TeacherSignupForm from "@/components/TeacherSignupForm";

export default function TeacherSignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-4 py-10">
      <section className="w-full rounded-2xl bg-white p-6 shadow-lg">
        <h1 className="text-3xl font-black text-[#113459]">교사 회원가입</h1>
        <p className="mt-2 text-sm text-slate-600">이메일/비밀번호로 교사 계정을 생성하세요.</p>
        <TeacherSignupForm />
      </section>
    </main>
  );
}
