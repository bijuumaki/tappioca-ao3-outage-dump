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
 * .epub files are listed but not readable yet.
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
    var title = m ? m[1].trim() : f.base;
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
    } else {
      fic.chapters = []; // an .epub is listed but not readable yet
    }
    return fic;
  });
  return fics;
}

// ---------- one chapter's text ----------

function getText_(id) {
  if (!id) throw new Error('Missing id.');
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
