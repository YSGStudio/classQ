"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import AnswerList from "@/components/AnswerList";
import type { Answer, Question } from "@/types";
import { createClient } from "@/utils/supabase/client";

type QuestionDetailClientProps = {
  code: string;
  question: Question;
  initialAnswers: Answer[];
  canWriteAnswer: boolean;
};

export default function QuestionDetailClient({
  code,
  question,
  initialAnswers,
  canWriteAnswer,
}: QuestionDetailClientProps) {
  const [answers, setAnswers] = useState<Answer[]>(initialAnswers);
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    setAnswers(initialAnswers);
  }, [initialAnswers]);

  const answerIdSet = useMemo(() => new Set(answers.map((answer) => answer.id)), [answers]);

  useEffect(() => {
    if (!hasSupabase) return;

    const supabase = createClient();
    const answerChannel = supabase
      .channel(`question-${question.id}-answers`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answers",
          filter: `question_id=eq.${question.id}`,
        },
        (payload) => {
          const incoming = payload.new;
          setAnswers((prev) => {
            const exists = prev.some((item) => item.id === incoming.id);
            if (exists) return prev;

            const realtimeAnswer: Answer = {
              id: incoming.id,
              questionId: incoming.question_id,
              author: "새 답변",
              content: incoming.content,
              createdAt: "방금 전",
            };

            return [realtimeAnswer, ...prev];
          });
        },
      )
      .subscribe();

    const scoreChannel = supabase
      .channel(`question-${question.id}-answer-scores`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answer_scores",
        },
        (payload) => {
          const incoming = payload.new;
          setAnswers((prev) =>
            prev.map((item) =>
              item.id === incoming.answer_id ? { ...item, score: incoming.score } : item,
            ),
          );
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "answer_scores",
        },
        (payload) => {
          const incoming = payload.new;
          setAnswers((prev) =>
            prev.map((item) =>
              item.id === incoming.answer_id ? { ...item, score: incoming.score } : item,
            ),
          );
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(answerChannel);
      supabase.removeChannel(scoreChannel);
    };
  }, [hasSupabase, question.id]);

  async function handleSubmitAnswer() {
    const content = draft.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 연결이 없어 답변을 저장할 수 없습니다.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch(`/api/questions/${question.id}/answers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.answer) {
        throw new Error(payload.error ?? "답변 등록 실패");
      }

      setAnswers((prev) => [payload.answer as Answer, ...prev]);
      setDraft("");
      setStatus("답변이 등록되었습니다.");
    } catch {
      setStatus("답변 등록에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleScore(answerId: string, score: number) {
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 연결이 없어 채점을 저장할 수 없습니다.");
      return;
    }

    if (!answerIdSet.has(answerId)) return;

    try {
      const res = await fetch(`/api/answers/${answerId}/score`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ score }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "채점 실패");
      }

      setAnswers((prev) =>
        prev.map((item) =>
          item.id === answerId ? { ...item, score: payload.score ?? score } : item,
        ),
      );
      setStatus(`채점 ${score}점을 저장했습니다.`);
    } catch {
      setStatus("채점 저장에 실패했습니다.");
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <section className="rounded-2xl bg-white p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm font-semibold text-[#2E6DB4]">질문 상세</p>
          <Link href={`/room/${code}`} className="text-sm font-semibold text-[#2E6DB4]">
            목록으로
          </Link>
        </div>

        <h1 className="text-2xl font-black text-[#113459]">{question.content}</h1>
        <p className="mt-2 text-sm text-slate-600">
          작성자: {question.author} · {question.createdAt} · ⭐ {question.avgRating.toFixed(1)}
        </p>

        {canWriteAnswer ? (
          <section className="mt-6 rounded-xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
            <label className="block text-sm font-semibold text-slate-700">답변 작성</label>
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              rows={4}
              placeholder="친구의 질문에 답변을 작성해보세요."
              className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 outline-none focus:border-[#2E6DB4]"
            />
            <div className="mt-3 flex items-center justify-between gap-2">
              <p className="text-xs text-slate-500">질문 작성자와 교사가 답변을 확인할 수 있습니다.</p>
              <button
                type="button"
                onClick={handleSubmitAnswer}
                disabled={isSubmitting || draft.trim().length === 0}
                className="rounded-lg bg-[#2E6DB4] px-4 py-2 text-sm font-bold text-white hover:bg-[#245990] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isSubmitting ? "등록 중..." : "답변 등록"}
              </button>
            </div>
            {status ? <p className="mt-2 text-xs font-semibold text-[#2E6DB4]">{status}</p> : null}
          </section>
        ) : null}

        {!canWriteAnswer && status ? (
          <p className="mt-6 text-xs font-semibold text-[#2E6DB4]">{status}</p>
        ) : null}

        <section className="mt-6">
          <h2 className="mb-3 text-lg font-black text-[#113459]">답변 목록 ({answers.length})</h2>
          <AnswerList answers={answers} onScore={handleScore} />
        </section>
      </section>
    </main>
  );
}
