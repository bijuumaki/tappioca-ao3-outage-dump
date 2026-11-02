(function () {
  var root = document.documentElement;

  /* Saved choices live in this browser only. Always inside try/catch: storage can be blocked. */
  function read(key) { try { return localStorage.getItem(key); } catch (e) { return null; } }
  function write(key, val) { try { localStorage.setItem(key, val); } catch (e) {} }

  /* Theme */
  var themeBtn = document.getElementById("theme-toggle");
  function isDark() {
    var t = root.getAttribute("data-theme");
    if (t) return t === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function syncTheme() { themeBtn.setAttribute("aria-pressed", String(isDark())); }
  themeBtn.addEventListener("click", function () {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    write("fic-site-theme", next);
    syncTheme();
  });
  var savedTheme = read("fic-site-theme");
  if (savedTheme === "dark" || savedTheme === "light") root.setAttribute("data-theme", savedTheme);
  syncTheme();

  /* Font: "default" or one of the options. Web fonts load only when picked. */
  var fontSel = document.getElementById("font-select");
  var fontNames = ["lucida", "cantarell", "tahoma", "crimson", "imfell", "cormorant"];
  var webFonts = { cantarell: "Cantarell", crimson: "Crimson+Pro", imfell: "IM+Fell+English", cormorant: "Cormorant+Garamond" };
  var fontsLoaded = {};
  function loadWebFont(v) {
    if (!webFonts[v] || fontsLoaded[v]) return;
    fontsLoaded[v] = true;
    var link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=" + webFonts[v] + "&display=swap";
    document.head.appendChild(link);
  }
  function applyFont(v) {
    if (fontNames.indexOf(v) === -1) v = "default";
    loadWebFont(v);
    if (v === "default") root.removeAttribute("data-font"); else root.setAttribute("data-font", v);
    fontSel.value = v;
  }
  fontSel.addEventListener("change", function () { applyFont(fontSel.value); write("fic-site-font", fontSel.value); });
  applyFont(read("fic-site-font"));

  /* Text size: 10pt to 24pt in steps of 2, default 14pt */
  var slider = document.getElementById("size-slider");
  var out = document.getElementById("size-out");
  function applySize(v) {
    var n = parseFloat(v);
    if (isNaN(n)) n = 14;
    n = 10 + Math.round((n - 10) / 2) * 2;
    n = Math.max(10, Math.min(24, n));
    root.style.setProperty("--fs", n + "pt");
    slider.value = String(n);
    out.textContent = n + "pt";
  }
  slider.addEventListener("input", function () { applySize(slider.value); write("fic-site-size", slider.value); });
  applySize(read("fic-site-size") || 14);

  /* Aa panel */
  var aaBtn = document.getElementById("aa-toggle");
  var panel = document.getElementById("size-panel");
  function setPanel(open) { panel.hidden = !open; aaBtn.setAttribute("aria-expanded", String(open)); }
  aaBtn.addEventListener("click", function () { setPanel(panel.hidden); });
  document.addEventListener("click", function (e) {
    if (!panel.hidden && !panel.contains(e.target) && !aaBtn.contains(e.target)) setPanel(false);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && !panel.hidden) { setPanel(false); aaBtn.focus(); }
  });

  /* Reading progress: furthest point reached, per item id (0 to 1). Only moves forward, so scrolling
     back up never loses the place. Here it tracks the sample passage; point it at any chapter element. */
  var PROGRESS_KEY = "fic-site-progress";
  function allProgress() {
    try { return JSON.parse(read(PROGRESS_KEY)) || {}; } catch (e) { return {}; }
  }
  function getProgress(id) { var p = allProgress()[id]; return typeof p === "number" ? p : 0; }
  function saveProgress(id, pos) {
    var all = allProgress();
    if ((all[id] || 0) >= pos) return;
    all[id] = Math.round(pos * 1000) / 1000;
    write(PROGRESS_KEY, JSON.stringify(all));
  }
  var sample = document.getElementById("sample");
  var note = document.getElementById("progress-note");
  function currentPos() {
    var r = sample.getBoundingClientRect();
    var total = r.height - window.innerHeight * 0.5;
    if (total <= 0) return 1;
    return Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / r.height));
  }
  var saved = getProgress("sample");
  if (saved > 0.02) {
    note.textContent = "Welcome back. You had read about " + Math.round(saved * 100) + "% of this page.";
    note.hidden = false;
    window.scrollTo(0, sample.getBoundingClientRect().top + window.scrollY + saved * sample.offsetHeight - window.innerHeight * 0.5);
  }
  var timer = null;
  window.addEventListener("scroll", function () {
    if (timer) return;
    timer = setTimeout(function () { timer = null; saveProgress("sample", currentPos()); }, 250);
  }, { passive: true });
})();
