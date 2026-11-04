"use client";
import { useEffect, useState } from "react";
import { FONTS, isApple } from "@/lib/client/prefs";

/* Charter and Avenir Next only exist on Apple devices. Everywhere else the site uses Charis SIL and Nunito Sans in their place, so the card says what you actually get. */
const NOT_APPLE: Record<string, string> = { charter: "Charis SIL", avenir: "Nunito Sans" };

/* Starts on the Apple names so the server page and the first browser paint match; the real device is checked right after. */
export function useFontLabel(): (v: string) => string {
  const [apple, setApple] = useState(true);
  useEffect(() => setApple(isApple()), []);
  return (v) => (v === "default" ? "Inclusive Sans (default)" : !apple && NOT_APPLE[v] ? NOT_APPLE[v] : FONTS.find(([k]) => k === v)?.[1] ?? v);
}
