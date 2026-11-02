export const PAGE_TEXTS = [
  { slug: "howdy", label: "Howdy", hint: "The box next to your photo on the home page." },
  { slug: "archive", label: "The Archive", hint: "A line or two inside the Archive box on the home page." },
  { slug: "about", label: "About", hint: "The About page." },
  { slug: "disclaimer", label: "Disclaimer", hint: "The Disclaimer page." },
  { slug: "links", label: "Links", hint: "The Links page. Turn any words into a link with the link button." },
  { slug: "comms", label: "Comms", hint: "The Comms page (not in the home buttons, reachable by its address)." },
] as const;
export type PageSlug = (typeof PAGE_TEXTS)[number]["slug"];
