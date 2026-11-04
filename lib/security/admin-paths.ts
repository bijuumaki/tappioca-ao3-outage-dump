/* Which addresses need an admin session. Kept apart from proxy.ts so a test can check it without a browser or the database. */
export const LOGIN_PATH = "/admin-login";

/* Only /admin and /admin/... are protected. "/admin-login" merely starts with the same letters, so a plain startsWith("/admin") would lock the sign-in page behind itself and loop forever. */
export function isProtectedAdminPath(path: string): boolean {
  return path === "/admin" || path.startsWith("/admin/");
}
