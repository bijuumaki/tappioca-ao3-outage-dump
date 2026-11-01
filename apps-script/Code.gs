/**
 * Fic Library API for Tappioca's fic reader.
 *
 * Runs inside your own Google account. It reads ONE Drive folder (the one whose ID you paste below)
 * and hands the fics to the website as JSON. It never writes, edits or deletes anything.
 *
 * Folder layout (folders become tags; the first folder is the fandom):
 *   Fic Library /
 *     Resident Evil /
 *       Moribund /
 *         MORIBUND - 1.md
 *         MORIBUND - 2.md
 *     Naruto /
 *       one-shot.md
 *
 * CHAPTERS: files named "<Title> - <number>" (space, dash, space, a number up to 3 digits) in the same folder
 * are chapters of ONE fic, in number order. Any other file name is a fic with a single chapter.
 *
 * Each .md file can start with details between two lines of ---, for example:
 *   ---
 *   title: moribund
 *   rating: Mature
 *   relationships: Leon/Ashley
 *   summary: A short summary.
 *   ---
 *   # Chapter title
 *   Story text...
 * Put the details in the FIRST chapter. Anything you leave out is worked out for you
 * (title from the file name, fandom from the folder, word count from the text).
 *
 * EPUB files work too. An .epub is one fic: its chapters are the book's own reading order, each chapter's title is
 * its first heading, and the book's own title and description (when it has them) become the fic's title and summary.
 * An epub has nowhere for the other details, so rating and relationships stay as placeholders on the site.
 * The Preface, title page and Afterword that an Archive of Our Own download adds are left out of the chapters.
 *
 * Web app links:
 *   <web app link>                       -> the library list (one entry per fic)
 *   <web app link>?action=fic&id=FICID   -> one fic with its list of chapters
 *   <web app link>?action=text&id=FILEID -> one chapter's text (FILEID comes from the chapter list)
 *
 * Speed: what the script learns about each file is remembered (and refreshed whenever you edit the
 * file), so a big library only reads files that are new or changed.
 */

// Paste your folder's ID here (the long code at the end of the folder's address in Drive).
var FOLDER_ID = 'PASTE_FOLDER_ID_HERE';

// The library list is remembered for this many seconds so the site stays fast.
var CACHE_SECONDS = 300;

// What the script learned about each file is remembered this long (6 hours is the most Google allows).
var FILE_CACHE_SECONDS = 21600;

