import { sanitizeRichText } from "./allowlist";
import { adaptColor, parseColor } from "./colors";

/* Theme colors the reader adapts against. Kept in step with app/tokens.css. */
export const THEME = {
  light: { bg: "#f5f5f5", ink: "#111111" },
  dark: { bg: "#222831", ink: "#ecefee" },
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
    else if (prop === "color" && parseColor(value)) {
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
