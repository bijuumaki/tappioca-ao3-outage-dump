import nextEnv from "@next/env";
import { removeFixtures } from "../support/fixtures";

nextEnv.loadEnvConfig(process.cwd());

export default async function globalTeardown() {
  await removeFixtures();
}
