import type { Question, StudentStats } from "@/types";

type Top3SectionProps = {
  scoreTop3: StudentStats[];
  ratedTop3: Question[];
  answeredTop3: Question[];
};

function TopCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div className="min-w-64 rounded-2xl border border-[#2E6DB4]/20 bg-white p-4 shadow-sm">
      <p className="mb-2 text-sm font-bold text-[#2E6DB4]">{title}</p>
      <ul className="space-y-1 text-sm text-slate-700">
        {lines.map((line, idx) => (
          <li key={`${line}-${idx}`} className="truncate">
            {idx + 1}. {line}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function Top3Section({ scoreTop3, ratedTop3, answeredTop3 }: Top3SectionProps) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-black text-[#113459]">🏆 TOP 3 랭킹</h2>
      <div className="flex gap-3 overflow-x-auto pb-2">
        <TopCard title="점수 높은 학생" lines={scoreTop3.map((s) => `${s.name} · ${s.score}점`)} />
        <TopCard title="완성도 높은 질문" lines={ratedTop3.map((q) => `${q.content} · ⭐${q.avgRating.toFixed(1)}`)} />
        <TopCard title="답변 많은 질문" lines={answeredTop3.map((q) => `${q.content} · 💬${q.answerCount}`)} />
      </div>
    </section>
  );
}
