import "server-only";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

/* Tells the author about a new comment. Uses RESEND_API_KEY, RESEND_FROM and ALERT_EMAIL; with any missing it does nothing.
   It never throws: a failing email must never stop a comment from posting. */
export async function sendCommentAlert(
  c: { ficTitle: string; chapterN: number; name: string; body: string; url: string },
  deps: { fetchImpl?: typeof fetch; env?: Record<string, string | undefined> } = {},
): Promise<void> {
  const env = deps.env ?? process.env;
  const key = env.RESEND_API_KEY, from = env.RESEND_FROM, to = env.ALERT_EMAIL;
  if (!key || !from || !to) return;
  try {
    const res = await (deps.fetchImpl ?? fetch)("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from, to: [to],
        subject: `New comment on ${c.ficTitle}, chapter ${c.chapterN}`,
        html: `<p><strong>${esc(c.name)}</strong> commented on <em>${esc(c.ficTitle)}</em>, chapter ${c.chapterN}:</p>`
          + `<blockquote style="white-space:pre-wrap">${esc(c.body)}</blockquote><p><a href="${esc(c.url)}">Open the chapter</a></p>`,
      }),
    });
    if (!res.ok) console.error(`comment alert: Resend answered ${res.status}`);
  } catch {
    console.error("comment alert: could not reach Resend");
  }
}
