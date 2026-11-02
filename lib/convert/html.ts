import { isTag, isText, type ChildNode, type Element } from "domhandler";
import { parseDocument } from "htmlparser2";
import { sanitizeRichText } from "@/lib/richtext/allowlist";

/* Cleans HTML from Ellipsus ("Copy as HTML"), Google Docs, Word and web pages into the site's allowed format.
   Bold, italic, underline and strikethrough written as inline styles become real tags; colors, highlights and
   alignment are kept; everything else (fonts, sizes, classes, scripts) is dropped. The result is sanitized last. */

const DROP = new Set(["script", "style", "head", "title", "meta", "link", "noscript", "iframe", "object", "embed", "form", "input", "button", "select", "textarea", "svg", "canvas", "template"]);
const SAME = new Set(["p", "blockquote", "ul", "ol", "li", "figure", "figcaption"]);
const HEADING: Record<string, string> = { h1: "h2", h2: "h2", h3: "h3", h4: "h4", h5: "h4", h6: "h4" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;");

type Style = { bold: boolean; italic: boolean; underline: boolean; strike: boolean; color?: string; background?: string; align?: string };

function readStyle(el: Element): Style {
  const out: Style = { bold: false, italic: false, underline: false, strike: false };
  for (const decl of (el.attribs.style ?? "").split(";")) {
    const i = decl.indexOf(":");
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim().toLowerCase();
    const value = decl.slice(i + 1).trim().toLowerCase();
    if (prop === "font-weight") out.bold = value === "bold" || value === "bolder" || Number(value) >= 600;
    else if (prop === "font-style") out.italic = value === "italic" || value === "oblique";
    else if (prop === "text-decoration" || prop === "text-decoration-line") { out.underline = value.includes("underline"); out.strike = value.includes("line-through"); }
    else if (prop === "color") out.color = value;
    else if (prop === "background-color" || prop === "background") out.background = value;
    else if (prop === "text-align" && /^(left|center|right|justify)$/.test(value)) out.align = value;
  }
  return out;
}

const hasColor = (s: Style) => !!(s.color || s.background);

function colorSpan(s: Style, inner: string): string {
  if (!hasColor(s) || !inner) return inner;
  const parts = [s.color && `color:${s.color}`, s.background && `background-color:${s.background}`].filter(Boolean).join(";");
  return `<span style="${escAttr(parts)}">${inner}</span>`;
}

function wrapInline(s: Style, inner: string, tag: string): string {
  if (!inner) return inner;
  let out = colorSpan(s, inner);
  if (s.strike) out = `<s>${out}</s>`;
  if (s.underline && tag !== "u") out = `<u>${out}</u>`;
  if (s.italic && tag !== "em" && tag !== "i") out = `<em>${out}</em>`;
  if (s.bold && tag !== "strong" && tag !== "b") out = `<strong>${out}</strong>`;
  return out;
}

function blockStyleAttr(s: Style): string {
  const parts = [s.align && `text-align:${s.align}`].filter(Boolean).join(";");
  return parts ? ` style="${parts}"` : "";
}

function renderChildren(nodes: ChildNode[]): string {
  return nodes.map(render).join("");
}

function render(node: ChildNode): string {
  if (isText(node)) return esc(node.data);
  if (!isTag(node)) return "";
  const name = node.name.toLowerCase();
  if (DROP.has(name)) return "";
  const style = readStyle(node);
  const inner = renderChildren(node.children);

  if (name === "br") return "<br />";
  if (name === "hr") return "<hr />";
  if (name === "img") {
    const src = node.attribs.src ?? "";
    return src ? `<img src="${escAttr(src)}" alt="${escAttr(node.attribs.alt ?? "")}" />` : "";
  }
  if (name === "a") {
    const href = node.attribs.href ?? "";
    return href ? `<a href="${escAttr(href)}">${wrapInline(style, inner, "a")}</a>` : wrapInline(style, inner, "span");
  }
  if (name === "b" || name === "strong") {
    /* Google Docs wraps the whole paste in <b style="font-weight:normal">: that means "not bold". */
    const normal = /font-weight\s*:\s*(normal|400)/i.test(node.attribs.style ?? "");
    return normal ? wrapInline(style, inner, "span") : `<strong>${wrapInline({ ...style, bold: false }, inner, "strong")}</strong>`;
  }
  if (name === "i" || name === "em") return `<em>${wrapInline({ ...style, italic: false }, inner, "em")}</em>`;
  if (name === "u" || name === "ins") return `<u>${wrapInline({ ...style, underline: false }, inner, "u")}</u>`;
  if (name === "s" || name === "strike" || name === "del") return `<s>${wrapInline({ ...style, strike: false }, inner, "s")}</s>`;
  if (name in HEADING) {
    const tag = HEADING[name];
    return `<${tag}${blockStyleAttr(style)}>${wrapInline({ ...style, align: undefined }, inner, tag)}</${tag}>`;
  }
  if (SAME.has(name)) {
    if (name === "ul" || name === "ol") return `<${name}>${inner}</${name}>`;
    return `<${name}${blockStyleAttr(style)}>${wrapInline({ ...style, align: undefined }, inner, name)}</${name}>`;
  }
  /* Everything else (div, span, font, table cells…) is unwrapped: its text stays, its styling is read. */
  return wrapInline(style, inner, name);
}

export function htmlToChapter(html: string): string {
  if (!html.trim()) return "";
  const doc = parseDocument(html, { decodeEntities: true });
  return sanitizeRichText(renderChildren(doc.children)).trim();
}
