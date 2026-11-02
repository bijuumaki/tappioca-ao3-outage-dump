import type JSZip from "jszip";
import { ConvertError } from "./errors";

const MAX_ENTRY_BYTES = 30 * 1024 * 1024;
const MAX_TOTAL_BYTES = 150 * 1024 * 1024;

/* A small zip can claim to hold gigabytes ("zip bomb"). The sizes are read from the zip's index, before anything
   is unpacked, and a file that expands past these limits is refused. */
export function assertZipSafe(zip: JSZip): void {
  let total = 0;
  zip.forEach((_path, entry) => {
    const size = (entry as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    if (size > MAX_ENTRY_BYTES) throw new ConvertError("That file expands to something far too large, so I won’t open it.");
    total += size;
  });
  if (total > MAX_TOTAL_BYTES) throw new ConvertError("That file expands to something far too large, so I won’t open it.");
}
