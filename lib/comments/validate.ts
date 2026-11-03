/* The rules for a reader's comment. Wording is the canvas's. `website` is a hidden field real people never fill in. */
export type CommentCheck = { ok: true; name: string; body: string } | { ok: false; error: string } | { ok: "skip" };

export function validateComment(input: { name: string; body: string; website?: string }): CommentCheck {
  if ((input.website ?? "").trim() !== "") return { ok: "skip" };
  const name = input.name.trim();
  const body = input.body.trim();
  if (!name && !body) return { ok: false, error: "Add your name and a comment to post." };
  if (!name) return { ok: false, error: "Add your name to post." };
  if (!body) return { ok: false, error: "Write a comment to post." };
  if (name.length > 60) return { ok: false, error: "Keep your name to 60 characters." };
  if (body.length > 5000) return { ok: false, error: "Keep your comment under 5,000 characters." };
  return { ok: true, name, body };
}
