import { prisma } from "../../common/prisma";
import { encrypt, decrypt } from "../../common/encryption";
import { BadRequestError, ForbiddenError, NotFoundError } from "../../common/errors";
import { extractPdfText, extractDocxText } from "./extraction";
import { analyzeContract } from "./analyzer";

const MAX_FILE_BYTES = 15 * 1024 * 1024; // 15MB

export interface UploadedFile {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

function isPdf(file: UploadedFile): boolean {
  return file.mimetype === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf");
}

function isDocx(file: UploadedFile): boolean {
  return (
    file.mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    file.originalname.toLowerCase().endsWith(".docx")
  );
}

export async function uploadContract(userId: string, file: UploadedFile) {
  if (!file) throw new BadRequestError("No file uploaded");
  if (file.size === 0) throw new BadRequestError("Uploaded file is empty");
  if (file.size > MAX_FILE_BYTES) throw new BadRequestError("File too large (max 15MB)");

  let extracted;
  if (isPdf(file)) {
    extracted = await extractPdfText(file.buffer);
  } else if (isDocx(file)) {
    extracted = await extractDocxText(file.buffer);
  } else {
    throw new BadRequestError("Unsupported file type. Please upload a PDF or DOCX contract.");
  }

  const contract = await prisma.contract.create({
    data: {
      userId,
      filename: file.originalname,
      extractedTextEnc: encrypt(extracted.text),
      status: "PROCESSING",
    },
  });

  try {
    const analysis = await analyzeContract(extracted.text);

    await prisma.$transaction([
      prisma.contract.update({
        where: { id: contract.id },
        data: {
          status: "ANALYZED",
          riskRating: analysis.overallRiskRating,
          renewalDate: analysis.renewalDate ? new Date(analysis.renewalDate) : null,
          summary: {
            plainEnglishSummary: analysis.plainEnglishSummary,
            conclusion: analysis.conclusion,
            renewalInfo: analysis.renewalInfo,
            disclaimer: analysis.disclaimer,
            aiGenerated: analysis.aiGenerated,
            truncated: extracted.truncated,
          },
        },
      }),
      prisma.contractFinding.createMany({
        data: [
          ...analysis.riskClauses.map((r) => ({
            contractId: contract.id,
            type: "RISK" as const,
            text: r.clauseText,
            explanation: r.explanation,
            severity: r.severity,
          })),
          ...analysis.missingClauses.map((m) => ({
            contractId: contract.id,
            type: "MISSING" as const,
            text: m.clauseName,
            explanation: m.explanation,
            severity: "MEDIUM" as const,
          })),
        ],
      }),
    ]);
  } catch (err) {
    await prisma.contract.update({ where: { id: contract.id }, data: { status: "FAILED" } });
    throw err;
  }

  return getContractById(userId, contract.id);
}

export async function listContracts(userId: string) {
  return prisma.contract.findMany({
    where: { userId },
    orderBy: { uploadedAt: "desc" },
    select: {
      id: true,
      filename: true,
      uploadedAt: true,
      status: true,
      riskRating: true,
      renewalDate: true,
    },
  });
}

export async function getContractById(userId: string, contractId: string) {
  const contract = await prisma.contract.findUnique({
    where: { id: contractId },
    include: { findings: true },
  });
  if (!contract) throw new NotFoundError("Contract not found");
  if (contract.userId !== userId) throw new ForbiddenError("You do not have access to this contract");

  return {
    id: contract.id,
    filename: contract.filename,
    uploadedAt: contract.uploadedAt,
    status: contract.status,
    riskRating: contract.riskRating,
    renewalDate: contract.renewalDate,
    summary: contract.summary,
    findings: contract.findings.map((f) => ({
      id: f.id,
      type: f.type,
      text: f.text,
      explanation: f.explanation,
      severity: f.severity,
    })),
  };
}

export async function getContractFullText(userId: string, contractId: string): Promise<string> {
  const contract = await prisma.contract.findUnique({ where: { id: contractId } });
  if (!contract) throw new NotFoundError("Contract not found");
  if (contract.userId !== userId) throw new ForbiddenError("You do not have access to this contract");
  return decrypt(contract.extractedTextEnc);
}
