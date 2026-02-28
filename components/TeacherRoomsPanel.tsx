"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import type { Room } from "@/types";

type TeacherRoomsPanelProps = {
  initialRooms: Room[];
};

export default function TeacherRoomsPanel({ initialRooms }: TeacherRoomsPanelProps) {
  const [rooms, setRooms] = useState<Room[]>(initialRooms);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [origin, setOrigin] = useState("");
  const [qrImages, setQrImages] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    setOrigin(window.location.origin);

    async function syncRooms() {
      try {
        const res = await fetch("/api/teacher/rooms", { cache: "no-store" });
        const payload = (await res.json()) as { rooms?: Room[] };
        if (!res.ok || !payload.rooms || !active) return;
        setRooms(payload.rooms);
      } catch {
        // keep server-rendered data if sync fails
      }
    }

    void syncRooms();
    return () => {
      active = false;
    };
  }, []);

  function getRoomLoginUrl(roomCode: string) {
    return `${origin}/student/login?room=${roomCode}`;
  }

  async function copyRoomQrLink(roomCode: string) {
    await navigator.clipboard.writeText(`${window.location.origin}/student/login?room=${roomCode}`);
    setStatus("방 입장 링크를 복사했습니다.");
  }

  async function showRoomQr(roomCode: string) {
    const url = `${window.location.origin}/student/login?room=${roomCode}`;
    const dataUrl = await QRCode.toDataURL(url, { margin: 1, width: 180 });
    setQrImages((prev) => ({ ...prev, [roomCode]: dataUrl }));
    setStatus("방 입장 QR 이미지를 생성했습니다.");
  }

  async function handleCreateRoom() {
    if (!name.trim()) return;
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch("/api/teacher/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject }),
      });

      const payload = await res.json();
      if (!res.ok || !payload.room) {
        throw new Error(payload.error ?? "방 생성 실패");
      }

      setRooms((prev) => [payload.room as Room, ...prev]);
      setName("");
      setSubject("");
      setStatus("새 방을 생성했습니다.");
    } catch {
      setStatus("방 생성에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function toggleRoom(room: Room) {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/rooms/${room.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !room.isActive }),
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "방 상태 변경 실패");

      setRooms((prev) =>
        prev.map((item) =>
          item.id === room.id ? { ...item, isActive: !room.isActive } : item,
        ),
      );
      setStatus(`방을 ${room.isActive ? "비활성화" : "활성화"}했습니다.`);
    } catch {
      setStatus("방 상태 변경에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function removeRoom(roomId: string) {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/rooms/${roomId}`, { method: "DELETE" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "방 삭제 실패");

      setRooms((prev) => prev.filter((room) => room.id !== roomId));
      setStatus("방을 삭제했습니다.");
    } catch {
      setStatus("방 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="mb-3 text-xl font-black text-[#113459]">방 목록</h2>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="방 이름"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="과목"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void handleCreateRoom()}
          disabled={loading || !name.trim()}
          className="rounded-lg bg-[#2E6DB4] px-4 py-2 text-sm font-bold text-white hover:bg-[#245990] disabled:bg-slate-300"
        >
          방 생성
        </button>
      </div>

      <ul className="space-y-2 text-sm">
        {rooms.map((room) => (
          <li
            key={room.id}
            className="rounded-lg border border-slate-200 p-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{room.name}</p>
                <p className="text-slate-500">
                  {room.subject} · 코드 {room.code} · {room.isActive === false ? "비활성" : "활성"}
                </p>
                {origin ? (
                  <p className="mt-1 break-all text-xs text-slate-500">
                    입장 링크: {getRoomLoginUrl(room.code)}
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/room/${room.code}`}
                  className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 font-semibold text-[#2E6DB4] hover:bg-[#F0F4FF]"
                >
                  입장
                </Link>
                <Link
                  href={`/teacher/rooms/${room.id}/stats`}
                  className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 font-semibold text-[#2E6DB4] hover:bg-[#F0F4FF]"
                >
                  통계
                </Link>
                <button
                  type="button"
                  onClick={() => void toggleRoom(room)}
                  className="rounded-lg border border-[#F5A623]/30 bg-[#FFF8E8] px-3 py-2 text-xs font-semibold text-[#9b6a10]"
                >
                  {room.isActive === false ? "활성화" : "비활성화"}
                </button>
                <button
                  type="button"
                  onClick={() => void copyRoomQrLink(room.code)}
                  className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 text-xs font-semibold text-[#2E6DB4]"
                >
                  입장 링크 복사
                </button>
                <button
                  type="button"
                  onClick={() => void showRoomQr(room.code)}
                  className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 text-xs font-semibold text-[#2E6DB4]"
                >
                  방 QR 보기
                </button>
                <button
                  type="button"
                  onClick={() => void removeRoom(room.id)}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
            {qrImages[room.code] ? (
              <div className="mt-3">
                <Image
                  src={qrImages[room.code]}
                  alt={`${room.name} 입장 QR`}
                  width={128}
                  height={128}
                  className="h-32 w-32 rounded-md border border-slate-200 bg-white p-1"
                />
              </div>
            ) : null}
          </li>
        ))}
      </ul>

      {status ? <p className="mt-3 text-sm font-semibold text-[#2E6DB4]">{status}</p> : null}
    </article>
  );
}
