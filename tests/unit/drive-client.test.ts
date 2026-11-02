import { afterAll, beforeAll, beforeEach, expect, test } from "vitest";
import { bridgeFromEnv, createBridge, DriveError } from "@/lib/drive/bridge";
import { fandomFolderName, safeDriveName } from "@/lib/drive/names";
import { startMockDrive, type MockDrive } from "../support/mock-drive";

let mock: MockDrive;
const bridge = (over: Partial<Parameters<typeof createBridge>[0]> = {}) => createBridge({ url: mock.url, token: mock.token, ...over });

beforeAll(async () => { mock = await startMockDrive(); });
afterAll(async () => { await mock.stop(); });
beforeEach(() => { mock.files.length = 0; mock.calls.length = 0; mock.setMode("ok"); });

test("ping names the folder", async () => {
  expect(await bridge().ping()).toEqual({ folder: "(mock) Fic Library" });
});

test("list, get and put round-trip real bytes", async () => {
  const saved = await bridge().put({ folder: "Resident Evil", name: "Anam Cara - 1.md", bytes: new TextEncoder().encode("héllo ⁂") });
  expect(saved.path).toBe("Resident Evil/Anam Cara - 1.md");
  const { files, truncated } = await bridge().list();
  expect(truncated).toBe(false);
  expect(files).toHaveLength(1);
  expect(files[0]).toMatchObject({ name: "Anam Cara - 1.md", path: "Resident Evil/Anam Cara - 1.md", size: 10 });
  const got = await bridge().get(files[0].id);
  expect(new TextDecoder().decode(got.bytes)).toBe("héllo ⁂");
  expect(got.name).toBe("Anam Cara - 1.md");
});

test("a wrong token says so in plain words", async () => {
  await expect(bridge({ token: "nope" }).ping()).rejects.toThrow(/secret word|token/i);
  await expect(bridge({ token: "nope" }).ping()).rejects.toBeInstanceOf(DriveError);
});

test("the list can be narrowed to one folder, and says when it was cut off", async () => {
  for (const n of [1, 2, 3]) await bridge().put({ folder: "A", name: `a - ${n}.md`, bytes: new TextEncoder().encode("x") });
  await bridge().put({ folder: "B", name: "b.md", bytes: new TextEncoder().encode("x") });
  expect((await bridge().list("A")).files).toHaveLength(3);
  mock.setListLimit(2);
  const cut = await bridge().list();
  expect(cut.files).toHaveLength(2);
  expect(cut.truncated).toBe(true);
  mock.setListLimit(500);
});

test("a web page instead of the bridge (not shared as Anyone, wrong address) is explained", async () => {
  mock.setMode("html");
  await expect(bridge().ping()).rejects.toThrow(/web page|Anyone|\/exec/i);
});

test("a slow Drive times out instead of hanging", async () => {
  mock.setMode("slow");
  await expect(bridge({ timeoutMs: 200 }).ping()).rejects.toThrow(/too long/i);
});

test("an unreachable address is explained", async () => {
  await expect(createBridge({ url: "http://127.0.0.1:1/exec", token: "x", timeoutMs: 2000 }).ping()).rejects.toThrow(/reach/i);
});

test("the bridge's error codes become plain messages", async () => {
  await expect(bridge().get("MOCK_ID_missing")).rejects.toThrow(/no longer in Google Drive/i);
  mock.setMode("fail");
  await expect(bridge().ping()).rejects.toThrow(/problem|again/i);
});

test("it only counts as connected when both settings are there", () => {
  const keep = { ...process.env };
  delete process.env.DRIVE_BRIDGE_URL; delete process.env.DRIVE_BRIDGE_TOKEN;
  expect(bridgeFromEnv()).toBeNull();
  process.env.DRIVE_BRIDGE_URL = "https://script.google.com/macros/s/x/exec";
  expect(bridgeFromEnv()).toBeNull();
  process.env.DRIVE_BRIDGE_TOKEN = "  ";
  expect(bridgeFromEnv()).toBeNull();
  process.env.DRIVE_BRIDGE_TOKEN = "secret-secret-secret";
  expect(bridgeFromEnv()).not.toBeNull();
  process.env = keep;
});

test("fandom folder names are safe and never empty", () => {
  expect(fandomFolderName("Resident Evil")).toBe("Resident Evil");
  expect(fandomFolderName(null)).toBe("Unsorted");
  expect(fandomFolderName("   ")).toBe("Unsorted");
  expect(fandomFolderName("a/b\\c")).toBe("a-b-c");
  expect(fandomFolderName("..")).toBe("Unsorted");
  expect(fandomFolderName("x".repeat(200)).length).toBeLessThanOrEqual(80);
  expect(/[\ud800-\udbff](?![\udc00-\udfff])/.test(fandomFolderName("😀".repeat(100)))).toBe(false);
});

test("file names keep their extension and pass the bridge's rules", () => {
  expect(safeDriveName("Anam Cara - 1.md")).toBe("Anam Cara - 1.md");
  expect(safeDriveName("a/b..c.epub")).toBe("a-b.c.epub");
  expect(safeDriveName(".hidden.md")).toBe("hidden.md");
  const long = safeDriveName("y".repeat(300) + ".docx");
  expect(long.length).toBeLessThanOrEqual(150);
  expect(long.endsWith(".docx")).toBe(true);
});

test("names ending in dots don't end up with a double dot", () => {
  expect(safeDriveName("To be continued....md")).toBe("To be continued.md");
  expect(safeDriveName("Title..md")).toBe("Title.md");
  expect(safeDriveName("  spaced  .md")).toBe("spaced.md");
  expect(/[\ud800-\udbff](?![\udc00-\udfff])/.test(safeDriveName("😀".repeat(200) + ".md"))).toBe(false);
  expect(safeDriveName("😀".repeat(200) + ".md").length).toBeLessThanOrEqual(150);
});
