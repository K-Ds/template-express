import type { Request, Response, NextFunction } from 'express';
import AppError from '../utils/AppError';
import ApiResponse from '../utils/ApiResponse';
import { logger } from '@/utils/logger';

export const globalErrorHandler = async (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
) => {
  logger.error({ err }, 'Global Error Handler Caught Exception');

  if (err instanceof AppError) {
    return ApiResponse.error(res, err.statusCode, err.message, err.errors, err.stack);
  } else {
    return ApiResponse.error(res, 500, err.message, [], err.stack);
  }
};
