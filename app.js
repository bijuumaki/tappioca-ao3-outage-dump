(function () {
    var root = document.documentElement;
    if (!root.getAttribute("lang")) root.setAttribute("lang", "en");
    var baseTitle = document.title;

    /* The library: a Google Apps Script web app that reads the Drive folder (apps-script/Code.gs).
       Not a secret; it only serves that one folder. Plain GET requests, so the browser needs no preflight. */
    var LIBRARY_URL = "https://script.google.com/macros/s/AKfycbzp6QNwpXQCtwJrba7PSS3qWA-Y6fljaQ9pckKFvWm8NrFuiokibS6kg8RhUlD7KuECfg/exec";
    var REQUEST_TIMEOUT = 30000; /* the first request after a quiet spell can take a while to wake the script */
    var LIBRARY_CACHE_KEY = "fic-site-library";

    var headerEl = document.querySelector(".site-header");
    var headerInner = document.querySelector(".site-header-inner");
    var siteTitle = document.querySelector(".site-title");
    var toolsEl = document.querySelector(".tools");
    var pageEl = document.querySelector(".page");
    var sidebarEl = document.querySelector(".sidebar");
    var welcomeEl = document.querySelector(".welcome");
    var listToolsEl = document.getElementById("list-tools");
    var viewHome = document.getElementById("view-home");
    var viewList = document.getElementById("view-list");
    var ficList = document.getElementById("fic-list");
    var listLoading = document.getElementById("list-loading");
    var listError = document.getElementById("list-error");
    var listErrorText = document.getElementById("list-error-text");
    var listEmpty = document.getElementById("list-empty");
    var themeBtn = document.getElementById("theme-toggle");
    var fontSel = document.getElementById("font-select");
    var aaBtn = document.getElementById("aa-toggle");
    var panel = document.getElementById("size-panel");
    var menuBtn = document.getElementById("menu-btn");
    var layer = document.getElementById("drawer-layer");
    var drawerEl = document.getElementById("drawer");
    var closeBtn = document.getElementById("drawer-close");
    var drawerTools = document.getElementById("drawer-tools");
    var drawerContent = document.getElementById("drawer-content");
    var narrow = window.matchMedia("(max-width: 900px)");
    var medium = window.matchMedia("(max-width: 1239px)");

    /* Theme */
    function systemDark() {
      return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    function isDark() {
      var t = root.getAttribute("data-theme");
      if (t === "dark") return true;
      if (t === "light") return false;
      return systemDark();
    }
    function syncTheme() { themeBtn.setAttribute("aria-pressed", String(isDark())); }
    themeBtn.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("fic-site-theme", next); } catch (e) {}
      syncTheme();
    });

    /* Font choice: "default" or one of the options in the select */
    var fontNames = ["lucida", "cantarell", "tahoma", "crimson", "imfell", "cormorant"];
    function applyFont(v) {
      if (fontNames.indexOf(v) === -1) v = "default";
      if (v === "default") root.removeAttribute("data-font"); else root.setAttribute("data-font", v);
      fontSel.value = v;
    }
    fontSel.addEventListener("change", function () {
      applyFont(fontSel.value);
      try { localStorage.setItem("fic-site-font", fontSel.value); } catch (e) {}
    });
    try {
      var savedTheme = localStorage.getItem("fic-site-theme");
      if (savedTheme === "dark" || savedTheme === "light") root.setAttribute("data-theme", savedTheme);
      applyFont(localStorage.getItem("fic-site-font"));
    } catch (e) {}

    /* Text size: 10pt to 24pt (default stays 14pt) */
    var slider = document.getElementById("size-slider");
    var out = document.getElementById("size-out");
    function applySize(v) {
      var n = parseFloat(v);
      if (isNaN(n)) n = 14;
      n = 10 + Math.round((n - 10) / 2) * 2; /* steps of 2: 10, 12, 14 ... 24 */
      if (n < 10) n = 10;
      if (n > 24) n = 24;
      root.style.setProperty("--fs", n + "pt");
      slider.value = String(n);
      out.textContent = n + "pt";
    }
    slider.addEventListener("input", function () {
      applySize(slider.value);
      try { localStorage.setItem("fic-site-size", slider.value); } catch (e) {}
    });
    var savedSize = null;
    try { savedSize = localStorage.getItem("fic-site-size"); } catch (e) {}
    applySize(savedSize || 14);

    /* Aa panel */
    function setPanel(open) {
      panel.hidden = !open;
      aaBtn.setAttribute("aria-expanded", String(open));
    }
    aaBtn.addEventListener("click", function () { setPanel(panel.hidden); });
    document.addEventListener("click", function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !aaBtn.contains(e.target)) setPanel(false);
    });

    /* Menu drawer: modal while open (page behind is inert and does not scroll, Tab stays inside) */
    function setDrawer(open, restoreFocus) {
      layer.hidden = !open;
      menuBtn.setAttribute("aria-expanded", String(open));
      headerEl.inert = open;
      pageEl.inert = open;
      root.classList.toggle("menu-open", open);
      if (open) closeBtn.focus();
      else if (restoreFocus) menuBtn.focus();
    }
    function focusables(container) {
      var all = container.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])');
      return Array.prototype.filter.call(all, function (el) { return el.getClientRects().length > 0; });
    }
    layer.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var items = focusables(drawerEl);
      if (!items.length) return;
      var first = items[0];
      var last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    menuBtn.addEventListener("click", function () { setDrawer(true); });
    closeBtn.addEventListener("click", function () { setDrawer(false, true); });
    layer.addEventListener("click", function (e) {
      if (e.target.hasAttribute("data-close")) { setDrawer(false, true); return; }
      var link = e.target.closest(".nav-card a, .links-card a");
      if (link) {
        setDrawer(false, false);
        if (link.getAttribute("href") === location.hash) focusView(true);
      }
    });
    document.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (!panel.hidden) { setPanel(false); aaBtn.focus(); }
      else if (!layer.hidden) { setDrawer(false, true); }
    });

    /* Where things live at each size: toggles and sidebar go into the drawer on phones,
       sort and search sit above the cards whenever the right column is gone */
    function place() {
      if (narrow.matches) {
        if (toolsEl.parentNode !== drawerTools) drawerTools.appendChild(toolsEl);
        if (sidebarEl.parentNode !== drawerContent) drawerContent.appendChild(sidebarEl);
      } else {
        if (toolsEl.parentNode !== headerInner) headerInner.insertBefore(toolsEl, siteTitle);
        if (sidebarEl.parentNode !== pageEl) pageEl.insertBefore(sidebarEl, welcomeEl);
        if (!layer.hidden) setDrawer(false, false);
      }
      if (medium.matches) {
        if (listToolsEl.parentNode !== viewList) viewList.insertBefore(listToolsEl, listLoading);
      } else if (listToolsEl.parentNode !== pageEl) {
        pageEl.appendChild(listToolsEl);
      }
    }
    [narrow, medium].forEach(function (mq) {
      if (mq.addEventListener) mq.addEventListener("change", place);
      else if (mq.addListener) mq.addListener(place);
    });
    place();

    /* Views: the nav's List link and the Quick fic links open the fic list; anything else shows home */
    var listRoutes = ["list", "resident-evil", "cyberpunk-2077", "naruto", "saw-2004"];
    /* Pages that are not built yet show a "coming soon" note instead of the Home page */
    var soonRoutes = { "disclaimer": "Disclaimer", "about": "About", "links": "Links", "comms": "Comms open!" };
    var viewSoon = document.getElementById("view-soon");
    var viewRead = document.getElementById("view-read");
    var soonHeading = document.getElementById("soon-heading");
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-card a, .links-card a"));
    function safeDecode(v) { try { return decodeURIComponent(v); } catch (e) { return v; } }
    function routeName() { return (location.hash || "").replace(/^#/, ""); }
    function activeView() {
      return !viewRead.hidden ? viewRead : (!viewList.hidden ? viewList : (!viewSoon.hidden ? viewSoon : viewHome));
    }
    function focusView(scrollTop) {
      var h = activeView().querySelector("h1");
      h.focus({ preventScroll: true });
      if (scrollTop) window.scrollTo(0, 0);
    }
    function route(userNav) {
      var name = routeName();
      var parts = name.split("/");
      var showRead = parts[0] === "read" && !!parts[1]; /* #read/<fic-id>/<chapter> */
      var showList = listRoutes.indexOf(name) !== -1;
      var showSoon = soonRoutes.hasOwnProperty(name);
      viewHome.hidden = showList || showSoon || showRead;
      viewList.hidden = !showList;
      viewSoon.hidden = !showSoon;
      viewRead.hidden = !showRead;
      if (showSoon) soonHeading.textContent = soonRoutes[name] + ": coming soon";
      listToolsEl.hidden = !showList;
      if (showList) loadLibrary(false);
      document.title = showList ? "Tappioca’s fanfiction stories" : (showSoon ? soonRoutes[name] + " (coming soon)" : baseTitle);
      var current = showList || showSoon ? name : (showRead ? "list" : (name === "" || name === "home" ? "home" : ""));
      if (showRead) openReader(safeDecode(parts[1]), parts[2], !!userNav);
      navLinks.forEach(function (a) {
        if (current && a.getAttribute("href") === "#" + current) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      if (userNav) { focusView(true); }
    }
    window.addEventListener("hashchange", function () { route(true); });
    document.getElementById("skip-link").addEventListener("click", function (e) {
      e.preventDefault();
      activeView().querySelector("h1").focus();
    });

    /* Fic list: built from the library, with live search and sorting, results announced */
    var ficEmpty = document.getElementById("fic-empty");
    var statusEl = document.getElementById("list-status");
    var searchInput = document.getElementById("fic-search");
    var sortButtons = Array.prototype.slice.call(document.querySelectorAll(".sort-btn"));
    var currentSort = "";

    /* Talking to the library. Every request is a plain GET without custom headers, so there is no CORS preflight. */
    function friendlyError(err) {
      if (err && err.name === "AbortError") return "The library took too long to answer. Please try again in a moment.";
      if (err && err.name === "SyntaxError") return "The library sent back something unexpected. Please try again in a moment.";
      if (err && err.fromLibrary) {
        if (err.message === "Not found.") return "That fic could not be found.";
        return "The library had a problem: " + err.message;
      }
      if (err && err.fromHttp) return "The library answered with an error (" + err.message + "). Please try again in a moment.";
      return "Couldn’t reach the library. Check your connection and try again.";
    }
    function libraryGet(params) {
      var query = Object.keys(params || {}).map(function (k) {
        return encodeURIComponent(k) + "=" + encodeURIComponent(params[k]);
      }).join("&");
      var ctl = window.AbortController ? new AbortController() : null;
      var timer = setTimeout(function () { if (ctl) ctl.abort(); }, REQUEST_TIMEOUT);
      return fetch(LIBRARY_URL + (query ? "?" + query : ""), ctl ? { signal: ctl.signal } : {})
        .then(function (res) {
          if (!res.ok) { var e = new Error(String(res.status)); e.fromHttp = true; throw e; }
          return res.json();
        })
        .then(function (data) {
          if (data && data.error) { var e = new Error(String(data.error)); e.fromLibrary = true; throw e; }
          return data;
        })
        .then(function (data) { clearTimeout(timer); return data; },
              function (err) { clearTimeout(timer); throw new Error(friendlyError(err)); });
    }

    /* Saved in this browser only: the last library list, so the list shows at once and then refreshes */
    function readSaved(key) {
      try { var raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
    }
    function writeSaved(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) {}
    }

    /* Placeholders for details a file does not give. Same look as the original design cards:
       a value in (parentheses) or the lorem ipsum filler is a placeholder (see isPlaceholder). */
    var PLACEHOLDER = {
      title: "(fic title)",
      fandom: "(media title)",
      rating: "(rating)",
      words: "(numerical value)",
      relationships: "(pairing)",
      summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. In mollis rutrum rhoncus. Suspendisse potenti. Mauris congue odio ipsum, at sodales risus efficitur nec. In hac habitasse platea dictumst. Integer consectetur dolor nulla, nec facilisis lectus vestibulum sed. Cras porttitor ut eros et gravida. Duis quis interdum ipsum. Nullam cursus, lacus sed cursus laoreet, elit quam tristique lorem, nec scelerisque justo lacus sed mi. Curabitur quis fermentum urna, quis rhoncus dolor. Cras convallis orci ac nulla"
    };
    function make(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }
    function detail(field, label, value, placeholder) {
      var p = make("p", null, label + ": " + (value || placeholder));
      p.setAttribute("data-field", field);
      return p;
    }
    /* Built with textContent only, never innerHTML: the text comes from files in Drive */
    function buildCard(fic, index) {
      var card = make("article", "fic-card");
      card.setAttribute("data-fic-id", fic.id);
      card.setAttribute("data-order", String(index));
      card.setAttribute("data-tags", (fic.tags || []).join(" "));
      card.appendChild(make("h2", "fic-title", fic.title || PLACEHOLDER.title));
      var rule = make("div", "fic-rule");
      rule.setAttribute("aria-hidden", "true");
      card.appendChild(rule);
      var meta = make("div", "fic-meta");
      var words = typeof fic.words === "number" && fic.words > 0 ? fic.words.toLocaleString("en-US") : "";
      meta.appendChild(detail("fandom", "FANDOM", fic.fandom, PLACEHOLDER.fandom));
      meta.appendChild(detail("rating", "RATING", fic.rating, PLACEHOLDER.rating));
      meta.appendChild(detail("words", "WORD COUNT", words, PLACEHOLDER.words));
      meta.appendChild(detail("relationships", "RELATIONSHIPS", fic.relationships, PLACEHOLDER.relationships));
      meta.appendChild(make("p", "summary-label", "SUMMARY:"));
      var summary = make("p", null, fic.summary || PLACEHOLDER.summary);
      summary.setAttribute("data-field", "summary");
      meta.appendChild(summary);
      card.appendChild(meta);
      var actions = make("p", "fic-actions");
      if (fic.readable === false || !fic.chapterCount) {
        actions.appendChild(make("span", "fic-soon", "(can’t be read here yet)"));
      } else {
        var go = make("a", "fic-btn", "Start reading");
        go.setAttribute("href", readLink(fic.id, 1));
        go.setAttribute("aria-label", "Start reading " + (fic.title || PLACEHOLDER.title));
        actions.appendChild(go);
      }
      card.appendChild(actions);
      return card;
    }

    var libraryLoadedAt = 0;
    var libraryBusy = false;
    function showListState(state, message) {
      listLoading.hidden = state !== "loading";
      listError.hidden = state !== "error";
      listEmpty.hidden = state !== "empty";
      ficList.hidden = state !== "list";
      if (state === "error") listErrorText.textContent = message;
      ficList.setAttribute("aria-busy", String(state === "loading"));
    }
    function renderLibrary(data) {
      var fics = (data && data.fics) || [];
      while (ficList.firstChild) ficList.removeChild(ficList.firstChild);
      fics.forEach(function (fic, i) { ficList.appendChild(buildCard(fic, i)); });
      showListState(fics.length ? "list" : "empty");
      if (currentSort) sortCards(currentSort);
      filterCards();
    }
    function loadLibrary(force) {
      if (libraryBusy) return;
      if (!force && libraryLoadedAt && Date.now() - libraryLoadedAt < 60000) return; /* no need to ask again within a minute */
      var saved = readSaved(LIBRARY_CACHE_KEY);
      var haveSaved = !!(saved && saved.data && saved.data.fics);
      if (haveSaved) renderLibrary(saved.data); else showListState("loading");
      libraryBusy = true;
      libraryGet({}).then(function (data) {
        libraryBusy = false;
        libraryLoadedAt = Date.now();
        writeSaved(LIBRARY_CACHE_KEY, { savedAt: Date.now(), data: data });
        renderLibrary(data);
      }, function (err) {
        libraryBusy = false;
        if (haveSaved) { statusEl.textContent = "Couldn’t refresh the library, showing the last saved list."; return; }
        showListState("error", err.message);
      });
    }
    document.getElementById("list-retry").addEventListener("click", function () { loadLibrary(true); });

    function fieldValue(card, name) {
      var el = card.querySelector('[data-field="' + name + '"]');
      if (!el) return "";
      var t = el.textContent;
      var i = t.indexOf(":");
      return (i >= 0 ? t.slice(i + 1) : t).trim();
    }
    /* Placeholder text: a value that is empty, wrapped entirely in parentheses like "(media title)" or
       "(numerical value)", or the lorem ipsum filler. Placeholders are never searched and always sort last,
       so replacing them with real text later needs no code changes ("Saw (2004)" is real text, not a placeholder). */
    function isPlaceholder(v) {
      v = (v || "").trim();
      return v === "" || /^\([^)]*\)$/.test(v) || /^lorem ipsum/i.test(v);
    }
    function searchText(card) {
      var parts = [];
      var title = card.querySelector(".fic-title");
      if (title) parts.push(title.textContent);
      ["fandom", "rating", "words", "relationships"].forEach(function (f) { parts.push(fieldValue(card, f)); });
      parts.push(fieldValue(card, "summary"));
      parts.push(card.getAttribute("data-tags") || "");
      return parts.filter(function (p) { return !isPlaceholder(p); }).join(" ").toLowerCase();
    }
    function sortCards(mode) {
      var cards = Array.prototype.slice.call(ficList.children);
      cards.forEach(function (c, i) { if (!c.hasAttribute("data-order")) c.setAttribute("data-order", String(i)); });
      var numeric = mode === "words-asc" || mode === "words-desc";
      var field = numeric ? "words" : mode;
      cards.sort(function (a, b) {
        var va = fieldValue(a, field), vb = fieldValue(b, field);
        var pa = isPlaceholder(va), pb = isPlaceholder(vb);
        if (pa !== pb) return pa ? 1 : -1; /* placeholders sort last in either direction */
        var r = 0;
        if (!pa) {
          if (numeric) {
            var na = parseFloat(va.replace(/,/g, "")), nb = parseFloat(vb.replace(/,/g, ""));
            if (isNaN(na) !== isNaN(nb)) return isNaN(na) ? 1 : -1;
            if (!isNaN(na)) r = mode === "words-asc" ? na - nb : nb - na;
          } else {
            r = va.localeCompare(vb);
          }
        }
        return r || (parseInt(a.getAttribute("data-order"), 10) - parseInt(b.getAttribute("data-order"), 10));
      });
      cards.forEach(function (c) { ficList.appendChild(c); });
    }
    sortButtons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        sortButtons.forEach(function (b) { b.setAttribute("aria-pressed", String(b === btn)); });
        var mode = btn.getAttribute("data-sort");
        currentSort = mode;
        sortCards(mode);
        var label = btn.textContent.toLowerCase();
        statusEl.textContent = "Sorted by " + (mode.indexOf("words") === 0 ? "word count, " : "") + label;
      });
    });
    function filterCards() {
      var q = searchInput.value.trim().toLowerCase();
      var cards = Array.prototype.slice.call(ficList.children);
      var shown = 0;
      cards.forEach(function (card) {
        var match = !q || searchText(card).indexOf(q) !== -1;
        card.hidden = !match;
        if (match) shown += 1;
      });
      ficEmpty.hidden = shown > 0 || cards.length === 0;
      if (cards.length) statusEl.textContent = shown === 0 ? "No fics match that search." : shown + " of " + cards.length + " fics shown";
    }
    searchInput.addEventListener("input", filterCards);
    document.getElementById("search-form").addEventListener("submit", function (e) {
      e.preventDefault();
      filterCards();
    });
    document.getElementById("clear-search").addEventListener("click", function () {
      searchInput.value = "";
      filterCards();
      searchInput.focus();
    });

    /* Reader: #read/<fic-id>/<chapter>. The chapter list comes from ?action=fic, the text from ?action=text. */
    var readerTitle = document.getElementById("reader-title");
    var readerChapter = document.getElementById("reader-chapter");
    var readerBar = document.getElementById("reader-bar");
    var chapterSelect = document.getElementById("chapter-select");
    var readerLoading = document.getElementById("reader-loading");
    var readerError = document.getElementById("reader-error");
    var readerErrorText = document.getElementById("reader-error-text");
    var readerText = document.getElementById("reader-text");
    var readerPager = document.getElementById("reader-pager");
    var readerPrev = document.getElementById("reader-prev");
    var readerNext = document.getElementById("reader-next");
    var ficCache = {}; /* fic id -> the fic with its chapter list, kept for this visit */
    var textCache = {}; /* chapter file id -> text, the last few chapters read */
    var textOrder = [];
    var readToken = 0; /* a newer request makes an older answer ignore itself */
    var lastOpen = null;

    function getFic(id) {
      if (ficCache[id]) return Promise.resolve(ficCache[id]);
      return libraryGet({ action: "fic", id: id }).then(function (fic) { ficCache[id] = fic; return fic; });
    }
    function getChapterText(chapter) {
      if (textCache.hasOwnProperty(chapter.id)) return Promise.resolve(textCache[chapter.id]);
      return libraryGet({ action: "text", id: chapter.id }).then(function (data) {
        textCache[chapter.id] = String(data.text || "");
        textOrder.push(chapter.id);
        while (textOrder.length > 6) delete textCache[textOrder.shift()];
        return textCache[chapter.id];
      });
    }
    function setReader(state, message) {
      readerLoading.hidden = state !== "loading";
      readerError.hidden = state !== "error";
      readerText.hidden = state !== "text";
      if (state !== "text") readerPager.hidden = true;
      if (state === "error") readerErrorText.textContent = message;
    }
    function chapterLabel(ch) {
      return /^chapter\s+\d/i.test(ch.title || "") ? ch.title : ch.n + ". " + (ch.title || "Chapter " + ch.n);
    }
    function readLink(ficId, n) { return "#read/" + encodeURIComponent(ficId) + "/" + n; }

    function openReader(ficId, chapterArg, userNav) {
      var token = ++readToken;
      lastOpen = [ficId, chapterArg, userNav];
      setReader("loading");
      readerBar.hidden = true;
      readerChapter.hidden = true;
      readerTitle.textContent = ficCache[ficId] ? ficCache[ficId].title : "Loading…";
      getFic(ficId).then(function (fic) {
        if (token !== readToken) return null;
        var chapters = fic.chapters || [];
        if (fic.readable === false || !chapters.length) throw new Error("This fic can’t be read here yet.");
        var n = parseInt(chapterArg, 10);
        var fixed = isNaN(n) || n < 1 ? 1 : Math.min(n, chapters.length);
        if (String(fixed) !== String(chapterArg)) { location.replace(readLink(ficId, fixed)); return null; }
        var chapter = chapters[n - 1];
        readerTitle.textContent = fic.title || PLACEHOLDER.title;
        return getChapterText(chapter).then(function (text) {
          if (token !== readToken) return;
          showChapter(fic, n, text, userNav);
        });
      }).catch(function (err) {
        if (token !== readToken) return;
        readerTitle.textContent = ficCache[ficId] ? ficCache[ficId].title : "Couldn’t open this fic";
        setReader("error", err.message);
      });
    }

    function showChapter(fic, n, text, userNav) {
      var chapters = fic.chapters;
      var multi = chapters.length > 1;
      while (readerText.firstChild) readerText.removeChild(readerText.firstChild);
      renderMarkdown(text, readerText);
      setReader("text");

      readerBar.hidden = !multi;
      readerChapter.hidden = !multi;
      if (multi) {
        readerChapter.textContent = "Chapter " + n + " of " + chapters.length;
        while (chapterSelect.firstChild) chapterSelect.removeChild(chapterSelect.firstChild);
        chapters.forEach(function (ch) {
          var opt = make("option", null, chapterLabel(ch));
          opt.value = String(ch.n);
          chapterSelect.appendChild(opt);
        });
        chapterSelect.value = String(n);
        chapterSelect.setAttribute("data-fic-id", fic.id);
      }
      readerPrev.hidden = !multi || n <= 1;
      readerNext.hidden = !multi || n >= chapters.length;
      if (!readerPrev.hidden) readerPrev.setAttribute("href", readLink(fic.id, n - 1));
      if (!readerNext.hidden) readerNext.setAttribute("href", readLink(fic.id, n + 1));
      readerPager.hidden = !multi;

      document.title = (fic.title || PLACEHOLDER.title) + (multi ? ", chapter " + n : "");
      if (userNav) { window.scrollTo(0, 0); readerTitle.focus({ preventScroll: true }); }
      if (n < chapters.length) getChapterText(chapters[n]).catch(function () {}); /* the next chapter, ready before it is asked for */
    }

    chapterSelect.addEventListener("change", function () {
      location.hash = readLink(chapterSelect.getAttribute("data-fic-id"), chapterSelect.value);
    });
    document.getElementById("reader-retry").addEventListener("click", function () {
      if (lastOpen) openReader(lastOpen[0], lastOpen[1], true);
    });

    syncTheme();
    route(false);
  })();
