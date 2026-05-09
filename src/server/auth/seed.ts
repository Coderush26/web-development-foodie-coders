import { ensureAuthFoundation } from "@/server/auth/foundation";

async function main() {
  await ensureAuthFoundation();
  console.log("Auth foundation is ready.");
}

void main().catch((error) => {
  console.error("Failed to prepare auth foundation.", error);
  process.exit(1);
});
