import Link from "next/link";

export default function HomePage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <section className="rounded-3xl bg-white/95 p-8 shadow-xl">
        <p className="mb-2 inline-block rounded-full bg-[#2E6DB4]/10 px-3 py-1 text-xs font-bold text-[#2E6DB4]">
          ClassQ · 초등학교 교육용 Q&A
        </p>
        <h1 className="text-4xl font-black text-[#113459] sm:text-5xl">질문이 학습이 되는 교실</h1>
        <p className="mt-3 max-w-2xl text-sm text-slate-600 sm:text-base">
          교사는 학급을 쉽게 관리하고, 학생은 방 코드 또는 QR로 빠르게 입장하여 질문과 답변으로 함께 성장합니다.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <p className="text-sm font-bold text-[#2E6DB4]">10초 로그인</p>
            <p className="mt-1 text-sm text-slate-700">방코드 + 이름 선택 2단계</p>
          </div>
          <div className="rounded-2xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <p className="text-sm font-bold text-[#2E6DB4]">실시간 피드</p>
            <p className="mt-1 text-sm text-slate-700">질문/답변/점수 즉시 반영</p>
          </div>
          <div className="rounded-2xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <p className="text-sm font-bold text-[#2E6DB4]">게임형 학습</p>
            <p className="mt-1 text-sm text-slate-700">별점, 점수, TOP3 랭킹</p>
          </div>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Link href="/teacher/login" className="rounded-xl bg-[#2E6DB4] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#245990]">
            교사 로그인
          </Link>
          <Link href="/teacher/signup" className="rounded-xl bg-[#245990] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#1e4b7a]">
            교사 회원가입
          </Link>
          <Link href="/student/login" className="rounded-xl bg-[#F5A623] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#d7911f]">
            학생 입장
          </Link>
        </div>
      </section>
    </main>
  );
}
