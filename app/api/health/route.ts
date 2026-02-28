import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    {
      ok: true,
      service: "classq-web",
      timestamp: new Date().toISOString(),
      uptimeSec: Math.floor(process.uptime()),
    },
    { status: 200 },
  );
}
