import { describe, expect, it, vi } from "vitest";
import { sendCommentAlert } from "@/lib/email/resend";

const env = { RESEND_API_KEY: "re_test_key", RESEND_FROM: "Archive <onboarding@resend.dev>", ALERT_EMAIL: "owner@example.test" };
const comment = { ficTitle: "A Story", chapterN: 2, name: "Sam", body: "Loved it", url: "https://example.test/fics/a-story/2" };

describe("sendCommentAlert", () => {
  it("posts one email to Resend with the right key, sender and recipient", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendCommentAlert(comment, { fetchImpl: fetchImpl as unknown as typeof fetch, env });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer re_test_key");
    const body = JSON.parse(init.body as string);
    expect(body.from).toBe(env.RESEND_FROM);
    expect(body.to).toEqual(["owner@example.test"]);
    expect(body.subject).toBe("New comment on A Story, chapter 2");
    expect(body.html).toContain("https://example.test/fics/a-story/2");
  });

  it("escapes anything a reader typed", async () => {
    const fetchImpl = vi.fn(async () => new Response("{}", { status: 200 }));
    await sendCommentAlert({ ...comment, name: "<script>x</script>", body: "<img src=x onerror=1> & more", ficTitle: "<b>T</b>" }, { fetchImpl: fetchImpl as unknown as typeof fetch, env });
    const html = JSON.parse((fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).html as string;
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<img");
    expect(html).not.toContain("<b>T</b>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("&amp; more");
  });

  it("does nothing when a setting is missing", async () => {
    for (const missing of ["RESEND_API_KEY", "RESEND_FROM", "ALERT_EMAIL"]) {
      const fetchImpl = vi.fn(async () => new Response("{}"));
      await sendCommentAlert(comment, { fetchImpl: fetchImpl as unknown as typeof fetch, env: { ...env, [missing]: undefined } });
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });

  it("gives up on a request that hangs", async () => {
    const hang = ((_url: string, init: RequestInit) => new Promise((_, reject) => {
      init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
    })) as unknown as typeof fetch;
    await expect(sendCommentAlert(comment, { fetchImpl: hang, env, timeoutMs: 30 })).resolves.toBeUndefined();
  });

  it("never throws, even when the network or Resend fails", async () => {
    await expect(sendCommentAlert(comment, { fetchImpl: (async () => { throw new Error("offline"); }) as unknown as typeof fetch, env })).resolves.toBeUndefined();
    await expect(sendCommentAlert(comment, { fetchImpl: (async () => new Response("no", { status: 500 })) as unknown as typeof fetch, env })).resolves.toBeUndefined();
  });
});
