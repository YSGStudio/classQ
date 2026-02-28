"use client";

import { useEffect, useState } from "react";

type StudentItem = {
  id: string;
  name: string;
};

export default function TeacherStudentsPanel() {
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [newName, setNewName] = useState("");
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void loadStudents();
  }, []);

  async function loadStudents() {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/students`);
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "학생 조회 실패");
      setStudents(payload.students ?? []);
      setStatus("학생 목록을 불러왔습니다.");
    } catch {
      setStatus("학생 목록 조회에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function addStudent() {
    const name = newName.trim();
    if (!name) return;

    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/students`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const payload = await res.json();
      if (!res.ok || !payload.student) throw new Error(payload.error ?? "학생 추가 실패");

      setStudents((prev) => [payload.student, ...prev]);
      setNewName("");
      setStatus("학생을 추가했습니다.");
    } catch {
      setStatus("학생 추가에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function removeStudent(studentId: string) {
    setLoading(true);
    setStatus(null);

    try {
      const res = await fetch(`/api/teacher/students/${studentId}`, {
        method: "DELETE",
      });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error ?? "삭제 실패");

      setStudents((prev) => prev.filter((student) => student.id !== studentId));
      setStatus("학생을 삭제했습니다.");
    } catch {
      setStatus("학생 삭제에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <article className="rounded-2xl bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-black text-[#113459]">학생 계정 관리 (방 공통)</h2>
        <button
          type="button"
          onClick={() => void loadStudents()}
          disabled={loading}
          className="rounded-lg border border-[#2E6DB4]/30 px-3 py-2 text-sm font-semibold text-[#2E6DB4] hover:bg-[#F0F4FF] disabled:bg-slate-100"
        >
          목록 새로고침
        </button>
      </div>

      <div className="mb-4 grid gap-2 sm:grid-cols-[1fr_auto]">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="학생 이름 입력"
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => void addStudent()}
          disabled={loading || newName.trim().length === 0}
          className="rounded-lg bg-[#2E6DB4] px-4 py-2 text-sm font-bold text-white hover:bg-[#245990] disabled:bg-slate-300"
        >
          학생 추가
        </button>
      </div>

      <ul className="space-y-2">
        {students.map((student) => (
          <li key={student.id} className="rounded-lg border border-slate-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-semibold text-slate-800">{student.name}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => void removeStudent(student.id)}
                  className="rounded-lg border border-red-300 bg-red-50 px-3 py-1 text-xs font-semibold text-red-600"
                >
                  삭제
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {students.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">학생 계정이 없습니다.</p>
      ) : null}

      {status ? <p className="mt-3 text-sm font-semibold text-[#2E6DB4]">{status}</p> : null}
    </article>
  );
}
