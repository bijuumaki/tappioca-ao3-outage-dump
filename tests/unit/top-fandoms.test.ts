import { expect, test } from "vitest";
import { topFandoms } from "@/lib/content/top-fandoms";

const f = (name: string, count: number) => ({ name, count });

test("keeps everything when there are few fandoms", () => {
  expect(topFandoms([f("(b)", 1), f("(a)", 3)])).toEqual({ shown: [f("(a)", 3), f("(b)", 1)], hidden: 0 });
});

test("shows the five biggest fandoms and counts the rest, ties A to Z", () => {
  const all = [f("(g)", 1), f("(f)", 1), f("(e)", 2), f("(d)", 2), f("(c)", 9), f("(b)", 4), f("(a)", 1)];
  const { shown, hidden } = topFandoms(all);
  expect(shown.map((x) => x.name)).toEqual(["(c)", "(b)", "(d)", "(e)", "(a)"]);
  expect(hidden).toBe(2);
});
