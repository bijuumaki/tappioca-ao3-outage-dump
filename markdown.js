/* A small Markdown reader for fics. No dependencies.
   renderMarkdown(text, container) adds the story to the container as real elements (never as an HTML string),
   so nothing in a file can run as a script or change the page.

   Supported: paragraphs, *italics*, _italics_, **bold**, ***bold italics***, ~~strike~~, `code`,
   [links](https://...), # headings, > quotes, line breaks (two spaces or a backslash at the end of a line),
   backslash escapes (\* \_ ...) and scene breaks. A scene break is a line of ---, ***, ___ or * * *,
   or a line made only of dashes, stars and decorative symbols (like the ornament lines Ellipsus exports). */
(function (global) {
  var PUNCT = "\\`*_{}[]()#+-.!~<>|\"'&:;,=/?@$%^";
  var HARD = "\uE000"; /* stands in for a hard line break while a paragraph is parsed */
  var ALNUM = /[\p{L}\p{N}]/u;
  var HAS_WORD = ALNUM;
  var ORNAMENT_LETTERS = /[\u{13000}-\u{1345F}]/gu; /* Egyptian hieroglyphs, used as ornaments */
  var SAFE_LINK = /^(https?:|mailto:|#|\/|\.\/|\.\.\/)/i;
  var BREAK_MARKS = /^[-\u2013\u2014*_~=\u2022\u00b7+]+$/;

  function make(tag, parent) {
    var el = document.createElement(tag);
    if (parent) parent.appendChild(el);
    return el;
  }

  function isSceneBreak(line) {
    var s = line.replace(/\s+/g, "");
    if (/^([-*_])\1{2,}$/.test(s)) return true; /* --- *** ___ and the spaced forms */
    var plain = s.replace(/[*_]/g, ""); /* ornaments are often wrapped in ** or __ */
    if (plain.length < 2 || plain.length > 40) return false;
    /* Hieroglyphs count as letters in Unicode, but in a line like "﹏𓆝﹏𓊝﹏" they are decoration */
    if (HAS_WORD.test(plain.replace(ORNAMENT_LETTERS, ""))) return false;
    if (BREAK_MARKS.test(plain)) return true; /* spaced marks like "– –" or "• • •" */
    /* Any symbol that is not everyday punctuation, so "...", "?!" and a lone "—" stay story text */
    return /[^.,!?'"\u2018\u2019\u201c\u201d\u2026:;()\[\]\u2013\u2014-]/.test(plain);
  }

  /* ---------- inline: emphasis, links, code, escapes ---------- */

  function runLength(s, i) {
    var c = s.charAt(i), n = 0;
    while (s.charAt(i + n) === c) n += 1;
    return n;
  }

  /* Finds the marker that closes an emphasis opened at "from", or -1 */
  function findClose(s, from, marker) {
    var c = marker.charAt(0);
    for (var j = from; j < s.length; j += 1) {
      var ch = s.charAt(j);
      if (ch === "\\") { j += 1; continue; }
      if (ch === "`") {
        var end = s.indexOf("`", j + 1);
        if (end !== -1) j = end;
        continue;
      }
      if (ch !== c) continue;
      var run = runLength(s, j);
      if (run === marker.length && j > from && !/\s/.test(s.charAt(j - 1))) {
        if (c !== "_" || !ALNUM.test(s.charAt(j + run) || " ")) return j;
      }
      j += run - 1; /* a run of a different size is something nested: step over it whole */
    }
    return -1;
  }

  function inline(s, parent) {
    var buf = "";
    function flush() {
      if (buf) { parent.appendChild(document.createTextNode(buf)); buf = ""; }
    }
    var i = 0;
    while (i < s.length) {
      var c = s.charAt(i);
      if (c === HARD) { flush(); make("br", parent); i += 1; continue; }
      if (c === "\\" && i + 1 < s.length && PUNCT.indexOf(s.charAt(i + 1)) !== -1) {
        buf += s.charAt(i + 1);
        i += 2;
        continue;
      }
      if (c === "`") {
        var endTick = s.indexOf("`", i + 1);
        if (endTick > i + 1) {
          flush();
          make("code", parent).textContent = s.slice(i + 1, endTick);
          i = endTick + 1;
          continue;
        }
      }
      if (c === "[") {
        var mid = s.indexOf("](", i + 1);
        var close = mid === -1 ? -1 : s.indexOf(")", mid + 2);
        if (mid > i + 1 && close !== -1) {
          var href = s.slice(mid + 2, close).trim().replace(/\s+["'].*$/, "").replace(/^<|>$/g, "");
          if (SAFE_LINK.test(href)) {
            flush();
            var a = make("a", parent);
            a.setAttribute("href", href);
            if (/^https?:/i.test(href)) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener noreferrer"); }
            inline(s.slice(i + 1, mid), a);
            i = close + 1;
            continue;
          }
        }
      }
      if (c === "*" || c === "_" || c === "~") {
        var run = Math.min(runLength(s, i), c === "~" ? 2 : 3);
        var wrongRun = c === "~" && run < 2;
        var opens = !wrongRun && i + run < s.length && !/\s/.test(s.charAt(i + run));
        if (opens && c === "_" && i > 0 && ALNUM.test(s.charAt(i - 1))) opens = false; /* snake_case is not italics */
        if (opens) {
          var marker = new Array(run + 1).join(c);
          var end = findClose(s, i + run, marker);
          if (end !== -1) {
            flush();
            var inner = s.slice(i + run, end);
            var el;
            if (c === "~") el = make("del", parent);
            else if (run === 3) el = make("em", make("strong", parent));
            else el = make(run === 2 ? "strong" : "em", parent);
            inline(inner, el);
            i = end + run;
            continue;
          }
        }
        buf += new Array(Math.max(run, 1) + 1).join(c);
        i += Math.max(run, 1);
        continue;
      }
      buf += c;
      i += 1;
    }
    flush();
  }

  /* ---------- blocks: paragraphs, headings, quotes, scene breaks ---------- */

  function blocks(text, container) {
    var lines = text.replace(/\r\n?/g, "\n").split("\n");
    var para = [];

    function flushPara() {
      if (!para.length) return;
      var joined = para.map(function (l) { return l.replace(/^[ \t]+/, ""); }).join("\n");
      joined = joined.replace(/(?: {2,}|\\)\n/g, HARD).replace(/[ \t]*\n/g, " ").replace(/[ \t]+$/, "");
      para = [];
      if (!joined) return;
      inline(joined, make("p", container));
    }

    var i = 0;
    while (i < lines.length) {
      var line = lines[i];
      if (!line.trim()) { flushPara(); i += 1; continue; }

      var heading = line.match(/^ {0,3}(#{1,6})[ \t]+(.+?)[ \t#]*$/);
      if (heading) {
        flushPara();
        /* The page's own title is the h1, so a story's # becomes h2, ## becomes h3, and so on */
        inline(heading[2], make("h" + Math.min(heading[1].length + 1, 6), container));
        i += 1;
        continue;
      }
      if (isSceneBreak(line)) {
        flushPara();
        var hr = make("div", container);
        hr.className = "scene-break";
        hr.setAttribute("role", "separator");
        i += 1;
        continue;
      }
      if (/^ {0,3}>/.test(line)) {
        flushPara();
        var quoted = [];
        while (i < lines.length && /^ {0,3}>/.test(lines[i])) {
          quoted.push(lines[i].replace(/^ {0,3}> ?/, ""));
          i += 1;
        }
        blocks(quoted.join("\n"), make("blockquote", container));
        continue;
      }
      para.push(line);
      i += 1;
    }
    flushPara();
  }

  global.renderMarkdown = function (text, container) {
    blocks(String(text == null ? "" : text), container);
  };
})(window);
