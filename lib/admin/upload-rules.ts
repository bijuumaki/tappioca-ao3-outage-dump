import { ACCEPTED_EXTENSIONS, MAX_DOCUMENT_BYTES } from "@/lib/convert/index-constants";

const MAX_FILES_PER_BATCH = 40;
export type UploadProblem = { name: string; message: string };

/* Checked in the browser before anything is sent, and again on the server before upload addresses are made. */
export function checkUploadRequest(files: { name: string; size: number }[]): UploadProblem[] {
  const problems: UploadProblem[] = [];
  if (files.length > MAX_FILES_PER_BATCH) problems.push({ name: `${files.length} files`, message: `That's more than ${MAX_FILES_PER_BATCH} files at once. Send them in smaller batches.` });
  const seen = new Set<string>();
  for (const f of files) {
    if (seen.has(f.name)) problems.push({ name: f.name, message: `Two files have the same name (“${f.name}”). Rename one and try again.` });
    seen.add(f.name);
    const ext = (f.name.match(/\.([A-Za-z0-9]+)$/)?.[1] ?? "").toLowerCase();
    if (!(ACCEPTED_EXTENSIONS as readonly string[]).includes(ext)) problems.push({ name: f.name, message: `“${f.name}” isn’t a type I can read. Use .html, .md, .txt, .docx or .epub.` });
    else if (f.size === 0) problems.push({ name: f.name, message: `“${f.name}” is empty.` });
    else if (f.size > MAX_DOCUMENT_BYTES) problems.push({ name: f.name, message: `“${f.name}” is over 25 MB.` });
  }
  return problems;
}
