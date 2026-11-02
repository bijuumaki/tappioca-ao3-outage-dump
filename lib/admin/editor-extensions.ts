import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import { BackgroundColor, Color, TextStyle } from "@tiptap/extension-text-style";
import StarterKit from "@tiptap/starter-kit";
import { BlockColor } from "./block-color";

/* The one set of editor features, matching the allowed rich-text format. */
export const editorExtensions = [
  StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
  TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
  TextStyle, Color, BackgroundColor, Highlight.configure({ multicolor: true }), BlockColor,
  Image.configure({ allowBase64: false, inline: false }),
];
