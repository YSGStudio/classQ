"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

type RefreshButtonProps = {
  className?: string;
  label?: string;
};

export default function RefreshButton({ className, label = "새로고침" }: RefreshButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      onClick={() => startTransition(() => router.refresh())}
      disabled={isPending}
      className={
        className ??
        "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
      }
    >
      {isPending ? "새로고침 중..." : label}
    </button>
  );
}
