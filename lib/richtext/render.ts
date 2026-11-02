import { sanitizeRichText } from "./allowlist";
import { adaptColor, contrastRatio, isPlainInk, parseColor } from "./colors";

/* Page and card backgrounds and text colors of the light themes (Day, Lagoon) and dark themes (Night, Midnight).
   Kept in step with app/tokens.css. A color is adapted against the hardest one in its group. */
const LIGHT_BACKGROUNDS = ["#EDF6F9", "#F6F1E7", "#FBF8F2"];
const DARK_BACKGROUNDS = ["#14262D", "#1B3540", "#06141B", "#11212D"];
const LIGHT_INKS = ["#204B57", "#0A1517"];
const DARK_INKS = ["#EDF6F9", "#CCD0CF"];

/* Brightness order via contrast against black: higher means lighter. */
const lightness = (c: string) => contrastRatio(c, "#000000");
const darkest = (list: string[]) => [...list].sort((a, b) => lightness(a) - lightness(b))[0];
const lightest = (list: string[]) => [...list].sort((a, b) => lightness(b) - lightness(a))[0];

/* Text colors are hardest to read on the darkest light background and the lightest dark one;
   highlights are hardest under the lightest dark-ink (light themes) and darkest light-ink (dark themes). */
export const THEME = {
  light: { bg: darkest(LIGHT_BACKGROUNDS), ink: lightest(LIGHT_INKS) },
  dark: { bg: lightest(DARK_BACKGROUNDS), ink: darkest(DARK_INKS) },
};

function decode(s: string): string {
  return s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, "&");
}

/* Rewrites one sanitized style attribute: colors become per-theme variables plus a class, alignment stays. */
function rewriteStyle(style: string): { style: string; classes: string[] } {
  const out: string[] = [];
  const classes: string[] = [];
  for (const decl of decode(style).split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim();
    if (prop === "text-align") out.push(`text-align:${value}`);
    else if (prop === "color" && parseColor(value) && !isPlainInk(value)) {
      out.push(`--c-l:${adaptColor(value, THEME.light.bg)}`, `--c-d:${adaptColor(value, THEME.dark.bg)}`);
      classes.push("rt-c");
    } else if (prop === "background-color" && parseColor(value)) {
      out.push(`--hl-l:${adaptColor(value, THEME.light.ink)}`, `--hl-d:${adaptColor(value, THEME.dark.ink)}`);
      classes.push("rt-hl");
    }
  }
  return { style: out.join(";"), classes };
}

export function renderRichText(html: string): string {
  return sanitizeRichText(html).replace(/<([a-z0-9]+)([^>]*?)\sstyle="([^"]*)"([^>]*)>/g, (_m, tag: string, before: string, style: string, after: string) => {
    const { style: next, classes } = rewriteStyle(style);
    const cls = classes.length ? ` class="${classes.join(" ")}"` : "";
    const st = next ? ` style="${next}"` : "";
    return `<${tag}${before}${cls}${st}${after}>`;
  });
}
