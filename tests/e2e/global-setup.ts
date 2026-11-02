import nextEnv from "@next/env";
import { seedFixtures } from "../support/fixtures";
import { startMockDrive } from "../support/mock-drive";
import { ensureAdmin, hasSecret, TEST_ADMIN } from "../support/supabase-admin";

const { loadEnvConfig } = nextEnv;

export default async function globalSetup() {
  loadEnvConfig(process.cwd());
  if (!hasSecret()) throw new Error("Tests need SUPABASE_SECRET_KEY and E2E_ADMIN_PASSWORD in .env.local");
  await ensureAdmin(TEST_ADMIN.email, process.env.E2E_ADMIN_PASSWORD!);
  await seedFixtures();
  const mock = await startMockDrive({ port: 4011, token: "mock-token-for-browser-tests" });
  return async () => { await mock.stop(); };
}
