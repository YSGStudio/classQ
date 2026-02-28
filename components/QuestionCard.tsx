import Link from "next/link";
import type { Question } from "@/types";

type QuestionCardProps = {
  code: string;
  question: Question;
  canRate?: boolean;
  canDelete?: boolean;
  canOpenDetail?: boolean;
  onRate?: (questionId: string, rating: number) => void;
  onDelete?: (questionId: string) => void;
};

export default function QuestionCard({
  code,
  question,
  canRate = true,
  canDelete = false,
  canOpenDetail = false,
  onRate,
  onDelete,
}: QuestionCardProps) {
  const ratingTotal = question.ratingTotal ?? 0;

  return (
    <article className="rounded-2xl border border-[#2E6DB4]/15 bg-white p-4 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <header className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="inline-flex items-center rounded-full bg-[#F0F4FF] px-2 py-1 text-xs font-bold text-[#2E6DB4]">
            완성도 총점 {ratingTotal}점
          </p>
          <p className="mt-2 text-sm font-semibold text-[#2E6DB4]">🙋 {question.author}</p>
          <p className="text-xs text-slate-500">{question.createdAt}</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#F0F4FF] px-2 py-1 text-xs font-medium text-[#2E6DB4]">
            #{question.id.slice(0, 6)}
          </span>
          {canDelete ? (
            <button
              type="button"
              onClick={() => onDelete?.(question.id)}
              className="rounded-md border border-red-300 bg-red-50 p-1.5 text-red-600 hover:bg-red-100"
              aria-label="질문 삭제"
              title="질문 삭제"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="h-4 w-4"
              >
                <path d="M3 6h18" />
                <path d="M8 6V4h8v2" />
                <path d="M19 6l-1 14H6L5 6" />
                <path d="M10 11v6M14 11v6" />
              </svg>
            </button>
          ) : null}
        </div>
      </header>

      <p className="mb-4 line-clamp-3 min-h-18 text-base font-medium text-slate-800">
        {question.content}
      </p>

      <div className="mb-4 flex items-center gap-3 text-sm">
        <span className="font-semibold text-[#F5A623]">⭐ {question.avgRating.toFixed(1)}</span>
        <span className="text-slate-600">💬 {question.answerCount}개</span>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((value) => (
            <button
              key={value}
              type="button"
              disabled={!canRate}
              onClick={() => onRate?.(question.id, value)}
              className="rounded-md border border-[#F5A623]/30 bg-[#FFF8E8] px-2 py-1 text-xs font-bold text-[#9b6a10] hover:bg-[#F5A623] hover:text-white disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
              aria-label={`${value}점 부여`}
            >
              {value}★
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500">
            {canRate ? "질문 완성도를 선택하세요" : "내 질문은 별점 불가"}
          </span>
          {canOpenDetail ? (
            <Link
              href={`/room/${code}/question/${question.id}`}
              className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 text-sm font-semibold text-[#2E6DB4] transition hover:bg-[#F0F4FF]"
            >
              상세 보기
            </Link>
          ) : (
            <span className="rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-500">
              출제자/교사만 상세보기 가능
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
