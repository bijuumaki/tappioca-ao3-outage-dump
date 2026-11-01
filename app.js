(function () {
    var root = document.documentElement;
    if (!root.getAttribute("lang")) root.setAttribute("lang", "en");
    var baseTitle = document.title;

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
        if (listToolsEl.parentNode !== viewList) viewList.insertBefore(listToolsEl, ficList);
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
    var soonHeading = document.getElementById("soon-heading");
    var navLinks = Array.prototype.slice.call(document.querySelectorAll(".nav-card a, .links-card a"));
    function routeName() { return (location.hash || "").replace(/^#/, ""); }
    function activeView() { return !viewList.hidden ? viewList : (!viewSoon.hidden ? viewSoon : viewHome); }
    function focusView(scrollTop) {
      var h = activeView().querySelector("h1");
      h.focus({ preventScroll: true });
      if (scrollTop) window.scrollTo(0, 0);
    }
    function route(userNav) {
      var name = routeName();
      var showList = listRoutes.indexOf(name) !== -1;
      var showSoon = soonRoutes.hasOwnProperty(name);
      viewHome.hidden = showList || showSoon;
      viewList.hidden = !showList;
      viewSoon.hidden = !showSoon;
      if (showSoon) soonHeading.textContent = soonRoutes[name] + ": coming soon";
      listToolsEl.hidden = !showList;
      document.title = showList ? "Tappioca’s fanfiction stories" : (showSoon ? soonRoutes[name] + " (coming soon)" : baseTitle);
      var current = showList || showSoon ? name : (name === "" || name === "home" ? "home" : "");
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
    route(false);

    /* Fic list: live search and sorting, with results announced */
    var ficEmpty = document.getElementById("fic-empty");
    var statusEl = document.getElementById("list-status");
    var searchInput = document.getElementById("fic-search");
    var sortButtons = Array.prototype.slice.call(document.querySelectorAll(".sort-btn"));

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
      var summary = card.querySelector(".fic-meta p:not([data-field]):not(.summary-label)");
      if (summary) parts.push(summary.textContent);
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
      ficEmpty.hidden = shown > 0;
      statusEl.textContent = shown === 0 ? "No fics match that search." : shown + " of " + cards.length + " fics shown";
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

    syncTheme();
  })();
