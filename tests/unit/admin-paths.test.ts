import { describe, expect, it } from "vitest";
import { LOGIN_PATH, isProtectedAdminPath } from "@/lib/security/admin-paths";

describe("admin paths", () => {
  it("never protects the sign-in page, or signed-out visitors loop forever (ERR_TOO_MANY_REDIRECTS)", () => {
    expect(isProtectedAdminPath(LOGIN_PATH)).toBe(false);
  });
  it("protects /admin and everything under it", () => {
    for (const p of ["/admin", "/admin/", "/admin/stories/abc", "/admin/comments", "/admin/login"]) expect(isProtectedAdminPath(p)).toBe(true);
  });
  it("leaves public pages and look-alike names alone", () => {
    for (const p of ["/", "/fics/x/1", "/administrator", "/admin-login/"]) expect(isProtectedAdminPath(p)).toBe(false);
  });
});
