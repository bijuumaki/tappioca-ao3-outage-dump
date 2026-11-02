import JSZip from "jszip";
import { expect, test } from "vitest";
import { ConvertError } from "@/lib/convert/errors";
import { convertFile } from "@/lib/convert";
import { epubToFic } from "@/lib/convert/epub";
import { docxToChapter } from "@/lib/convert/docx";

const noUpload = async () => "https://cdn.example/x.png";
const words = (n: number) => Array.from({ length: n }, (_, i) => `word${i}`).join(" ");

async function docx(): Promise<ArrayBuffer> {
  const z = new JSZip();
  z.file("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>');
  z.file("_rels/.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');
  z.file("word/_rels/document.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>');
  z.file("word/document.xml", '<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Hello</w:t></w:r><w:r><w:t xml:space="preserve"> world</w:t></w:r></w:p></w:body></w:document>');
  return z.generateAsync({ type: "arraybuffer" });
}

async function epub(): Promise<ArrayBuffer> {
  const z = new JSZip();
  z.file("mimetype", "application/epub+zip");
  z.file("META-INF/container.xml", '<?xml version="1.0"?><container xmlns="urn:oasis:names:tc:opendocument:xmlns:container" version="1.0"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>');
  z.file("OEBPS/content.opf", `<?xml version="1.0"?><package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>(e2e book)</dc:title><dc:description>(e2e blurb)</dc:description></metadata><manifest><item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/><item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/><item id="c1" href="ch1.xhtml" media-type="application/xhtml+xml"/><item id="c2" href="ch2.xhtml" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="cover"/><itemref idref="nav"/><itemref idref="c1"/><itemref idref="c2"/></spine></package>`);
  const page = (body: string) => `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><head><title>t</title></head><body>${body}</body></html>`;
  z.file("OEBPS/nav.xhtml", page("<nav><ol><li>Chapter One</li></ol></nav>"));
  z.file("OEBPS/cover.xhtml", page("<h1>(e2e book)</h1><p>by someone</p>"));
  z.file("OEBPS/ch1.xhtml", page(`<h1>Chapter One</h1><p>${words(40)}</p>`));
  z.file("OEBPS/ch2.xhtml", page(`<h2>Chapter Two</h2><p><em>${words(40)}</em></p>`));
  return z.generateAsync({ type: "arraybuffer" });
}

test("a .docx keeps bold text", async () => {
  const html = await docxToChapter(await docx(), noUpload);
  expect(html).toContain("<strong>Hello</strong>");
  expect(html).toContain("world");
});

test("an .epub becomes chapters in reading order, skipping the cover and contents pages", async () => {
  const fic = await epubToFic(await epub(), noUpload);
  expect(fic.title).toBe("(e2e book)");
  expect(fic.summary).toBe("(e2e blurb)");
  expect(fic.chapters.map((c) => c.title)).toEqual(["Chapter One", "Chapter Two"]);
  expect(fic.chapters[1].html).toContain("<em>");
  expect(fic.chapters[0].html).not.toContain("Chapter One</h");
});

test("convertFile picks the converter by file type", async () => {
  const md = await convertFile("(e2e) - 1.md", new TextEncoder().encode("# Hi\n\ntext").buffer as ArrayBuffer, noUpload);
  expect(md.chapters).toHaveLength(1);
  expect(md.chapters[0].html).toContain("text");
  const html = await convertFile("a.html", new TextEncoder().encode("<p>x y</p>").buffer as ArrayBuffer, noUpload);
  expect(html.chapters[0].html).toBe("<p>x y</p>");
  const book = await convertFile("book.epub", await epub(), noUpload);
  expect(book.chapters).toHaveLength(2);
});

test("bad files give a clear message instead of a crash", async () => {
  await expect(convertFile("x.epub", new TextEncoder().encode("not a zip").buffer as ArrayBuffer, noUpload)).rejects.toBeInstanceOf(ConvertError);
  await expect(convertFile("x.docx", await epub(), noUpload)).rejects.toBeInstanceOf(ConvertError);
  await expect(convertFile("x.md", new Uint8Array().buffer as ArrayBuffer, noUpload)).rejects.toThrow(/no text/i);
  await expect(convertFile("x.exe", new Uint8Array([1]).buffer as ArrayBuffer, noUpload)).rejects.toThrow(/isn’t a type/i);
});

test("a zip that would expand to a huge size is refused before it is opened", async () => {
  const z = new JSZip();
  z.file("mimetype", "application/epub+zip");
  z.file("META-INF/container.xml", '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>');
  z.file("OEBPS/content.opf", "<package/>");
  z.file("OEBPS/ch1.xhtml", Buffer.alloc(35 * 1024 * 1024));
  const bomb = await z.generateAsync({ type: "arraybuffer", compression: "DEFLATE" });
  expect(bomb.byteLength).toBeLessThan(1024 * 1024);
  await expect(epubToFic(bomb, noUpload)).rejects.toThrow(/too large|expands/i);
  await expect(docxToChapter(bomb, noUpload)).rejects.toThrow(/too large|expands/i);
});
