"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LogoutButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );

  async function handleLogout() {
    if (loading) return;

    if (!hasSupabase) {
      router.push("/");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
    setLoading(false);
  }

  return (
    <button
      type="button"
      onClick={() => void handleLogout()}
      disabled={loading}
      className="rounded-lg border border-[#2E6DB4]/30 bg-white px-3 py-2 text-sm font-semibold text-[#2E6DB4] hover:bg-[#F0F4FF] disabled:cursor-not-allowed disabled:bg-slate-100"
    >
      {loading ? "로그아웃 중..." : "로그아웃"}
    </button>
  );
}
