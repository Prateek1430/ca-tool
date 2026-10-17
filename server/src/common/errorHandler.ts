import { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import multer from "multer";
import { AppError } from "./errors";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: "UploadError", message: err.message });
  }

  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
    return res.status(400).json({
      error: "ValidationError",
      message: details[0]?.message ?? "Invalid request",
      details,
    });
  }

  if (err instanceof AppError) {
    return res.status(err.status).json({ error: err.name, message: err.message });
  }

  // eslint-disable-next-line no-console
  console.error(err);
  return res.status(500).json({ error: "InternalServerError", message: "Something went wrong" });
}
