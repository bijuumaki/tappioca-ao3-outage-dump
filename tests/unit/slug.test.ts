import { expect, test } from "vitest";
import { slugify } from "@/lib/text/slug";

test("spaces become dashes", () => expect(slugify("Anam Cara")).toBe("anam-cara"));
test("lowercases", () => expect(slugify("MORIBUND")).toBe("moribund"));
test("drops accents and punctuation", () => expect(slugify("  Ça va? Oui!  ")).toBe("ca-va-oui"));
test("empty becomes untitled", () => expect(slugify("")).toBe("untitled"));
