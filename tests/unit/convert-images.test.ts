import { expect, test } from "vitest";
import { extractDataUriImages, sniffImage } from "@/lib/convert/images";

const bytes = (...n: number[]) => new Uint8Array(n);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0);
const JPG = bytes(0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0);
const GIF = new TextEncoder().encode("GIF89a......");
const WEBP = new TextEncoder().encode("RIFF....WEBPVP8 ");
const AVIF = new TextEncoder().encode("....ftypavif....");

test("allowed images are recognized by their bytes", () => {
  expect(sniffImage(PNG)).toEqual({ type: "image/png", ext: "png" });
  expect(sniffImage(JPG)).toEqual({ type: "image/jpeg", ext: "jpg" });
  expect(sniffImage(GIF)).toEqual({ type: "image/gif", ext: "gif" });
  expect(sniffImage(WEBP)).toEqual({ type: "image/webp", ext: "webp" });
  expect(sniffImage(AVIF)).toEqual({ type: "image/avif", ext: "avif" });
});
test("an HTML file renamed .png is not an image", () => {
  expect(sniffImage(new TextEncoder().encode("<html><script>"))).toBeNull();
  expect(sniffImage(new Uint8Array())).toBeNull();
});
test("data-URI images are replaced by the uploaded address; fake ones are removed", async () => {
  const b64 = (u: Uint8Array) => Buffer.from(u).toString("base64");
  const html = `<p>a</p><img src="data:image/png;base64,${b64(PNG)}" alt="x"><img src="data:image/png;base64,${b64(new TextEncoder().encode("<script>"))}">`;
  const out = await extractDataUriImages(html, async (_b, ext) => `https://cdn.example/${ext}/1`);
  expect(out).toContain('src="https://cdn.example/png/1"');
  expect(out).not.toContain("data:");
  expect(out.match(/<img/g)?.length).toBe(1);
});
