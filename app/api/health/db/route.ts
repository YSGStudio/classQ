import { NextResponse } from "next/server";
import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase-admin";

export async function GET() {
  if (!hasSupabaseEnv() || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { ok: false, reason: "supabase env missing" },
      { status: 503 },
    );
  }

  try {
    const admin = createAdminClient();
    const { error } = await admin.from("rooms").select("id").limit(1);

    if (error) {
      return NextResponse.json({ ok: false, reason: error.message }, { status: 503 });
    }

    return NextResponse.json({ ok: true, db: "supabase" }, { status: 200 });
  } catch {
    return NextResponse.json({ ok: false, reason: "db connection error" }, { status: 503 });
  }
}
