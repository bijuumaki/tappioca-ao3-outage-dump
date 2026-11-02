import fs from "node:fs";
import { beforeEach, describe, expect, test } from "vitest";

/* A tiny in-memory Google Drive, with only what the bridge uses. Anything that could delete, move or share throws. */
class Item {
  parents: Folder[] = [];
  constructor(public id: string, public name: string) {}
  getId() { return this.id; }
  getName() { return this.name; }
  getParents() { return iter(this.parents); }
  setTrashed() { throw new Error("the bridge must never trash anything"); }
  moveTo() { throw new Error("the bridge must never move anything"); }
  setSharing() { throw new Error("the bridge must never change sharing"); }
  addEditor() { throw new Error("the bridge must never change sharing"); }
}
class FileItem extends Item {
  constructor(id: string, name: string, public bytes: Uint8Array, public mime = "text/plain", public declaredSize?: number) { super(id, name); }
  getMimeType() { return this.mime; }
  getSize() { return this.declaredSize ?? this.bytes.length; }
  getLastUpdated() { return new Date("2026-11-03T10:00:00Z"); }
  getBlob() { return { getBytes: () => Array.from(this.bytes) }; }
}
class Folder extends Item {
  folders: Folder[] = [];
  files: FileItem[] = [];
  getFolders() { return iter(this.folders); }
  getFiles() { return iter(this.files); }
  getFoldersByName(n: string) { return iter(this.folders.filter((f) => f.name === n)); }
  getFilesByName(n: string) { return iter(this.files.filter((f) => f.name === n)); }
  createFolder(n: string) { const f = new Folder(nextId(), n); f.parents = [this]; this.folders.push(f); return f; }
  createFile(blob: { bytes: number[]; mime: string; name: string }) { const f = new FileItem(nextId(), blob.name, Uint8Array.from(blob.bytes), blob.mime); f.parents = [this]; this.files.push(f); return f; }
}
function iter<T>(items: T[]) { let i = 0; return { hasNext: () => i < items.length, next: () => items[i++] }; }
let counter = 0;
const nextId = () => `ID_${String(++counter).padStart(12, "0")}`;

type Resp = { ok: boolean; error?: string; [k: string]: unknown };
const TOKEN = "a-long-secret-token-for-tests-1234567890";

let root: Folder;
let outside: Folder;
let byId: Map<string, Item>;
let props: Record<string, string>;
let call: (req: unknown) => Resp;

function register(item: Item) { byId.set(item.id, item); return item; }
function addFile(folder: Folder, name: string, content: string, mime = "text/markdown", declaredSize?: number) {
  const f = new FileItem(nextId(), name, new TextEncoder().encode(content), mime, declaredSize);
  f.parents = [folder]; folder.files.push(f); register(f); return f;
}
function addFolder(parent: Folder, name: string) { const f = parent.createFolder(name); register(f); return f; }

beforeEach(() => {
  counter = 0;
  byId = new Map();
  root = new Folder("ROOT_FOLDER_ID_0001", "Fic Library"); register(root);
  outside = new Folder("OUTSIDE_FOLDER_0001", "Other stuff"); register(outside);
  props = { FOLDER_ID: root.id, TOKEN };
  const created: Folder[] = [];
  const drive = {
    getFolderById: (id: string) => { const f = byId.get(id); if (!(f instanceof Folder)) throw new Error("not found"); return f; },
    getFileById: (id: string) => { const f = byId.get(id); if (!(f instanceof FileItem)) throw new Error("not found"); return f; },
  };
  const origCreateFolder = Folder.prototype.createFolder;
  Folder.prototype.createFolder = function (this: Folder, n: string) { const f = origCreateFolder.call(this, n); register(f); created.push(f); return f; };
  const origCreateFile = Folder.prototype.createFile;
  Folder.prototype.createFile = function (this: Folder, b: { bytes: number[]; mime: string; name: string }) { const f = origCreateFile.call(this, b); register(f); return f; };
  const src = fs.readFileSync("apps-script/drive-bridge.gs", "utf8");
  const make = new Function("DriveApp", "PropertiesService", "ContentService", "Utilities", `${src}\n;return { doPost: doPost };`);
  const api = make(
    drive,
    { getScriptProperties: () => ({ getProperty: (k: string) => props[k] ?? null }) },
    { MimeType: { JSON: "json" }, createTextOutput: (t: string) => ({ text: t, setMimeType() { return this; } }) },
    {
      base64Decode: (s: string) => Array.from(Buffer.from(s, "base64")),
      base64Encode: (b: number[]) => Buffer.from(b).toString("base64"),
      newBlob: (bytes: number[], mime: string, name: string) => ({ bytes, mime, name }),
    },
  );
  call = (req) => JSON.parse(api.doPost({ postData: { contents: typeof req === "string" ? req : JSON.stringify(req) } }).text);
  Folder.prototype.createFolder = origCreateFolder; Folder.prototype.createFile = origCreateFile;
  Folder.prototype.createFolder = function (this: Folder, n: string) { const f = origCreateFolder.call(this, n); register(f); return f; };
  Folder.prototype.createFile = function (this: Folder, b: { bytes: number[]; mime: string; name: string }) { const f = origCreateFile.call(this, b); register(f); return f; };
});

