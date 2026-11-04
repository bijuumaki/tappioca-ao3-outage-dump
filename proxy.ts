import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { logFeedHit } from "@/lib/feed/log";
import { isBlockedBot } from "@/lib/security/bots";
import { LOGIN_PATH, isProtectedAdminPath } from "@/lib/security/admin-paths";

/* Turns away named AI and scraping crawlers on every page, then keeps the admin session fresh and sends signed-out visitors to the sign-in page. */
export async function proxy(request: NextRequest, event: NextFetchEvent) {
  if (isBlockedBot(request.headers.get("user-agent"), request.nextUrl.pathname)) return new NextResponse("Automated access to this site is not allowed.", { status: 403, headers: { "content-type": "text/plain" } });
  /* Count feed readers (before the cache, so every check is seen). */
  const path0 = request.nextUrl.pathname;
  if (request.method === "GET" && (path0 === "/feed.xml" || path0.startsWith("/feed/"))) {
    event.waitUntil(logFeedHit(path0, request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "", request.headers.get("user-agent")));
  }
  if (!isProtectedAdminPath(request.nextUrl.pathname)) return NextResponse.next();
  let response = NextResponse.next({ request });
  const db = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: (list) => {
        list.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        list.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  const { data: { user } } = await db.auth.getUser();
  const path = request.nextUrl.pathname;
  /* The sign-in page lives at /admin-login; an old /admin/login bookmark is sent there. */
  if (path === "/admin/login") {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    return NextResponse.redirect(url);
  }
  const onLogin = path === "/admin/set-password";
  /* Server actions (autosave) answer "signed out" themselves, so the editor can keep the text on screen. */
  const isAction = request.headers.has("next-action");
  if (!user && !onLogin && !isAction) {
    const url = request.nextUrl.clone();
    url.pathname = LOGIN_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }
  return response;
}

export const config = { matcher: ["/((?!_next/static|_next/image|robots.txt|favicon.ico|icon.svg|textures/).*)"] };
