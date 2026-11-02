/* Saved reader choices live in this browser only. Storage can be blocked, so always try/catch. */
export function readPref(key: string): string | null {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function writePref(key: string, value: string): void {
  try { localStorage.setItem(key, value); } catch { /* storage blocked */ }
}

export const FONT_NAMES = ["lucida", "cantarell", "tahoma", "crimson", "imfell", "cormorant"] as const;
export const WEB_FONTS: Record<string, string> = {
  cantarell: "Cantarell", crimson: "Crimson+Pro", imfell: "IM+Fell+English", cormorant: "Cormorant+Garamond",
};

export function loadWebFont(name: string): void {
  const family = WEB_FONTS[name];
  if (!family || document.querySelector(`link[data-webfont="${name}"]`)) return;
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
  return Math.max(10, Math.min(24, n));
}

/* Runs in <head> before paint so saved choices apply without a flash. Kept in sync with the helpers above. */
export const PREFS_BOOT_SCRIPT = `(function(){try{var r=document.documentElement,s=localStorage;
var t=s.getItem("fic-site-theme");if(t==="dark"||t==="light")r.setAttribute("data-theme",t);
var f=s.getItem("fic-site-font"),w=${JSON.stringify(WEB_FONTS)};
if(${JSON.stringify(FONT_NAMES)}.indexOf(f)>-1){r.setAttribute("data-font",f);if(w[f]){var l=document.createElement("link");l.rel="stylesheet";l.setAttribute("data-webfont",f);l.href="https://fonts.googleapis.com/css2?family="+w[f]+"&display=swap";document.head.appendChild(l);}}
var z=parseFloat(s.getItem("fic-site-size"));if(!isNaN(z)){z=Math.max(10,Math.min(24,10+Math.round((z-10)/2)*2));r.style.setProperty("--fs",z+"pt");}
}catch(e){}})();`;
