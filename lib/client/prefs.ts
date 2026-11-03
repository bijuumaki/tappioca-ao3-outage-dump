/* Saved reader choices live in this browser only. Storage can be blocked, so always try/catch. */
export function readPref(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writePref(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export const THEMES = [["day", "Day"], ["lagoon", "Old paper"], ["night", "Night"], ["midnight", "Midnight"]] as const;
export const SPACINGS = [["tight", "Tight"], ["normal", "Normal"], ["loose", "Loose"]] as const;
export const FONTS = [
  ["default", "Default"], ["lucida", "Lucida Sans"], ["cantarell", "Cantarell"],
  ["crimson", "Crimson Pro"], ["ebgaramond", "EB Garamond"], ["charter", "Charter"],
] as const;
const FONT_NAMES = FONTS.map(([v]) => v).filter((v) => v !== "default");
/* Each web font is asked for its real regular, bold, italic and bold italic, so nothing on screen is a browser-faked bold or slant. */
const WEB_FONTS: Record<string, string> = {
  cantarell: "Cantarell:ital,wght@0,400;0,700;1,400;1,700", crimson: "Crimson+Pro:ital,wght@0,400;0,700;1,400;1,700", ebgaramond: "EB+Garamond:ital,wght@0,400;0,700;1,400;1,700",
  charter: "Charis+SIL:ital,wght@0,400;0,700;1,400;1,700",
};
/* Apple devices ship the real Charter, so Charter is the only font that is not downloaded there; everywhere else it is Charis SIL, a font built from Charter. */
function isApple(): boolean { return /Mac|iPhone|iPad|iPod/.test(navigator.userAgent); }
export const SIZE_MIN = 10;
export const SIZE_MAX = 20;

export function loadWebFont(name: string): void {
  const family = WEB_FONTS[name];
  if (!family || (name === "charter" && isApple()) || document.querySelector(`link[data-webfont="${name}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.dataset.webfont = name;
  link.href = `https://fonts.googleapis.com/css2?family=${family}&display=swap`;
  document.head.appendChild(link);
}

export function clampSize(value: string | number | null): number {
  let n = typeof value === "number" ? value : parseFloat(value ?? "");
  if (Number.isNaN(n)) n = 14;
  n = 10 + Math.round((n - 10) / 2) * 2;
  return Math.max(SIZE_MIN, Math.min(SIZE_MAX, n));
}

/* Runs in <head> before paint so saved choices apply without a flash. Kept in sync with the helpers above. */
export const PREFS_BOOT_SCRIPT = `(function(){var r=document.documentElement,s;try{s=localStorage}catch(e){s=null}
function g(k){try{return s&&s.getItem(k)}catch(e){return null}}
var t=g("fic-site-theme");if(${JSON.stringify(THEMES.map(([v]) => v))}.indexOf(t)<0)t=window.matchMedia&&matchMedia("(prefers-color-scheme: dark)").matches?"night":"day";r.setAttribute("data-theme",t);
var f=g("fic-site-font"),w=${JSON.stringify(WEB_FONTS)};
if(${JSON.stringify(FONT_NAMES)}.indexOf(f)>-1){r.setAttribute("data-font",f);if(w[f]&&!(f==="charter"&&/Mac|iPhone|iPad|iPod/.test(navigator.userAgent))){var l=document.createElement("link");l.rel="stylesheet";l.setAttribute("data-webfont",f);l.href="https://fonts.googleapis.com/css2?family="+w[f]+"&display=swap";document.head.appendChild(l);}}
var z=parseFloat(g("fic-site-size"));if(!isNaN(z)){z=Math.max(${SIZE_MIN},Math.min(${SIZE_MAX},10+Math.round((z-10)/2)*2));r.style.setProperty("--fs",String(z/14));r.style.setProperty("--read",z+"pt");}
var p=g("fic-site-spacing");if(p==="tight"||p==="loose")r.setAttribute("data-spacing",p);
})();`;
