/* When the floating "Back to top" button shows. Wide screens: near the bottom of the page.
   Phones also show it while the reader scrolls back up after going a long way down. */
export function shouldShowTop(s: { width: number; y: number; vh: number; docHeight: number; upMode: boolean }): boolean {
  const nearBottom = s.y + s.vh >= s.docHeight - 200;
  return nearBottom || (s.width < 600 && s.upMode);
}

/* "Scrolling up, far from the top." Only reacts to movements of at least 8px; smaller ones keep the last answer. */
export function nextUpMode(s: { prev: boolean; moved: number; y: number; vh: number }): boolean {
  if (Math.abs(s.moved) < 8) return s.prev;
  return s.moved < 0 && s.y > s.vh * 1.5;
}
