"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/utils/supabase/client";

export default function TeacherSignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleSignup() {
    if (loading) return;

    setLoading(true);
    setStatus(null);

    if (!hasSupabase) {
      setStatus("Supabase 환경변수가 설정되지 않았습니다. .env.local을 먼저 설정해주세요.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/teacher/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error ?? "회원가입 실패");
      }

      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) {
        setStatus("회원가입은 완료됐지만 자동 로그인에 실패했습니다. 로그인 페이지에서 다시 로그인해주세요.");
        router.push("/teacher/login");
        return;
      }

      router.push("/teacher/dashboard");
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "회원가입에 실패했습니다.";
      setStatus(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleSignup();
      }}
    >
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-slate-700">이메일</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="teacher@classq.kr"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2E6DB4]"
          required
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-semibold text-slate-700">비밀번호 (8자 이상)</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          minLength={8}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2E6DB4]"
          required
        />
      </label>

      <button
        type="submit"
        disabled={loading}
        className="block w-full rounded-lg bg-[#2E6DB4] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#245990] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "가입 중..." : "교사 회원가입"}
      </button>

      <p className="text-xs text-slate-500">
        이미 계정이 있나요?{" "}
        <Link href="/teacher/login" className="font-semibold text-[#2E6DB4]">
          로그인하기
        </Link>
      </p>

      {status ? <p className="text-xs font-semibold text-[#2E6DB4]">{status}</p> : null}
    </form>
  );
}
