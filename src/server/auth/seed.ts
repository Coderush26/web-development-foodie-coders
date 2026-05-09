import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { ensureAuthFoundation } from "@/server/auth/foundation";

function loadLocalEnvFile() {
  const envPath = resolve(process.cwd(), ".env");

  if (!existsSync(envPath)) {
    return;
  }

  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^(['"])(.*)\1$/, "$2");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

async function main() {
  loadLocalEnvFile();
  await ensureAuthFoundation();
  console.log("Auth foundation is ready.");
}

void main().catch((error) => {
  console.error("Failed to prepare auth foundation.", error);
  process.exit(1);
});
