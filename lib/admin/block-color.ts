import { Extension } from "@tiptap/core";

/* Pasted or uploaded HTML can put color on a whole paragraph or heading (<p style="color:…">), not just on words.
   The editor keeps it, so opening and saving a chapter never drops a color. */
export const BlockColor = Extension.create({
  name: "blockColor",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading"],
      attributes: {
        blockColor: {
          default: null,
          parseHTML: (el) => (el as HTMLElement).style.color || null,
          renderHTML: (attrs) => (attrs.blockColor ? { style: `color: ${attrs.blockColor}` } : {}),
        },
        blockHighlight: {
          default: null,
          parseHTML: (el) => (el as HTMLElement).style.backgroundColor || null,
          renderHTML: (attrs) => (attrs.blockHighlight ? { style: `background-color: ${attrs.blockHighlight}` } : {}),
        },
      },
    }];
  },
});
