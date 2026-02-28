import crypto from "node:crypto";

export const STUDENT_SESSION_COOKIE = "classq_student_session";

export type StudentSession = {
  profileId: string;
  role: "student";
  name: string;
  roomId: string;
  exp: number;
};

function getSecret() {
  return process.env.STUDENT_SESSION_SECRET || "classq-dev-secret";
}

function base64url(input: string) {
  return Buffer.from(input, "utf8").toString("base64url");
}

function unbase64url(input: string) {
  return Buffer.from(input, "base64url").toString("utf8");
}

function sign(payload: string) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function createStudentSessionToken(session: StudentSession) {
  const payload = base64url(JSON.stringify(session));
  const signature = sign(payload);
  return `${payload}.${signature}`;
}

export function parseStudentSessionToken(token: string | undefined): StudentSession | null {
  if (!token) return null;

  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) return null;

  try {
    const parsed = JSON.parse(unbase64url(payload)) as StudentSession;
    if (!parsed.profileId || !parsed.roomId || !parsed.exp || parsed.role !== "student") {
      return null;
    }
    if (Date.now() > parsed.exp) return null;
    return parsed;
  } catch {
    return null;
  }
}
