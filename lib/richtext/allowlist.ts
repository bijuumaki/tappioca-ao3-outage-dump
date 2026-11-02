import sanitizeHtml from "sanitize-html";

/* The one place the rich-text format set lives. Editor, paste and uploads (Plan 2) and the reader all use it. */
const COLOR_VALUE = /^[#a-zA-Z0-9\s(),.%]+$/;

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "blockquote", "ul", "ol", "li", "a", "hr", "img", "figure", "figcaption", "span"],
  allowedAttributes: {
    a: ["href"],
    img: ["src", "alt"],
    "*": ["style"],
  },
  allowedStyles: {
    "*": {
      color: [COLOR_VALUE],
      "background-color": [COLOR_VALUE],
      "text-align": [/^(left|center|right|justify)$/],
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    h1: "h2",
    b: "strong",
    i: "em",
    del: "s",
    strike: "s",
  },
};

export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
