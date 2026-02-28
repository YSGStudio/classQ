#!/usr/bin/env node

import { spawnSync } from "node:child_process";

const steps = [
  ["npm", ["run", "verify:env"]],
  ["npm", ["run", "lint"]],
  ["npm", ["run", "typecheck"]],
  ["npm", ["run", "build"]],
];

for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("[predeploy-check] all checks passed");