var CHUNK = 30000; // characters per cache piece (each piece must stay under 100 KB)

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (FOLDER_ID.indexOf('PASTE') === 0) {
      return json_({ error: 'Set FOLDER_ID at the top of the script first.' });
    }
    if (p.action === 'text') return json_(getText_(p.id));
    if (p.action === 'fic') return json_(getFic_(p.id));
    return json_(getLibraryList_());
  } catch (err) {
    return json_({ error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ---------- the library ----------

function getLibraryList_() {
  var lib = getLibrary_();
  return {
    updated: lib.updated,
    count: lib.fics.length,
    fics: lib.fics.map(function (f) {
      var copy = {};
      for (var k in f) if (k !== 'chapters') copy[k] = f[k];
      copy.chapterCount = f.chapters.length;
      return copy;
    })
  };
}

function getFic_(id) {
  if (!id) throw new Error('Missing id.');
  var fics = getLibrary_().fics;
  for (var i = 0; i < fics.length; i++) if (fics[i].id === id) return fics[i];
  throw new Error('Not found.');
}

function getLibrary_() {
  var cache = CacheService.getScriptCache();
  var cached = getChunked_(cache, 'lib');
  if (cached) return JSON.parse(cached);

  var files = [];
  walk_(DriveApp.getFolderById(FOLDER_ID), [], files);
  fillInfo_(files, cache);

  var lib = { updated: new Date().toISOString(), fics: group_(files) };
  putChunked_(cache, 'lib', JSON.stringify(lib), CACHE_SECONDS);
  return lib;
}

// Lists the files in the folder tree without opening them.
function walk_(folder, path, out) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var lower = name.toLowerCase();
    var isText = /\.(md|markdown|txt)$/.test(lower);
    var isEpub = /\.epub$/.test(lower);
    if (!isText && !isEpub) continue;
    out.push({
      file: file,
      id: file.getId(),
      base: name.replace(/\.[^.]+$/, ''),
      path: path.slice(),
      updated: file.getLastUpdated(),
      isText: isText,
      format: isEpub ? 'epub' : 'md'
    });
  }
  var folders = folder.getFolders();
  while (folders.hasNext()) {
    var sub = folders.next();
    walk_(sub, path.concat(sub.getName()), out);
  }
}

// Works out the details of each text file, opening only the ones that are new or changed.
function fillInfo_(files, cache) {
  var texts = files.filter(function (f) { return f.isText; });
  var keys = texts.map(function (f) { return infoKey_(f); });
  var known = {};
  for (var i = 0; i < keys.length; i += 100) {
    var got = cache.getAll(keys.slice(i, i + 100));
    for (var k in got) known[k] = got[k];
  }
  var fresh = {};
  texts.forEach(function (f, i) {
    var raw = known[keys[i]];
    if (raw) {
      f.info = JSON.parse(raw);
    } else {
      var parsed = parse_(f.file.getBlob().getDataAsString('UTF-8'));
      var heading = parsed.body.match(/^#{1,6}[ \t]+(.+?)[ \t#]*$/m);
      f.info = { meta: parsed.meta, words: countWords_(parsed.body), heading: heading ? heading[1] : '' };
      fresh[keys[i]] = JSON.stringify(f.info);
    }
  });
  if (Object.keys(fresh).length) {
    try { cache.putAll(fresh, FILE_CACHE_SECONDS); } catch (err) { /* remembering is optional */ }
  }

  // An epub is opened once (when new or changed) to learn its chapters; the answer is remembered like the rest.
  files.filter(function (f) { return f.format === 'epub'; }).forEach(function (f) {
    var key = 'e2:' + f.id + ':' + f.updated.getTime();
    var raw = cache.get(key);
    if (raw) { f.info = JSON.parse(raw); return; }
    f.info = epubInfo_(f.file);
    try { cache.put(key, JSON.stringify(f.info), FILE_CACHE_SECONDS); } catch (err) { /* remembering is optional */ }
  });
}

function infoKey_(f) {
  return 'f1:' + f.id + ':' + f.updated.getTime();
}

// Turns files into fics: "<Title> - <n>" files in one folder become the chapters of one fic.
function group_(files) {
  var groups = [];
  var byKey = {};
  files.forEach(function (f) {
    var m = f.isText ? f.base.match(/^(.+?)\s+-\s+(\d{1,3})$/) : null;
    var title = niceTitle_(m ? m[1].trim() : f.base);
    f.n = m ? parseInt(m[2], 10) : 1;
    f.groupTitle = title;
    if (!m) {
      groups.push([f]);
      return;
    }
    var key = f.path.join('/') + '|' + title.toLowerCase();
    if (!byKey[key]) {
      byKey[key] = [];
      groups.push(byKey[key]);
    }
    byKey[key].push(f);
  });

  var fics = groups.map(function (g) {
    g.sort(function (a, b) { return a.n - b.n || (a.base < b.base ? -1 : a.base > b.base ? 1 : 0); });
    var first = g[0];
    var fic = {
      id: first.id,
      title: first.groupTitle,
      fandom: first.path.length ? first.path[0] : '',
      tags: first.path.slice(),
      rating: '',
      relationships: '',
      summary: '',
      words: null,
      updated: '',
      format: first.format,
      readable: first.isText,
      chapters: []
    };

    // Details come from the first chapter that gives them.
    var meta = {};
    g.forEach(function (f) {
      if (!f.info) return;
      for (var k in f.info.meta) if (!meta[k] && f.info.meta[k]) meta[k] = f.info.meta[k];
    });
    if (meta.title) fic.title = meta.title;
    if (meta.fandom) fic.fandom = meta.fandom;
    if (meta.rating) fic.rating = meta.rating;
    if (meta.relationships) fic.relationships = meta.relationships;
    if (meta.summary) fic.summary = meta.summary;
    if (meta.tags) {
      meta.tags.split(',').forEach(function (t) {
        t = t.trim();
        if (t && fic.tags.indexOf(t) === -1) fic.tags.push(t);
      });
    }

    var total = 0;
    var latest = 0;
    g.forEach(function (f, i) {
      var w = f.info ? f.info.words : null;
      if (w) total += w;
      if (f.updated.getTime() > latest) latest = f.updated.getTime();
      fic.chapters.push({
        n: i + 1,
        id: f.id,
        title: (f.info && f.info.heading) || (g.length > 1 ? 'Chapter ' + f.n : fic.title),
        words: w
      });
    });
    fic.updated = new Date(latest).toISOString();
    if (first.isText) {
      // A one-chapter fic can state its own word count in its details.
      fic.words = g.length === 1 && /^[\d,]+$/.test(meta.words || '') ? parseInt(meta.words.replace(/,/g, ''), 10) : total;
    } else if (first.info && first.info.chapters && first.info.chapters.length) {
      // An epub's chapters live inside the file, so a chapter's id is "<file id>~<number>".
      var cs = first.info.chapters;
      fic.chapters = cs.map(function (c, i) {
        return { n: i + 1, id: first.id + '~' + (i + 1), title: c.title || (cs.length > 1 ? 'Chapter ' + (i + 1) : fic.title), words: c.words };
      });
      fic.words = first.info.words;
      fic.readable = true;
    } else {
      fic.chapters = []; // an epub that could not be opened is listed but not readable
    }
    return fic;
  });
  return fics;
}

// ---------- one chapter's text ----------

function getText_(id) {
  if (!id) throw new Error('Missing id.');
  var tilde = String(id).indexOf('~');
  if (tilde > 0) return getEpubText_(id.slice(0, tilde), parseInt(id.slice(tilde + 1), 10));
  var file = DriveApp.getFileById(id);
  // Only files inside the library folder can ever be served, even if someone guesses another file's ID.
  if (!isInside_(file)) throw new Error('Not found.');
  var name = file.getName();
  if (!/\.(md|markdown|txt)$/i.test(name)) throw new Error('This file type cannot be read yet.');
  var parsed = parse_(file.getBlob().getDataAsString('UTF-8'));
  return {
    id: id,
    title: parsed.meta.title || name.replace(/\.[^.]+$/, ''),
    meta: parsed.meta,
    words: countWords_(parsed.body),
    text: parsed.body
  };
}

function isInside_(item) {
  var parents = item.getParents();
  while (parents.hasNext()) {
    var parent = parents.next();
    if (parent.getId() === FOLDER_ID || isInside_(parent)) return true;
  }
  return false;
}

// ---------- epub ----------

// An .epub is a zip of XHTML files. Utilities.unzip is built into Apps Script, so nothing needs installing.
function readEpub_(file) {
  var blobs = Utilities.unzip(file.getBlob().setContentType('application/zip'));
  var byName = {};
  var byBase = {};
  blobs.forEach(function (b) {
    var name = b.getName();
    byName[name] = b;
    byBase[name.slice(name.lastIndexOf('/') + 1).toLowerCase()] = b;
  });
  return epubStructure_(function (name) {
    var b = byName[name] || byBase[name.slice(name.lastIndexOf('/') + 1).toLowerCase()];
    return b ? b.getDataAsString('UTF-8') : null;
  });
}

// What the library list needs from an epub: the chapter list, without the text itself.
function epubInfo_(file) {
  try {
    var epub = readEpub_(file);
    var total = 0;
    var chapters = epub.chapters.map(function (c) {
      total += c.words;
      return { title: c.title, words: c.words };
    });
    return { meta: epub.meta, words: total, chapters: chapters };
  } catch (err) {
    return { meta: {}, words: null, chapters: [], failed: String((err && err.message) || err) };
  }
}

function getEpubText_(fileId, n) {
  var file = DriveApp.getFileById(fileId);
  // Only epubs inside the library folder can be served.
  if (!isInside_(file) || !/\.epub$/i.test(file.getName())) throw new Error('Not found.');
  var cache = CacheService.getScriptCache();
  var key = 'c2:' + fileId + ':' + n + ':' + file.getLastUpdated().getTime();
  var cached = getChunked_(cache, key);
  var chapter;
  if (cached) {
    chapter = JSON.parse(cached);
  } else {
    var c = readEpub_(file).chapters[n - 1];
    if (!c) throw new Error('Not found.');
    chapter = { title: c.title, words: c.words, text: c.md };
    putChunked_(cache, key, JSON.stringify(chapter), FILE_CACHE_SECONDS);
  }
  return { id: fileId + '~' + n, title: chapter.title, meta: {}, words: chapter.words, text: chapter.text };
}

// Pure function (no Google services), so it can be tested anywhere: read(name) returns a file's text, or null.
function epubStructure_(read) {
  var container = read('META-INF/container.xml') || '';
  var opfPath = (container.match(/full-path\s*=\s*["']([^"']+)["']/i) || [])[1];
  var opf = opfPath ? read(opfPath) : null;
  if (!opf) throw new Error('This epub has no content list.');
  var dir = opfPath.indexOf('/') === -1 ? '' : opfPath.slice(0, opfPath.lastIndexOf('/') + 1);

  var manifest = {};
  (opf.match(/<item\b[^>]*>/gi) || []).forEach(function (tag) {
    var id = attr_(tag, 'id');
    if (id) manifest[id] = { href: attr_(tag, 'href'), type: attr_(tag, 'media-type'), props: attr_(tag, 'properties') };
  });

  var chapters = [];
  (opf.match(/<itemref\b[^>]*>/gi) || []).forEach(function (tag) {
    var idref = attr_(tag, 'idref');
    var item = manifest[idref];
    if (!item || !item.href || attr_(tag, 'linear') === 'no') return;
    if (!/html/i.test(item.type || '') || /\bnav\b/.test(item.props || '')) return;
    var html = read(resolvePath_(dir, item.href));
    if (html == null) return;
    var conv = htmlToMarkdown_(html);
    var words = countWords_(conv.md);
    if (!words) return;
    // A short cover, title page or contents page is not a chapter.
    if (words < 40 && /cover|title|toc|nav|copyright|dedication/i.test(idref + ' ' + item.href)) return;
    chapters.push({ title: conv.heading, words: words, md: conv.md });
  });

  var meta = {};
  var title = xmlText_(opf, 'dc:title');
  var summary = xmlText_(opf, 'dc:description');
  if (title) meta.title = title;
  if (summary) meta.summary = summary;

  // The pages an Archive of Our Own download wraps around a story are not chapters.
  var story = chapters.filter(function (c) { return !isArchiveWrapper_(c, title); });
  return { meta: meta, chapters: story.length ? story : chapters };
}

// The "Preface" info page, the title page and the "Afterword" that an Archive of Our Own epub adds around the story.
// They are recognized by what they say (and are short), so a real chapter is never mistaken for one.
function isArchiveWrapper_(chapter, bookTitle) {
  if (chapter.words >= 600) return false;
  if (/Posted originally on the \[?Archive of Our Own/i.test(chapter.md)) return true;
  if (/drop by the Archive and comment/i.test(chapter.md)) return true;
  return chapter.words < 150 && !!bookTitle && chapter.title.toLowerCase() === bookTitle.toLowerCase() && /^by\s/m.test(chapter.md);
}

function attr_(tag, name) {
  var m = tag.match(new RegExp('\\s' + name + '\\s*=\\s*(?:"([^"]*)"|\'([^\']*)\')', 'i'));
  return m ? (m[1] != null ? m[1] : m[2]) : '';
}

function xmlText_(xml, tag) {
  var m = xml.match(new RegExp('<' + tag + '\\b[^>]*>([\\s\\S]*?)</' + tag + '>', 'i'));
  if (!m) return '';
  // Descriptions are often HTML stored as escaped text, so decode, drop the tags, and decode what was inside them.
  var text = decodeEntities_(m[1]).replace(/<[^>]*>/g, ' ');
  return decodeEntities_(text).replace(/\s+/g, ' ').trim();
}

// Joins an epub file's link to the folder of the content list ("../" and "%20" included).
function resolvePath_(dir, href) {
  var h = String(href).split('#')[0];
  try { h = decodeURIComponent(h); } catch (err) { /* keep it as written */ }
  var out = [];
  (dir + h).split('/').forEach(function (part) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  });
  return out.join('/');
}

function decodeEntities_(s) {
  var named = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '\u2013', mdash: '\u2014',
    hellip: '\u2026', lsquo: '\u2018', rsquo: '\u2019', ldquo: '\u201C', rdquo: '\u201D' };
  return String(s).replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, function (m, e) {
    if (e.charAt(0) === '#') {
      var n = e.charAt(1).toLowerCase() === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      try { return n ? String.fromCodePoint(n) : m; } catch (err) { return m; }
    }
    var v = named[e.toLowerCase()];
    return v == null ? m : v;
  });
}