describe("the password", () => {
  test("a missing, wrong or empty token is refused and nothing is touched", () => {
    for (const token of [undefined, "", "wrong", TOKEN + "x", TOKEN.slice(1)]) {
      expect(call({ token, action: "put", folder: "F", name: "a.md", data: "aGk=" })).toEqual({ ok: false, error: "unauthorized" });
    }
    expect(root.folders).toHaveLength(0);
    expect(call({ token: TOKEN.slice(1), action: "list" }).error).toBe("unauthorized");
  });
  test("if the TOKEN setting is missing or too short, everything is refused", () => {
    delete props.TOKEN;
    expect(call({ token: "anything", action: "ping" }).error).toBe("unauthorized");
    props.TOKEN = "short";
    expect(call({ token: "short", action: "ping" }).error).toBe("unauthorized");
  });
  test("garbage requests are refused politely", () => {
    expect(call("not json").error).toBe("bad_request");
    expect(call({ token: TOKEN }).error).toBe("bad_request");
  });
});

describe("ping and list", () => {
  test("ping names the folder", () => {
    expect(call({ token: TOKEN, action: "ping" })).toEqual({ ok: true, folder: "Fic Library" });
  });
  test("list walks the folders, shows paths, and only shows files the app can read", () => {
    const re = addFolder(root, "Resident Evil");
    const anam = addFolder(re, "Anam Cara");
    addFile(root, "Loose - 1.md", "a");
    addFile(re, "Moribund.epub", "bb", "application/epub+zip");
    addFile(anam, "Anam Cara - 1.md", "ccc");
    addFile(re, "picture.png", "x", "image/png");
    addFile(re, "notes.exe", "x", "application/octet-stream");
    addFile(outside, "Not mine.md", "x");
    const res = call({ token: TOKEN, action: "list" }) as Resp & { files: { id: string; name: string; path: string; size: number; modified: string }[] };
    expect(res.ok).toBe(true);
    expect(res.files.map((f) => f.path).sort()).toEqual(["Loose - 1.md", "Resident Evil/Anam Cara/Anam Cara - 1.md", "Resident Evil/Moribund.epub"]);
    const loose = res.files.find((f) => f.name === "Loose - 1.md")!;
    expect(loose.size).toBe(1);
    expect(loose.modified).toBe("2026-11-03T10:00:00.000Z");
    expect(loose.id).toMatch(/^ID_/);
  });
  test("list stops at 500 entries and at 3 levels deep", () => {
    let folder = root;
    for (const n of ["a", "b", "c", "d"]) { folder = addFolder(folder, n); addFile(folder, `${n}.md`, "x"); }
    const paths = (call({ token: TOKEN, action: "list" }) as Resp & { files: { path: string }[] }).files.map((f) => f.path);
    expect(paths).toContain("a/b/c/c.md");
    expect(paths.some((p) => p.endsWith("d.md"))).toBe(false);
    for (let i = 0; i < 520; i++) addFile(root, `f${i}.md`, "x");
    expect((call({ token: TOKEN, action: "list" }) as Resp & { files: unknown[] }).files.length).toBe(500);
  });
});

