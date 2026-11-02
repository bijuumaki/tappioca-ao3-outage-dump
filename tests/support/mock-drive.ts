import http from "node:http";
import type { AddressInfo } from "node:net";

/* A stand-in for the Google Drive bridge, speaking the same protocol, so no test ever touches the real Drive.
   Browser tests control it over HTTP: GET /__state, POST /__control {mode, failPut, reset, add:[{path, content}]}. */
export type MockMode = "ok" | "html" | "slow" | "fail";
export type MockFile = { id: string; path: string; name: string; bytes: Buffer; modified: string };
const ALLOWED = /\.(html|htm|md|markdown|txt|docx|epub)$/i;

export type MockDrive = { url: string; port: number; token: string; folder: string; files: MockFile[]; setMode(m: MockMode): void; stop(): Promise<void>; calls: string[] };

export async function startMockDrive(opts: { port?: number; token?: string; folder?: string } = {}): Promise<MockDrive> {
  const token = opts.token ?? "mock-token-1234567890";
  const folder = opts.folder ?? "(mock) Fic Library";
  let mode: MockMode = "ok";
  let failPut = false;
  let n = 0;
  const files: MockFile[] = [];
  const calls: string[] = [];
  const add = (path: string, content: string | Buffer) => {
    const name = path.split("/").pop()!;
    files.push({ id: `MOCK_ID_${String(++n).padStart(8, "0")}`, path, name, bytes: Buffer.from(content), modified: "2026-11-03T10:00:00.000Z" });
  };

  const server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", async () => {
      const body = Buffer.concat(chunks).toString("utf8");
      const send = (obj: unknown, type = "application/json") => { res.writeHead(200, { "content-type": type }); res.end(typeof obj === "string" ? obj : JSON.stringify(obj)); };
      if (req.url === "/__state") return send({ mode, failPut, calls, files: files.map((f) => ({ path: f.path, name: f.name, size: f.bytes.length, content: f.bytes.toString("utf8") })) });
      if (req.url === "/__control") {
        const c = JSON.parse(body || "{}");
        if (c.reset) { files.length = 0; calls.length = 0; mode = "ok"; failPut = false; }
        if (c.mode) mode = c.mode;
        if (typeof c.failPut === "boolean") failPut = c.failPut;
        for (const f of c.add ?? []) add(f.path, f.content);
        return send({ ok: true });
      }
      if (mode === "html") return send("<!doctype html><html><body>Sign in - Google Accounts</body></html>", "text/html");
      if (mode === "slow") await new Promise((r) => setTimeout(r, 3000));
      let r: { token?: string; action?: string; id?: string; folder?: string; name?: string; data?: string };
      try { r = JSON.parse(body); } catch { return send({ ok: false, error: "bad_request" }); }
      if (r.token !== token) return send({ ok: false, error: "unauthorized" });
      calls.push(`${r.action}${r.name ? ":" + r.folder + "/" + r.name : ""}`);
      if (mode === "fail") return send({ ok: false, error: "server_error" });
      switch (r.action) {
        case "ping": return send({ ok: true, folder });
        case "list": return send({ ok: true, files: files.filter((f) => ALLOWED.test(f.name)).map((f) => ({ id: f.id, name: f.name, path: f.path, size: f.bytes.length, modified: f.modified })) });
        case "get": {
          const f = files.find((x) => x.id === r.id);
          if (!f) return send({ ok: false, error: "not_found" });
          if (f.bytes.length > 25 * 1024 * 1024) return send({ ok: false, error: "too_large" });
          return send({ ok: true, name: f.name, size: f.bytes.length, data: f.bytes.toString("base64") });
        }
        case "put": {
          if (failPut) return send({ ok: false, error: "server_error" });
          if (!r.folder || !r.name || !r.data) return send({ ok: false, error: "bad_request" });
          let name = r.name;
          if (files.some((f) => f.path === `${r.folder}/${name}`)) name = name.replace(/(\.[^.]+)$/, ` (${new Date().toISOString().replace(/[:.]/g, "-")})$1`);
          add(`${r.folder}/${name}`, Buffer.from(r.data, "base64"));
          const f = files[files.length - 1];
          return send({ ok: true, id: f.id, name, path: f.path });
        }
        default: return send({ ok: false, error: "bad_request" });
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(opts.port ?? 0, "127.0.0.1", resolve));
  const port = (server.address() as AddressInfo).port;
  return {
    url: `http://127.0.0.1:${port}/exec`, port, token, folder, files, calls,
    setMode: (m) => { mode = m; },
    stop: () => new Promise<void>((resolve) => { server.closeAllConnections?.(); server.close(() => resolve()); }),
  };
}
