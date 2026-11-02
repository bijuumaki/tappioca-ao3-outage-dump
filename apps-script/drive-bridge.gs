/**
 * Tappioca's Fic Archive: Google Drive bridge.
 *
 * Paste this whole file into a Google Apps Script project in the Google account that owns the "Fic Library"
 * folder, then deploy it as a web app (see docs/google-drive-setup.md).
 *
 * What it does: lets the website list, read and add files in ONE folder (the "Fic Library" folder).
 * What it never does: delete, move, rename, overwrite or share anything, or touch anything outside that folder.
 *
 * Two settings (Project Settings > Script properties):
 *   FOLDER_ID  the long id at the end of the Fic Library folder's address
 *   TOKEN      a long secret password you make up (at least 16 characters); the website sends it with every request
 *
 * Every request is a POST with a JSON body: { "token": "...", "action": "ping" | "list" | "get" | "put", ... }
 */

var MAX_BYTES = 25 * 1024 * 1024;
var MAX_BASE64_CHARS = Math.ceil(MAX_BYTES / 3) * 4 + 8;
var MAX_LIST = 500;
var MAX_DEPTH = 3;
var ALLOWED = { html: 'text/html', htm: 'text/html', md: 'text/markdown', markdown: 'text/markdown', txt: 'text/plain',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', epub: 'application/epub+zip' };

function doPost(e) {
  try {
    var req = parse_(e);
    if (!req) return out_({ ok: false, error: 'bad_request' });
    if (!tokenOk_(req.token)) return out_({ ok: false, error: 'unauthorized' });
    var root = DriveApp.getFolderById(PropertiesService.getScriptProperties().getProperty('FOLDER_ID'));
    switch (req.action) {
      case 'ping': return out_({ ok: true, folder: root.getName() });
      case 'list': return out_({ ok: true, files: list_(root) });
      case 'get': return out_(get_(root, req));
      case 'put': return out_(put_(root, req));
      default: return out_({ ok: false, error: 'bad_request' });
    }
  } catch (err) {
    return out_({ ok: false, error: 'server_error' });
  }
}

function parse_(e) {
  try {
    var body = JSON.parse(e && e.postData && e.postData.contents);
    return body && typeof body === 'object' ? body : null;
  } catch (err) {
    return null;
  }
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* The secret must be set, at least 16 characters, and match exactly. Compared in one pass so timing tells nothing. */
function tokenOk_(given) {
  var real = PropertiesService.getScriptProperties().getProperty('TOKEN');
  if (!real || real.length < 16 || typeof given !== 'string') return false;
  var diff = real.length === given.length ? 0 : 1;
  for (var i = 0; i < real.length; i++) diff |= real.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  return diff === 0;
}

function ext_(name) {
  var m = /\.([A-Za-z0-9]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}

/* Is this file or folder the library folder itself, or somewhere inside it? (Checked through every parent.) */
function inside_(item, rootId) {
  var queue = [item];
  var guard = 0;
  while (queue.length && guard++ < 60) {
    var cur = queue.shift();
    if (cur.getId() === rootId) return true;
    var parents = cur.getParents();
    while (parents.hasNext()) queue.push(parents.next());
  }
  return false;
}

function list_(root) {
  var files = [];
  walk_(root, '', 0, files);
  return files;
}

function walk_(folder, path, depth, files) {
  var it = folder.getFiles();
  while (it.hasNext() && files.length < MAX_LIST) {
    var f = it.next();
    if (!ALLOWED[ext_(f.getName())]) continue;
    files.push({ id: f.getId(), name: f.getName(), path: path + f.getName(), size: f.getSize(), modified: f.getLastUpdated().toISOString() });
  }
  if (depth >= MAX_DEPTH) return;
  var sub = folder.getFolders();
  while (sub.hasNext() && files.length < MAX_LIST) {
    var s = sub.next();
    walk_(s, path + s.getName() + '/', depth + 1, files);
  }
}

function get_(root, req) {
  var id = req.id;
  if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{10,}$/.test(id)) return { ok: false, error: 'bad_request' };
  var file;
  try { file = DriveApp.getFileById(id); } catch (err) { return { ok: false, error: 'not_found' }; }
  if (!inside_(file, root.getId())) return { ok: false, error: 'outside_folder' };
  if (!ALLOWED[ext_(file.getName())]) return { ok: false, error: 'type_not_allowed' };
  if (file.getSize() > MAX_BYTES) return { ok: false, error: 'too_large' };
  return { ok: true, name: file.getName(), size: file.getSize(), data: Utilities.base64Encode(file.getBlob().getBytes()) };
}

function cleanName_(s, max) {
  if (typeof s !== 'string') return null;
  var t = s.trim();
  if (!t || t.length > max || /[\/\\]/.test(t) || t.indexOf('..') !== -1 || t.charAt(0) === '.') return null;
  return t;
}

function put_(root, req) {
  var folderName = cleanName_(req.folder, 80);
  var name = cleanName_(req.name, 150);
  if (!folderName || !name || typeof req.data !== 'string' || !req.data) return { ok: false, error: 'bad_request' };
  var ext = ext_(name);
  if (!ALLOWED[ext]) return { ok: false, error: 'type_not_allowed' };
  if (req.data.length > MAX_BASE64_CHARS) return { ok: false, error: 'too_large' };
  var bytes = Utilities.base64Decode(req.data);
  if (!bytes || !bytes.length) return { ok: false, error: 'bad_request' };
  if (bytes.length > MAX_BYTES) return { ok: false, error: 'too_large' };

  var folders = root.getFoldersByName(folderName);
  var folder = folders.hasNext() ? folders.next() : root.createFolder(folderName);
  var finalName = name;
  if (folder.getFilesByName(finalName).hasNext()) {
    /* Never overwrite: the newer file gets a time stamp in its name. */
    var stamp = new Date().toISOString().replace(/[:.]/g, '-');
    finalName = name.slice(0, name.length - ext.length - 1) + ' (' + stamp + ').' + ext;
  }
  var file = folder.createFile(Utilities.newBlob(bytes, ALLOWED[ext], finalName));
  return { ok: true, id: file.getId(), name: finalName, path: folderName + '/' + finalName };
}