describe("get", () => {
  test("returns the file's bytes as base64", () => {
    const f = addFile(addFolder(root, "RE"), "a - 1.md", "hello");
    expect(call({ token: TOKEN, action: "get", id: f.id })).toEqual({ ok: true, name: "a - 1.md", size: 5, data: Buffer.from("hello").toString("base64") });
  });
  test("a file outside the library folder is refused, even though it is in the same Drive", () => {
    const f = addFile(outside, "secret.md", "private");
    expect(call({ token: TOKEN, action: "get", id: f.id }).error).toBe("outside_folder");
  });
  test("a file shared into two places counts as inside if one of them is the library", () => {
    const f = addFile(outside, "both.md", "x");
    f.parents.push(root);
    expect(call({ token: TOKEN, action: "get", id: f.id }).ok).toBe(true);
  });
  test("unknown ids, a folder id, and made-up ids are not found or bad requests", () => {
    expect(call({ token: TOKEN, action: "get", id: "ID_does_not_exist_00" }).error).toBe("not_found");
    expect(call({ token: TOKEN, action: "get", id: root.id }).error).toBe("not_found");
    expect(call({ token: TOKEN, action: "get", id: "../etc" }).error).toBe("bad_request");
    expect(call({ token: TOKEN, action: "get" }).error).toBe("bad_request");
  });
  test("too big and wrong-type files are refused", () => {
    const big = addFile(root, "big.epub", "x", "application/epub+zip", 26 * 1024 * 1024);
    expect(call({ token: TOKEN, action: "get", id: big.id }).error).toBe("too_large");
    const exe = addFile(root, "run.exe", "x", "application/octet-stream");
    expect(call({ token: TOKEN, action: "get", id: exe.id }).error).toBe("type_not_allowed");
  });
});

describe("put", () => {
  test("saves into a fandom folder, creating it once", () => {
    const a = call({ token: TOKEN, action: "put", folder: "Resident Evil", name: "Anam Cara - 1.md", data: Buffer.from("one").toString("base64") }) as Resp & { id: string; path: string };
    const b = call({ token: TOKEN, action: "put", folder: "Resident Evil", name: "Anam Cara - 2.md", data: Buffer.from("two").toString("base64") }) as Resp & { path: string };
    expect(a.ok && b.ok).toBe(true);
    expect(a.path).toBe("Resident Evil/Anam Cara - 1.md");
    expect(root.folders.map((f) => f.name)).toEqual(["Resident Evil"]);
    expect(root.folders[0].files.map((f) => f.name)).toEqual(["Anam Cara - 1.md", "Anam Cara - 2.md"]);
    expect(Buffer.from(root.folders[0].files[0].bytes).toString()).toBe("one");
  });
  test("the same name twice never overwrites: the second gets a time stamp", () => {
    const put = () => call({ token: TOKEN, action: "put", folder: "Unsorted", name: "Same.md", data: Buffer.from("x").toString("base64") }) as Resp & { name: string };
    const first = put(); const second = put();
    expect(first.name).toBe("Same.md");
    expect(second.name).toMatch(/^Same \(\d{4}-\d{2}-\d{2}T[\d-]+Z?\)\.md$/);
    expect(root.folders[0].files).toHaveLength(2);
    expect(Buffer.from(root.folders[0].files[0].bytes).toString()).toBe("x");
  });
  test("bad folder names, file names, types and empty data are refused", () => {
    const ok = Buffer.from("x").toString("base64");
    const bad = (over: Record<string, unknown>) => call({ token: TOKEN, action: "put", folder: "F", name: "a.md", data: ok, ...over }).error;
    expect(bad({ name: "a.exe" })).toBe("type_not_allowed");
    expect(bad({ name: "../a.md" })).toBe("bad_request");
    expect(bad({ name: "x/a.md" })).toBe("bad_request");
    expect(bad({ name: ".hidden.md" })).toBe("bad_request");
    expect(bad({ folder: "../.." })).toBe("bad_request");
    expect(bad({ folder: "a/b" })).toBe("bad_request");
    expect(bad({ folder: "" })).toBe("bad_request");
    expect(bad({ data: "" })).toBe("bad_request");
    expect(bad({ data: "A".repeat(35_000_000) })).toBe("too_large");
    expect(root.folders.flatMap((f) => f.files)).toHaveLength(0);
  });
});

describe("what it can never do", () => {
  test("there is no delete, move or share action", () => {
    for (const action of ["delete", "trash", "move", "share", "rename", "update", "mkdir"]) {
      expect(call({ token: TOKEN, action, id: root.id }).error, action).toBe("bad_request");
    }
  });
  test("it only ever reads and writes inside the library folder", () => {
    addFile(outside, "x.md", "x");
    call({ token: TOKEN, action: "list" });
    call({ token: TOKEN, action: "put", folder: "F", name: "a.md", data: Buffer.from("x").toString("base64") });
    expect(outside.files).toHaveLength(1);
    expect(outside.folders).toHaveLength(0);
  });
});
