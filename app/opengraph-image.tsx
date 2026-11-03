import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Tappioca’s Fic Archive: tappioca’s ao3 outage stowage bin";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "tappioca’s fic archive";
const SUB = "tappioca’s ao3 outage stowage bin";

/* IM Fell English from Google Fonts, only the letters used here. Falls back to the default font if it can't be fetched. */
async function loadFont(text: string): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=IM+Fell+English&text=${encodeURIComponent(text)}`)).text();
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
    return url ? await (await fetch(url)).arrayBuffer() : null;
  } catch {
    return null;
  }
}

/* Night theme colors (see app/tokens.css): the link preview is the one place these can't be read from CSS.
   Bijuu's drawing fills the top, cropped to show both faces (app/preview-art.jpg); the name sits in its own box below. */
const TEXT_BOX = 100;

export default async function OpengraphImage() {
  const [font, art] = await Promise.all([loadFont(TITLE + SUB), readFile(join(process.cwd(), "app/preview-art.jpg"))]);
  const src = `data:image/jpeg;base64,${art.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: "#14262D", fontFamily: font ? "IM Fell English" : "serif" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" width={size.width} height={size.height - TEXT_BOX} style={{ width: size.width, height: size.height - TEXT_BOX, objectFit: "cover" }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: TEXT_BOX, padding: "0 44px", background: "#1B3540", borderTop: "4px solid #D8B4D1" }}>
          <div style={{ display: "flex", fontSize: 46, lineHeight: 1.1, color: "#D8B4D1" }}>{TITLE}</div>
          <div style={{ display: "flex", fontSize: 26, lineHeight: 1.2, color: "#83C5BE" }}>{SUB}</div>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "IM Fell English", data: font, style: "normal", weight: 400 }] : undefined },
  );
}
