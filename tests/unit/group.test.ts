import { expect, test } from "vitest";
import { groupByFandom, type FicCardData } from "@/lib/content/queries";

const fic = (slug: string, fandoms: string[]) =>
  ({ slug, tags: fandoms.map((f, i) => ({ id: i, type: "fandom", name: f, slug: f.toLowerCase() })) }) as unknown as FicCardData;

test("fics group under each fandom, alphabetically, with untagged ones last under Other", () => {
  const groups = groupByFandom([fic("a", ["Naruto"]), fic("b", []), fic("c", ["Naruto", "Bleach"])]);
  expect(groups.map((g) => g.name)).toEqual(["Bleach", "Naruto", "Other"]);
  expect(groups[1].fics.map((f) => f.slug)).toEqual(["a", "c"]);
  expect(groups[2].fics.map((f) => f.slug)).toEqual(["b"]);
});
