"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type TeacherRoomActionsProps = {
  roomId: string;
  isActive?: boolean;
};

export default function TeacherRoomActions({ roomId, isActive = true }: TeacherRoomActionsProps) {
  const router = useRouter();
  const [active, setActive] = useState(isActive);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function toggleActive() {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/rooms/${roomId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !active }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "상태 변경 실패");

      setActive(!active);
      setStatus(`방을 ${active ? "비활성화" : "활성화"}했습니다.`);
    } catch {
      setStatus("방 상태 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteRoom() {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/rooms/${roomId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "삭제 실패");

      router.push("/teacher/dashboard");
      router.refresh();
    } catch {
      setStatus("방 삭제에 실패했습니다.");
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mt-5 grid gap-4 md:grid-cols-3">
        <button
          type="button"
          className="rounded-lg border border-[#2E6DB4]/30 bg-white px-4 py-3 text-sm font-bold text-[#2E6DB4]"
        >
          학생 계정은 대시보드에서 관리
        </button>
        <button
          type="button"
          className="rounded-lg border border-[#2E6DB4]/30 bg-white px-4 py-3 text-sm font-bold text-[#2E6DB4]"
        >
          학생은 방코드로 입장
        </button>
        <button
          type="button"
          onClick={() => void toggleActive()}
          disabled={loading}
          className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-100 disabled:bg-slate-200"
        >
          {active ? "방 비활성화" : "방 활성화"}
        </button>
      </div>

      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={() => void deleteRoom()}
          disabled={loading}
          className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600 disabled:bg-slate-200"
        >
          방 완전 삭제
        </button>
      </div>

      {status ? <p className="mt-2 text-sm font-semibold text-[#2E6DB4]">{status}</p> : null}
    </div>
  );
}
