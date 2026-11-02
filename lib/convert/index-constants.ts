/* Shared by the browser (which must not load the converters) and the server. */
export const ACCEPTED_EXTENSIONS = ["html", "htm", "md", "markdown", "txt", "docx", "epub"] as const;
export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024;
