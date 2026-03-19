import type { Answer } from "@/types";

type AnswerListProps = {
  answers: Answer[];
  canScore?: boolean;
  scoringAnswerId?: string | null;
  onScore?: (answerId: string, score: number) => void;
};

export default function AnswerList({
  answers,
  canScore = false,
  scoringAnswerId = null,
  onScore,
}: AnswerListProps) {
  if (answers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-600">
        아직 답변이 없습니다.
      </div>
    );
  }

  return (
    <ul className="space-y-3">
      {answers.map((answer) => (
        <li
          key={answer.id}
          className="rounded-xl border border-[#2E6DB4]/15 bg-white p-4 shadow-sm"
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-[#2E6DB4]">{answer.author}</p>
            <p className="text-xs text-slate-500">{answer.createdAt}</p>
          </div>
          <p className="text-sm text-slate-700">{answer.content}</p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-[#27AE60]">
              채점: {answer.score ?? "미채점"}
            </span>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={!canScore || scoringAnswerId === answer.id}
                  onClick={() => onScore?.(answer.id, value)}
                  className="rounded-md border border-[#2E6DB4]/30 px-2 py-1 text-xs font-semibold text-[#2E6DB4] hover:bg-[#F0F4FF] disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
