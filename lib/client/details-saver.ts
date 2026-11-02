"use client";
/* Lets Publish and Preview save the story details first, even if they haven't been saved yet. */
let saver: (() => Promise<boolean>) | null = null;
export function registerDetailsSaver(fn: (() => Promise<boolean>) | null) { saver = fn; }
export function saveDetailsNow(): Promise<boolean> { return saver ? saver() : Promise.resolve(true); }
