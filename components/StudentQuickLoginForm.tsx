"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type StudentCandidate = {
  id: string;
  name: string;
};

type StudentQuickLoginFormProps = {
  initialRoomCode?: string;
};

export default function StudentQuickLoginForm({ initialRoomCode }: StudentQuickLoginFormProps) {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState(initialRoomCode?.trim().toUpperCase() || "AB1234");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentCandidate[]>([]);
  const [selectedId, setSelectedId] = useState<string>("");
  const [isFindingRoom, setIsFindingRoom] = useState(false);
  const [isEntering, setIsEntering] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const handleFindRoom = useCallback(async (codeInput?: string) => {
    const code = (codeInput ?? roomCode).trim().toUpperCase();
    if (!code) return;

    setIsFindingRoom(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/rooms/by-code/${code}/students`, {
        method: "GET",
      });
      const payload = await res.json();

      if (!res.ok) {
        setStatus(payload.error ?? "방을 찾을 수 없습니다.");
        setStudents([]);
        setRoomName(null);
        return;
      }

      setStudents(payload.students ?? []);
      setRoomName(payload.room?.name ?? null);
      setSelectedId("");
      setStatus("이름을 선택하고 입장하기를 눌러주세요.");
    } catch {
      setStatus("방 조회 중 오류가 발생했습니다.");
      setStudents([]);
      setRoomName(null);
    } finally {
      setIsFindingRoom(false);
    }
  }, [roomCode]);

  useEffect(() => {
    const code = initialRoomCode?.trim().toUpperCase();
    if (!code || code.length !== 6) return;
    setRoomCode(code);
    void handleFindRoom(code);
  }, [handleFindRoom, initialRoomCode]);

  async function handleEnterRoom() {
    const code = roomCode.trim().toUpperCase();
    if (!code || !selectedId) return;

    setIsEntering(true);
    setStatus("입장중입니다.");

    try {
      const res = await fetch("/api/student/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode: code, studentId: selectedId }),
      });

      const payload = await res.json();

      if (!res.ok) {
        setStatus(payload.error ?? "입장에 실패했습니다.");
        return;
      }

      router.push(payload.redirectTo ?? `/room/${code}`);
      router.refresh();
    } catch {
      setStatus("입장 중 오류가 발생했습니다.");
    } finally {
      setIsEntering(false);
    }
  }

  return (
    <div className="mt-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
          <p className="text-sm font-bold text-[#2E6DB4]">1단계. 방 코드 입력</p>
          <input
            value={roomCode}
            onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
            maxLength={6}
            className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 tracking-[0.25em] uppercase"
          />
          <button
            type="button"
            onClick={() => void handleFindRoom()}
            disabled={isFindingRoom || isEntering || roomCode.trim().length < 6}
            className="mt-3 w-full rounded-lg bg-[#2E6DB4] px-3 py-2 text-sm font-bold text-white hover:bg-[#245990] disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isFindingRoom ? "조회 중..." : "학생 목록 불러오기"}
          </button>
          {roomName ? <p className="mt-2 text-xs text-slate-600">방: {roomName}</p> : null}
        </div>

        <div className="rounded-xl border border-[#2E6DB4]/20 bg-[#F0F4FF] p-4">
          <p className="text-sm font-bold text-[#2E6DB4]">2단계. 이름 선택</p>
          <div className="mt-2 space-y-2">
            {students.length === 0 ? (
              <p className="rounded-lg bg-white px-3 py-2 text-sm text-slate-500">학생 목록이 없습니다.</p>
            ) : (
              students.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm"
                >
                  <input
                    name="student"
                    type="radio"
                    value={student.id}
                    checked={selectedId === student.id}
                    onChange={() => setSelectedId(student.id)}
                  />
                  <span>{student.name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-[#F5A623] bg-[#FFF8E8] p-4">
        <p className="text-sm font-semibold text-[#8f6211]">
          방 QR 스캔 시 방코드가 자동 입력됩니다. 이름만 선택해 입장하세요.
        </p>
      </div>

      <button
        type="button"
        onClick={() => void handleEnterRoom()}
        disabled={isEntering || isFindingRoom || !selectedId}
        className="mt-6 block w-full rounded-lg bg-[#F5A623] px-4 py-3 text-center text-sm font-bold text-white hover:bg-[#d7911f] disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        {isEntering ? "입장 중..." : "입장하기"}
      </button>

      {status ? <p className="mt-3 text-sm font-semibold text-[#2E6DB4]">{status}</p> : null}
    </div>
  );
}