// Chapter XHTML to the same Markdown the site already reads: headings, paragraphs, italics, bold, links,
// quotes, line breaks and scene breaks. Anything else (images, tables, styling) is dropped, keeping its text.
function htmlToMarkdown_(html) {
  var HARD = '\uE001', BQ_OPEN = '\uE002', BQ_CLOSE = '\uE003';
  var s = String(html).replace(/^\uFEFF/, '');
  var body = s.match(/<body\b[^>]*>([\s\S]*)<\/body>/i);
  if (body) s = body[1];
  s = s.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style|head|svg|nav)\b[\s\S]*?<\/\1>/gi, '');
  // Spaces just inside an emphasis tag would break the Markdown, so they move outside it.
  s = s.replace(/(<(?:em|i|strong|b|del|s|strike)\b[^>]*>)(\s+)/gi, '$2$1').replace(/(\s+)(<\/(?:em|i|strong|b|del|s|strike)>)/gi, '$2$1');

  var out = '';
  var spans = [];
  var links = [];
  var blocks = /^(p|div|section|article|aside|header|footer|figure|figcaption|tr|ul|ol|dl|dt|dd|table|pre|address|main)$/;
  s.split(/(<[^>]*>)/).forEach(function (part) {
    if (part.charAt(0) !== '<') {
      var text = decodeEntities_(part).replace(/[\s\u00A0]+/g, ' ').replace(/([\\*_`~\[\]])/g, '\\$1');
      if (/(^|\n)\s*$/.test(out)) text = text.replace(/^\s*([#>])/, '\\$1');
      out += text;
      return;
    }
    var m = part.match(/^<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:]*)/);
    if (!m) return;
    var closing = m[1] === '/';
    var name = m[2].toLowerCase();
    if (name === 'br') out += HARD;
    else if (name === 'hr') out += '\n\n---\n\n';
    else if (/^h[1-6]$/.test(name)) out += closing ? '\n\n' : '\n\n' + new Array(parseInt(name.charAt(1), 10) + 1).join('#') + ' ';
    else if (name === 'blockquote') out += closing ? BQ_CLOSE + '\n\n' : '\n\n' + BQ_OPEN;
    else if (name === 'li') out += closing ? '\n\n' : '\n\n- ';
    else if (blocks.test(name)) out += '\n\n';
    else if (name === 'strong' || name === 'b') out += '**';
    else if (name === 'em' || name === 'i') out += '*';
    else if (name === 'del' || name === 's' || name === 'strike') out += '~~';
    else if (name === 'span') {
      if (closing) { out += spans.pop() || ''; return; }
      var style = attr_(part, 'style');
      var mark = /italic/i.test(style) ? '*' : (/bold|font-weight:\s*[6-9]00/i.test(style) ? '**' : '');
      spans.push(mark);
      out += mark;
    } else if (name === 'a') {
      if (closing) {
        var href = links.pop();
        if (href) out += '](' + href.replace(/\(/g, '%28').replace(/\)/g, '%29') + ')';
        return;
      }
      var target = attr_(part, 'href');
      var ok = /^(https?:|mailto:)/i.test(target);
      links.push(ok ? target : '');
      if (ok) out += '[';
    }
  });

  // Quotes: innermost first, every line gets "> ".
  var quote = new RegExp(BQ_OPEN + '([^' + BQ_OPEN + ']*?)' + BQ_CLOSE);
  while (quote.test(out)) {
    out = out.replace(quote, function (m, inner) {
      var lines = inner.split('\n').map(function (l) { return l.trim(); }).join('\n').replace(/\n{3,}/g, '\n\n').trim();
      return '\n\n' + lines.split('\n').map(function (l) { return l ? '> ' + l : '>'; }).join('\n') + '\n\n';
    });
  }

  var md = out.split('\n').map(function (line) {
    line = line.replace(new RegExp('^[\\s' + HARD + ']+|[\\s' + HARD + ']+$', 'g'), '').replace(new RegExp(' *' + HARD + ' *', 'g'), '  \n');
    var plain = line.replace(/\\(.)/g, '$1').trim();
    // A line of only stars, dashes or similar marks is a scene break.
    if (/^[*_~=\u2013\u2014\u2022\u00b7\-\s]+$/.test(plain) && plain.replace(/\s/g, '').length >= 3) return '---';
    return line;
  }).join('\n').replace(/\n{3,}/g, '\n\n').trim();

  var h = md.match(/^#{1,6}[ \t]+(.+?)[ \t#]*$/m);
  var heading = h ? h[1].replace(/\\(.)/g, '$1').replace(/[*_~`]/g, '').trim() : '';
  return { md: md, heading: heading };
}

// "Anam_Cara" (a file name with underscores and no spaces) reads better as "Anam Cara".
function niceTitle_(name) {
  return name.indexOf(' ') === -1 && name.indexOf('_') !== -1 ? name.replace(/_/g, ' ') : name;
}

// ---------- helpers ----------

// Splits "---" details from the story text. Details are simple "key: value" lines.
function parse_(raw) {
  var text = String(raw).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  var meta = {};
  var body = text;
  var m = text.match(/^---\n([\s\S]*?)\n---[ \t]*(\n|$)/);
  if (m) {
    m[1].split('\n').forEach(function (line) {
      var i = line.indexOf(':');
      if (i < 1) return;
      var key = line.slice(0, i).trim().toLowerCase();
      var val = line.slice(i + 1).trim().replace(/^["']|["']$/g, '');
      if (key) meta[key] = val;
    });
    body = text.slice(m[0].length);
  }
  return { meta: meta, body: body.replace(/^\n+/, '') };
}

function countWords_(body) {
  var words = String(body).replace(/[#*_>`~-]+/g, ' ').match(/\S+/g);
  return words ? words.length : 0;
}

// The cache holds about 100 KB per item, so a long library list is stored in pieces.
function putChunked_(cache, key, text, seconds) {
  var pieces = Math.ceil(text.length / CHUNK);
  var items = {};
  for (var i = 0; i < pieces; i++) items[key + ':' + i] = text.slice(i * CHUNK, (i + 1) * CHUNK);
  items[key + ':n'] = String(pieces);
  try { cache.putAll(items, seconds); } catch (err) { /* remembering is optional */ }
}

function getChunked_(cache, key) {
  var n = parseInt(cache.get(key + ':n') || '0', 10);
  if (!n) return null;
  var keys = [];
  for (var i = 0; i < n; i++) keys.push(key + ':' + i);
  var got = cache.getAll(keys);
  var out = '';
  for (var j = 0; j < n; j++) {
    var piece = got[key + ':' + j];
    if (piece == null) return null; // a piece expired: rebuild
    out += piece;
  }
  return out;
}
