"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function TeacherLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleLogin() {
    if (loading) return;

    if (!hasSupabase) {
      setStatus("Supabase 환경변수가 설정되지 않았습니다. .env.local을 먼저 설정해주세요.");
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      router.push("/teacher/dashboard");
      router.refresh();
    } catch {
      setStatus("로그인에 실패했습니다. 이메일/비밀번호를 확인하세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      className="mt-6 space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        void handleLogin();
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
        <span className="mb-1 block font-semibold text-slate-700">비밀번호</span>
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-[#2E6DB4]"
          required
        />
      </label>
      <button
        type="submit"
        disabled={loading}
        className="block w-full rounded-lg bg-[#2E6DB4] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#245990] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {loading ? "로그인 중..." : "로그인"}
      </button>
      {status ? <p className="text-xs font-semibold text-[#2E6DB4]">{status}</p> : null}
    </form>
  );
}
