"use server";
import { createHash } from "node:crypto";
import { createSecretClient } from "@/lib/supabase/secret";
import type { Json } from "@/lib/supabase/database.types";
import { CODE_PATTERN, cleanMarks, mergeMarks, type Mark } from "./model";

export type SyncResult = { ok: true; marks: Mark[] } | { ok: false; error: string };

/* Only a hash of the code is stored. The code itself has 80 bits, so a plain hash cannot be run backwards by guessing. */
const hashCode = (code: string) => createHash("sha256").update(`tappioca-sync-v1:${code}`).digest("hex");
const MAX_BYTES = 1_500_000;

/* Merges the browser's highlights with the saved copy for this code, stores the result and sends it back. */
export async function syncMarks(code: string, marks: unknown): Promise<SyncResult> {
  if (!CODE_PATTERN.test(code)) return { ok: false, error: "That code doesn't look right." };
  const mine = cleanMarks(marks);
  try {
    const db = createSecretClient();
    const key = hashCode(code);
    const { data: row, error } = await db.from("reader_sync").select("data").eq("code_hash", key).maybeSingle();
    if (error) return { ok: false, error: "Sync isn't available right now." };
    const merged = mergeMarks(cleanMarks(row?.data), mine);
    if (JSON.stringify(merged).length > MAX_BYTES) return { ok: false, error: "There are too many highlights to sync." };
    const { error: writeError } = await db.from("reader_sync")
      .upsert({ code_hash: key, data: merged as unknown as Json, updated_at: new Date().toISOString() });
    if (writeError) return { ok: false, error: "Sync isn't available right now." };
    return { ok: true, marks: merged };
  } catch {
    return { ok: false, error: "Sync isn't available right now." };
  }
}

/* Whether a code already has saved highlights (so "use a code from another device" can tell a typo from a real code). */
export async function codeExists(code: string): Promise<boolean> {
  if (!CODE_PATTERN.test(code)) return false;
  try {
    const { data } = await createSecretClient().from("reader_sync").select("code_hash").eq("code_hash", hashCode(code)).maybeSingle();
    return !!data;
  } catch {
    return false;
  }
}

/* Removes the saved copy. Highlights stay in the browsers that have them. */
export async function deleteSynced(code: string): Promise<boolean> {
  if (!CODE_PATTERN.test(code)) return false;
  try {
    const { error } = await createSecretClient().from("reader_sync").delete().eq("code_hash", hashCode(code));
    return !error;
  } catch {
    return false;
  }
}
