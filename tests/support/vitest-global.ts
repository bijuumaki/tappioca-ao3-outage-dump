import { loadEnv } from "vite";
import { removeFixtures, seedFixtures } from "./fixtures";
import { hasSecret } from "./supabase-admin";

/* Vitest: add the sample content for the database tests, remove it afterwards.
   (Next's env loader skips .env.local in test mode, so this uses Vite's, like vitest.config.ts.) */
export async function setup() {
  Object.assign(process.env, loadEnv("test", process.cwd(), ""));
  if (hasSecret()) await seedFixtures();
}
export async function teardown() {
  if (hasSecret()) await removeFixtures();
}
