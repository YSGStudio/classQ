import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasSupabaseEnv } from "@/lib/env";
import {
  parseStudentSessionToken,
  STUDENT_SESSION_COOKIE,
} from "@/lib/student-session";
import { createServerClient } from "@/utils/supabase/server";

type AuthProfile = {
  id: string;
  role: "teacher" | "student";
  name: string;
  roomId?: string;
};

async function getCookieStudentProfile(): Promise<AuthProfile | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(STUDENT_SESSION_COOKIE)?.value;
  const session = parseStudentSessionToken(token);
  if (!session) return null;

  return {
    id: session.profileId,
    role: "student",
    name: session.name,
    roomId: session.roomId,
  };
}

export async function getCurrentProfile(): Promise<AuthProfile | null> {
  if (hasSupabaseEnv()) {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("id, role, name")
        .eq("id", user.id)
        .single();

      if (data) {
        return data as AuthProfile;
      }
    }
  }

  return getCookieStudentProfile();
}

export async function getCurrentStudentProfile(): Promise<AuthProfile | null> {
  const cookieProfile = await getCookieStudentProfile();
  if (cookieProfile) return cookieProfile;

  if (!hasSupabaseEnv()) return null;

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, role, name")
    .eq("id", user.id)
    .single();

  if (!data || data.role !== "student") return null;
  return data as AuthProfile;
}

export async function requireTeacher() {
  if (!hasSupabaseEnv()) return;

  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "teacher") {
    redirect("/teacher/login");
  }
}

export async function requireStudent() {
  if (!hasSupabaseEnv()) return;

  const profile = await getCurrentStudentProfile();
  if (!profile || profile.role !== "student") {
    redirect("/student/login");
  }
}
