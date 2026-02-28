"use client";

import { useEffect } from "react";

export default function ClearStudentSessionOnTeacherDashboard() {
  useEffect(() => {
    void fetch("/api/student/session", { method: "DELETE" });
  }, []);

  return null;
}

