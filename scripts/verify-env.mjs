#!/usr/bin/env node

const requiredInProduction = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "STUDENT_SESSION_SECRET",
];

const isProduction = process.env.NODE_ENV === "production" || process.env.CI === "true";

if (!isProduction) {
  console.log("[verify-env] skipped (NODE_ENV is not production and CI is not true)");
  process.exit(0);
}

const missing = requiredInProduction.filter((name) => !process.env[name]);

if (missing.length > 0) {
  console.error("[verify-env] missing required env vars:");
  for (const name of missing) {
    console.error(`- ${name}`);
  }
  process.exit(1);
}

console.log("[verify-env] all required env vars are set");
