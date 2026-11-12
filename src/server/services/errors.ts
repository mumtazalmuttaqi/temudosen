export class DomainError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode = 400, code = "BAD_REQUEST") {
    super(message);
    this.name = "DomainError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ConflictError extends DomainError {
  constructor(message = "Terjadi konflik data. Silakan pilih opsi lain.") {
    super(message, 409, "CONFLICT");
    this.name = "ConflictError";
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = "Anda tidak memiliki izin untuk melakukan aksi ini.") {
    super(message, 403, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends DomainError {
  constructor(message = "Data yang diminta tidak ditemukan.") {
    super(message, 404, "NOT_FOUND");
    this.name = "NotFoundError";
  }
}

