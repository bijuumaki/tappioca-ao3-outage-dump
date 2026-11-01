/**
 * Fic Library API for Tappioca's fic reader.
 *
 * Runs inside your own Google account. It reads ONE Drive folder (the one whose ID you paste below)
 * and hands the fics to the website as JSON. It never writes, edits or deletes anything.
 *
 * Folder layout (folders become tags; the first folder is the fandom):
 *   Fic Library /
 *     Resident Evil /
 *       moribund.md
 *     Naruto /
 *       another-fic.md
 *
 * Each .md file can start with details between two lines of ---, for example:
 *   ---
 *   title: moribund
 *   rating: Mature
 *   relationships: Leon/Ashley
 *   summary: A short summary.
 *   ---
 *   # Chapter 1
 *   Story text...
 *
 * Anything you leave out is worked out for you (title from the file name, fandom from the folder,
 * word count from the text). .epub files are listed but not readable yet.
 *
 * Web app links:
 *   <web app link>                       -> the library list
 *   <web app link>?action=text&id=FILEID -> one fic's text
 */

// Paste your folder's ID here (the long code at the end of the folder's address in Drive).
var FOLDER_ID = 'PASTE_FOLDER_ID_HERE';

// The library list is remembered for this many seconds so the site stays fast.
var CACHE_SECONDS = 300;

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (FOLDER_ID.indexOf('PASTE') === 0) {
      return json_({ error: 'Set FOLDER_ID at the top of the script first.' });
    }
    if (p.action === 'text') return json_(getText_(p.id));
    return json_(getLibrary_());
  } catch (err) {
    return json_({ error: String((err && err.message) || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function getLibrary_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('library');
  if (cached) return JSON.parse(cached);

  var items = [];
  walk_(DriveApp.getFolderById(FOLDER_ID), [], items);
  var result = { updated: new Date().toISOString(), count: items.length, fics: items };

  var text = JSON.stringify(result);
  if (text.length < 90000) cache.put('library', text, CACHE_SECONDS); // the cache holds up to ~100 KB
  return result;
}

function walk_(folder, path, out) {
  var files = folder.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var name = file.getName();
    var lower = name.toLowerCase();
    var isText = /\.(md|markdown|txt)$/.test(lower);
    var isEpub = /\.epub$/.test(lower);
    if (!isText && !isEpub) continue;

    var base = name.replace(/\.[^.]+$/, '');
    var entry = {
      id: file.getId(),
      title: base,
      fandom: path.length ? path[0] : '',
      tags: path.slice(),
      rating: '',
      relationships: '',
      summary: '',
      words: null,
      updated: file.getLastUpdated().toISOString(),
      format: isEpub ? 'epub' : 'md',
      readable: isText
    };

    if (isText) {
      var parsed = parse_(file.getBlob().getDataAsString('UTF-8'));
      var m = parsed.meta;
      if (m.title) entry.title = m.title;
      if (m.fandom) entry.fandom = m.fandom;
      if (m.rating) entry.rating = m.rating;
      if (m.relationships) entry.relationships = m.relationships;
      if (m.summary) entry.summary = m.summary;
      if (m.tags) {
        m.tags.split(',').forEach(function (t) {
          t = t.trim();
          if (t && entry.tags.indexOf(t) === -1) entry.tags.push(t);
        });
      }
      entry.words = /^[\d,]+$/.test(m.words || '') ? parseInt(m.words.replace(/,/g, ''), 10) : countWords_(parsed.body);
    }
    out.push(entry);
  }

  var folders = folder.getFolders();
  while (folders.hasNext()) {
    var sub = folders.next();
    walk_(sub, path.concat(sub.getName()), out);
  }
}

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
