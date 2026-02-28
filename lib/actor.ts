import { createServerClient as createSupabaseServerClient } from "@supabase/ssr";
import type { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";
import {
  parseStudentSessionToken,
  STUDENT_SESSION_COOKIE,
  type StudentSession,
} from "@/lib/student-session";

type Actor = {
  id: string;
  role: "teacher" | "student";
  name: string;
  roomId?: string;
};

async function resolveSupabaseActor(request: NextRequest): Promise<Actor | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey || !serviceRoleKey) return null;

  const supabase = createSupabaseServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // route handler read-only for this flow
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, name")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  return {
    id: profile.id,
    role: profile.role,
    name: profile.name,
  };
}

function resolveStudentCookieActor(request: NextRequest): Actor | null {
  const raw = request.cookies.get(STUDENT_SESSION_COOKIE)?.value;
  const session = parseStudentSessionToken(raw);
  if (!session) return null;

  return {
    id: session.profileId,
    role: "student",
    name: session.name,
    roomId: session.roomId,
  };
}

export async function resolveActor(request: NextRequest): Promise<Actor | null> {
  const isTeacherApi = request.nextUrl.pathname.startsWith("/api/teacher");

  if (isTeacherApi) {
    const supabaseActor = await resolveSupabaseActor(request);
    if (supabaseActor) return supabaseActor;
    return resolveStudentCookieActor(request);
  }

  const studentActor = resolveStudentCookieActor(request);
  if (studentActor) return studentActor;

  return resolveSupabaseActor(request);
}

export function getStudentSessionFromRequest(
  request: NextRequest,
): StudentSession | null {
  const raw = request.cookies.get(STUDENT_SESSION_COOKIE)?.value;
  return parseStudentSessionToken(raw);
}
