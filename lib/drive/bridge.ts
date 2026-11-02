/* The website's connection to the Google Drive bridge (apps-script/drive-bridge.gs). Server-side only:
   the secret token must never reach the browser. */

export type DriveFile = { id: string; name: string; path: string; size: number; modified: string };

export class DriveError extends Error {
  constructor(message: string, public code: string) { super(message); this.name = "DriveError"; }
}

const MESSAGES: Record<string, string> = {
  unauthorized: "Google Drive didn’t accept the secret word (token). Check that DRIVE_BRIDGE_TOKEN matches the TOKEN in the script.",
  bad_request: "Google Drive didn’t understand that request.",
  not_found: "That file is no longer in Google Drive.",
  outside_folder: "That file isn’t inside the Fic Library folder.",
  too_large: "That file is over 25 MB.",
  type_not_allowed: "That isn’t a type I can use (.html, .md, .txt, .docx or .epub).",
  server_error: "Google Drive had a problem. Try again in a moment.",
};

type Options = { url: string; token: string; fetchImpl?: typeof fetch; timeoutMs?: number };

export function createBridge({ url, token, fetchImpl = fetch, timeoutMs = 50_000 }: Options) {
  async function call(body: Record<string, unknown>): Promise<Record<string, unknown>> {
    let text: string;
    try {
      const res = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "text/plain;charset=utf-8" },
        body: JSON.stringify({ token, ...body }),
        redirect: "follow",
        signal: AbortSignal.timeout(timeoutMs),
      });
      text = await res.text();
    } catch (e) {
      if (e instanceof Error && (e.name === "TimeoutError" || e.name === "AbortError")) throw new DriveError("Google Drive took too long to answer. Try again.", "timeout");
      throw new DriveError("Couldn’t reach Google Drive. Check the address in DRIVE_BRIDGE_URL.", "unreachable");
    }
    let json: { ok?: boolean; error?: string };
    try { json = JSON.parse(text); }
    catch { throw new DriveError("That address answered with a web page instead of the Drive bridge. In the script’s deployment “Who has access” must be “Anyone”, and the address must end in /exec.", "not_bridge"); }
    if (!json.ok) throw new DriveError(MESSAGES[json.error ?? ""] ?? MESSAGES.server_error, String(json.error ?? "server_error"));
    return json as Record<string, unknown>;
  }

  return {
    async ping(): Promise<{ folder: string }> {
      return { folder: String((await call({ action: "ping" })).folder) };
    },
    async list(): Promise<DriveFile[]> {
      return (await call({ action: "list" })).files as DriveFile[];
    },
    async get(id: string): Promise<{ name: string; bytes: Uint8Array }> {
      const r = await call({ action: "get", id });
      return { name: String(r.name), bytes: new Uint8Array(Buffer.from(String(r.data), "base64")) };
    },
    async put(file: { folder: string; name: string; bytes: Uint8Array }): Promise<{ id: string; name: string; path: string }> {
      const r = await call({ action: "put", folder: file.folder, name: file.name, data: Buffer.from(file.bytes).toString("base64") });
      return { id: String(r.id), name: String(r.name), path: String(r.path) };
    },
  };
}

export type Bridge = ReturnType<typeof createBridge>;

/* Connected only when both settings are present. Without them the whole Drive feature stays out of sight. */
export function bridgeFromEnv(): Bridge | null {
  const url = process.env.DRIVE_BRIDGE_URL?.trim();
  const token = process.env.DRIVE_BRIDGE_TOKEN?.trim();
  return url && token ? createBridge({ url, token }) : null;
}
