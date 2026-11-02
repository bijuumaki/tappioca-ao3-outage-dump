import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;
import { ensureAdmin, hasSecret, TEST_ADMIN } from "../support/supabase-admin";

export default async function globalSetup() {
  loadEnvConfig(process.cwd());
  if (hasSecret()) await ensureAdmin(TEST_ADMIN.email, process.env.E2E_ADMIN_PASSWORD!);
}
