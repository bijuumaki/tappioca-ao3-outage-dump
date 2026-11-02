export const MAX_WIDTH = 2400;
const HEAVY_BYTES = 1_500_000;
/* A server request can carry about 4.5 MB on Vercel; stay clear of that. */
export const MAX_UPLOAD_BYTES = 4_000_000;

/* What size a picture should be re-saved at: null leaves it alone. Over 2400 px wide is scaled down; a heavy file
   within that width is re-saved at the same size (smaller file). */
export function targetSize(width: number, height: number, bytes: number): { width: number; height: number } | null {
  if (width > MAX_WIDTH) return { width: MAX_WIDTH, height: Math.round((height * MAX_WIDTH) / width) };
  if (bytes > HEAVY_BYTES) return { width, height };
  return null;
}

/* Shrinks a big photo in the browser before it is sent. Animated GIFs are left alone (shrinking would stop them moving). */
export async function shrinkImage(file: File): Promise<File> {
  if (file.type === "image/gif" || typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap;
  try { bitmap = await createImageBitmap(file); } catch { return file; }
  const target = targetSize(bitmap.width, bitmap.height, file.size);
  if (!target) { bitmap.close(); return file; }
  const canvas = document.createElement("canvas");
  canvas.width = target.width; canvas.height = target.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, target.width, target.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  const out = blob && blob.type === "image/webp" ? blob : await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
  if (!out || out.size >= file.size) return file;
  const ext = out.type === "image/webp" ? "webp" : "jpg";
  return new File([out], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: out.type });
}
