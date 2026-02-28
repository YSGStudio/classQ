import Link from "next/link";
import type { Question } from "@/types";

type UnansweredBannerProps = {
  code: string;
  questions: Question[];
};

export default function UnansweredBanner({ code, questions }: UnansweredBannerProps) {
  if (questions.length === 0) return null;

  const target = questions[0];

  return (
    <section className="rounded-2xl border border-[#F5A623] bg-[#FFF8E8] p-4 shadow-sm">
      <p className="font-bold text-[#9b6a10]">💡 아직 답변이 없어요!</p>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-[#7a5410]">&ldquo;{target.content}&rdquo; 질문에 첫 답변을 달아보세요.</p>
        <Link
          href={`/room/${code}/question/${target.id}`}
          className="rounded-lg bg-[#F5A623] px-3 py-2 text-sm font-semibold text-white hover:bg-[#db921f]"
        >
          첫 답변 하러 가기
        </Link>
      </div>
    </section>
  );
}
