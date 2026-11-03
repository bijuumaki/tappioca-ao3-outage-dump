import { describe, expect, it } from "vitest";
import { validateComment } from "@/lib/comments/validate";

describe("validateComment", () => {
  it("accepts a name and a comment, trimmed", () => {
    expect(validateComment({ name: "  Sam ", body: " Loved it.  " })).toEqual({ ok: true, name: "Sam", body: "Loved it." });
  });
  it("uses the canvas messages for missing parts", () => {
    expect(validateComment({ name: "", body: "" })).toEqual({ ok: false, error: "Add your name and a comment to post." });
    expect(validateComment({ name: "  ", body: "  " })).toEqual({ ok: false, error: "Add your name and a comment to post." });
    expect(validateComment({ name: "", body: "Hi" })).toEqual({ ok: false, error: "Add your name to post." });
    expect(validateComment({ name: "Sam", body: "" })).toEqual({ ok: false, error: "Write a comment to post." });
  });
  it("limits the name to 60 characters and the comment to 5,000", () => {
    expect(validateComment({ name: "x".repeat(60), body: "Hi" }).ok).toBe(true);
    expect(validateComment({ name: "x".repeat(61), body: "Hi" })).toEqual({ ok: false, error: "Keep your name to 60 characters." });
    expect(validateComment({ name: "Sam", body: "x".repeat(5000) }).ok).toBe(true);
    expect(validateComment({ name: "Sam", body: "x".repeat(5001) })).toEqual({ ok: false, error: "Keep your comment under 5,000 characters." });
  });
  it("quietly skips anything that filled the hidden trap field", () => {
    expect(validateComment({ name: "Bot", body: "Buy now", website: "http://spam.example" })).toEqual({ ok: "skip" });
    expect(validateComment({ name: "Sam", body: "Hi", website: "" }).ok).toBe(true);
  });
});
