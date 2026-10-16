/** Strips a UTF-8 BOM and converts CRLF / CR line endings to LF. */
export function normalizeLineEndings(content: string): string {
  return content.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
}

/** Trims every line and drops blank ones. */
export function tidyLines(text: string): string {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}
