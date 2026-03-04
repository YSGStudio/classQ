"use client";

import Link from "next/link";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import QuestionCard from "@/components/QuestionCard";
import RefreshButton from "@/components/RefreshButton";
import ScoreBadge from "@/components/ScoreBadge";
import Top3Section from "@/components/Top3Section";
import UnansweredBanner from "@/components/UnansweredBanner";
import { createClient } from "@/utils/supabase/client";
import type { Question, Room, StudentStats } from "@/types";

type SortMode = "latest" | "rating" | "answers";

type RoomFeedClientProps = {
  code: string;
  room: Room | null;
  initialQuestions: Question[];
  current: { id: string; role: "teacher" | "student"; name: string; score: number };
  scoreTop3: StudentStats[];
  ratedTop3: Question[];
  answeredTop3: Question[];
};

export default function RoomFeedClient({
  code,
  room,
  initialQuestions,
  current,
  scoreTop3,
  ratedTop3,
  answeredTop3,
}: RoomFeedClientProps) {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);
  const [sort, setSort] = useState<SortMode>("latest");
  const [draft, setDraft] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentScore, setCurrentScore] = useState(current.score);

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  useEffect(() => {
    setQuestions(initialQuestions);
  }, [initialQuestions]);

  useEffect(() => {
    if (!hasSupabase) return;

    let active = true;
    async function syncQuestions() {
      try {
        const res = await fetch(`/api/rooms/by-code/${code}/questions`, { cache: "no-store" });
        const payload = (await res.json()) as { questions?: Question[] };
        if (!res.ok || !payload.questions || !active) return;
        setQuestions(payload.questions);
      } catch {
        // keep SSR questions if refresh fails
      }
    }

    void syncQuestions();
    return () => {
      active = false;
    };
  }, [code, hasSupabase]);

  useEffect(() => {
    setCurrentScore(current.score);
  }, [current.score]);

  const refreshMyScore = useCallback(async () => {
    if (!hasSupabase) return;

    try {
      const res = await fetch("/api/me/score");
      const payload = await res.json();
      if (res.ok && typeof payload.score === "number") {
        setCurrentScore(payload.score);
      }
    } catch {
      // ignore
    }
  }, [hasSupabase]);

  useEffect(() => {
    if (!hasSupabase || !room?.id) return;

    const supabase = createClient();

    const questionChannel = supabase
      .channel(`room-${room.id}-questions`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "questions",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          const incoming = payload.new;

          setQuestions((prev) => {
            const exists = prev.some((item) => item.id === incoming.id);
            if (exists) return prev;

            const realtimeQuestion: Question = {
              id: incoming.id,
              roomCode: code,
              roomId: incoming.room_id,
              authorId: incoming.author_id,
              author: "새 학생",
              content: incoming.content,
              avgRating: incoming.avg_rating ?? 0,
              ratingTotal: 0,
              ratingCount: 0,
              answerCount: incoming.answer_count ?? 0,
              createdAt: "방금 전",
            };

            return [realtimeQuestion, ...prev];
          });
        },
      )
      .subscribe();

    const scoreChannel = supabase
      .channel(`room-${room.id}-scores`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "answer_scores",
        },
        () => {
          void refreshMyScore();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "answer_scores",
        },
        () => {
          void refreshMyScore();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(questionChannel);
      supabase.removeChannel(scoreChannel);
    };
  }, [code, hasSupabase, refreshMyScore, room?.id]);

  const unanswered = useMemo(
    () => questions.filter((question) => question.answerCount === 0),
    [questions],
  );

  const sortedQuestions = useMemo(() => {
    const list = [...questions];

    if (sort === "rating") return list.sort((a, b) => b.avgRating - a.avgRating);
    if (sort === "answers") return list.sort((a, b) => b.answerCount - a.answerCount);
    return list;
  }, [questions, sort]);

  async function handleCreateQuestion() {
    const content = draft.trim();
    if (!content || isSubmitting) return;

    setIsSubmitting(true);
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 환경변수가 없어 질문을 저장할 수 없습니다.");
      setIsSubmitting(false);
      return;
    }

    if (!room?.code) {
      setStatus("유효한 방을 찾을 수 없습니다. 교사가 생성한 방 코드로 다시 입장하세요.");
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code, content }),
      });

      const payload = await res.json();

      if (!res.ok || !payload.question) {
        throw new Error(payload.error ?? "질문 등록 실패");
      }

      const inserted: Question = payload.question;
      setQuestions((prev) => [inserted, ...prev]);
      setDraft("");
      setStatus("질문이 등록되었습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "질문 등록에 실패했습니다.";
      setStatus(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRate(questionId: string, rating: number) {
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 연결이 없어 별점을 저장할 수 없습니다.");
      return;
    }

    try {
      const res = await fetch(`/api/questions/${questionId}/rate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating }),
      });

      const payload = await res.json();
      if (!res.ok) {
        throw new Error(payload.error ?? "별점 저장 실패");
      }

      setQuestions((prev) =>
        prev.map((item) =>
          item.id === questionId
            ? {
                ...item,
                avgRating: payload.avgRating ?? item.avgRating,
                ratingTotal: payload.ratingTotal ?? item.ratingTotal ?? 0,
                ratingCount: payload.ratingCount ?? item.ratingCount ?? 0,
              }
            : item,
        ),
      );
      setStatus(`별점 ${rating}점을 저장했습니다.`);
    } catch {
      setStatus("별점 저장에 실패했습니다.");
    }
  }

  async function handleDelete(questionId: string) {
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 연결이 없어 질문 삭제를 처리할 수 없습니다.");
      return;
    }

    try {
      const res = await fetch(`/api/questions/${questionId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "질문 삭제 실패");

      setQuestions((prev) => prev.filter((item) => item.id !== questionId));
      setStatus("질문을 삭제했습니다.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "질문 삭제에 실패했습니다.";
      setStatus(message);
    }
  }

  async function handleLeaveRoom() {
    if (current.role === "teacher") {
      router.push("/teacher/dashboard");
      router.refresh();
      return;
    }

    try {
      await fetch("/api/student/session", { method: "DELETE" });
    } catch {
      // ignore network error and continue navigation
    }

    router.push("/student/login");
    router.refresh();
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6 rounded-2xl bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#2E6DB4]">ClassQ 📚</p>
            <h1 className="text-3xl font-black text-[#113459]">
              {room?.name ?? `${code} 질문 피드`}
            </h1>
            <p className="mt-1 text-sm font-semibold text-slate-600">방 코드: {code}</p>
          </div>
          <div className="flex items-center gap-2">
            <RefreshButton />
            {current.role === "teacher" ? (
              <div className="rounded-full border border-[#2E6DB4]/30 bg-white px-4 py-2 text-sm font-bold text-[#2E6DB4] shadow-sm">
                교사
              </div>
            ) : (
              <ScoreBadge name={current.name} score={currentScore} />
            )}
            {current.role === "student" ? (
              <button
                type="button"
                onClick={() => void handleLeaveRoom()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                방 나가기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => void handleLeaveRoom()}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                방 나가기
              </button>
            )}
          </div>
        </div>
      </header>

      <div className="space-y-5">
        <section className="rounded-2xl border border-[#2E6DB4]/20 bg-white p-4 shadow-sm">
          <p className="text-sm font-bold text-[#2E6DB4]">새 질문 작성</p>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            rows={3}
            placeholder="궁금한 내용을 자유롭게 질문해보세요."
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-[#2E6DB4]"
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <p className="text-xs text-slate-500">제목 없이 내용만 작성합니다.</p>
            <button
              type="button"
              onClick={handleCreateQuestion}
              disabled={isSubmitting || draft.trim().length === 0}
              className="rounded-lg bg-[#2E6DB4] px-4 py-2 text-sm font-bold text-white hover:bg-[#245990] disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {isSubmitting ? "등록 중..." : "질문 등록"}
            </button>
          </div>
          {status ? <p className="mt-2 text-xs font-semibold text-[#2E6DB4]">{status}</p> : null}
        </section>

        <Top3Section
          scoreTop3={scoreTop3}
          ratedTop3={ratedTop3}
          answeredTop3={answeredTop3}
        />

        <UnansweredBanner code={code} questions={unanswered} />

        <section>
          <div className="mb-3 flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600">
            <button
              type="button"
              onClick={() => setSort("latest")}
              className={`rounded-full px-3 py-1 ${sort === "latest" ? "bg-[#2E6DB4] text-white" : "bg-white"}`}
            >
              최신순
            </button>
            <button
              type="button"
              onClick={() => setSort("rating")}
              className={`rounded-full px-3 py-1 ${sort === "rating" ? "bg-[#2E6DB4] text-white" : "bg-white"}`}
            >
              별점순
            </button>
            <button
              type="button"
              onClick={() => setSort("answers")}
              className={`rounded-full px-3 py-1 ${sort === "answers" ? "bg-[#2E6DB4] text-white" : "bg-white"}`}
            >
              답변많은순
            </button>
            <Link
              href="/student/profile"
              className="ml-auto rounded-full border border-[#2E6DB4]/30 bg-white px-3 py-1 text-[#2E6DB4] hover:bg-[#F0F4FF]"
            >
              내 프로필
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedQuestions.map((question) => (
              <QuestionCard
                key={question.id}
                code={code}
                question={question}
                canRate={question.authorId !== current.id}
                canDelete={current.role === "teacher" || question.authorId === current.id}
                canOpenDetail={current.role === "teacher" || question.authorId === current.id}
                onRate={handleRate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
