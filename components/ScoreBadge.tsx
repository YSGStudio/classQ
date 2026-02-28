type ScoreBadgeProps = {
  name: string;
  score: number;
};

export default function ScoreBadge({ name, score }: ScoreBadgeProps) {
  return (
    <div className="animate-pulse-once rounded-full border border-[#2E6DB4]/30 bg-white px-4 py-2 text-sm font-bold text-[#2E6DB4] shadow-sm">
      {name} 🏅 {score}점
    </div>
  );
}
