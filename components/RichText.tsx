import { renderRichText } from "@/lib/richtext/render";

/* Stored bodies are sanitized again here, so nothing unsafe reaches a reader even if it slipped into the database. */
export default function RichText({ html, className = "" }: { html: string; className?: string }) {
  return <div className={`rich-text ${className}`.trim()} dangerouslySetInnerHTML={{ __html: renderRichText(html) }} />;
}
