import mammoth from "mammoth";
import { BadRequestError } from "../../common/errors";
import { extractRawPdfText } from "../../common/pdf";

const MAX_CHARS_FOR_AI = 40000; // keep prompts within a safe token budget

export interface ExtractedContract {
  text: string;
  truncated: boolean;
}

export async function extractPdfText(buffer: Buffer): Promise<ExtractedContract> {
  let text: string;
  try {
    text = await extractRawPdfText(buffer);
  } catch {
    throw new BadRequestError("Could not read this PDF. It may be corrupt or password-protected.");
  }
  return finalize(text);
}

export async function extractDocxText(buffer: Buffer): Promise<ExtractedContract> {
  let text: string;
  try {
    const result = await mammoth.extractRawText({ buffer });
    text = result.value;
  } catch {
    throw new BadRequestError("Could not read this DOCX file. It may be corrupt or in an unsupported format.");
  }
  return finalize(text);
}

function finalize(text: string): ExtractedContract {
  const trimmed = (text ?? "").trim();
  if (!trimmed) {
    throw new BadRequestError(
      "No extractable text found in this document. Scanned/image-only documents are not supported yet."
    );
  }
  const truncated = trimmed.length > MAX_CHARS_FOR_AI;
  return { text: truncated ? trimmed.slice(0, MAX_CHARS_FOR_AI) : trimmed, truncated };
}
