import { NextResponse } from "next/server";
import { unstable_rethrow } from "next/navigation";
import { ZodError } from "zod";
import { DomainError } from "@/server/services/errors";

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status });
}

export function jsonError(message: string, status = 400, details?: Record<string, unknown>) {
  return NextResponse.json(
    {
      ok: false,
      error: {
        message,
        ...(details ? { details } : {}),
      },
    },
    { status }
  );
}

export function handleApiError(error: unknown) {
  unstable_rethrow(error);

  if (error instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of error.issues) {
      const path = issue.path.join(".") || "form";
      if (!fieldErrors[path]) fieldErrors[path] = [];
      fieldErrors[path].push(issue.message);
    }
    return jsonError(
      error.issues[0]?.message || "Data masukan tidak valid.",
      400,
      { fieldErrors }
    );
  }

  if (error instanceof DomainError) {
    return jsonError(error.message, error.statusCode, { code: error.code });
  }

  if (error instanceof SyntaxError) {
    return jsonError("Format JSON tidak valid.", 400);
  }

  console.error("[API Error]", error instanceof Error ? error.message : "Unexpected error");
  return jsonError("Terjadi kesalahan internal pada server.", 500);
}

