import { PDFParse } from "pdf-parse";

/** Thin wrapper around pdf-parse's class-based v2 API — extracts all page text as one string. */
export async function extractRawPdfText(buffer: Buffer): Promise<string> {
  const parser = new PDFParse({ data: buffer });
  try {
    // pdf-parse defaults to inserting a "-- N of M --" marker between pages,
    // which is non-empty even for a page with zero real text — that defeats
    // our "no extractable text" check for image-only/blank PDFs. Disabling it
    // still leaves the newline separators between pages, just no filler text.
    const result = await parser.getText({ pageJoiner: "" });
    return result.text;
  } finally {
    await parser.destroy();
  }
}
