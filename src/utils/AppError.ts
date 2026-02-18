import type { errorStatusCodes } from '@/types/statusCodes';

class AppError extends Error {
  public readonly statusCode: errorStatusCodes;
  public readonly errors: unknown[];

  constructor(statusCode: errorStatusCodes, message: string, errors: unknown[] = [], stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }

    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export default AppError;
