/* A stored image path becomes a URL: absolute paths and full URLs are used as they are,
   anything else is a file in the Supabase "media" storage bucket (set up in Plan 2). */
export function mediaUrl(path: string): string {
  if (path.startsWith("/") || /^https?:\/\//.test(path)) return path;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/media/${path.split("/").map(encodeURIComponent).join("/")}`;
}
