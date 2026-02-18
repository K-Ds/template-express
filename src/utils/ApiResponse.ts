import type { errorStatusCodes, successStatusCodes } from '@/types/statusCodes';
import type { Response } from 'express';

const ApiResponse = {
  success(
    res: Response,
    statusCode: successStatusCodes,
    message: string,
    data: Record<string, unknown> = {},
  ) {
    return res.status(statusCode).json({
      status: 'success',
      timeStamp: Date.now(),
      message,
      data,
    });
  },

  error(
    res: Response,
    statusCode: errorStatusCodes,
    message: string,
    errors: unknown[] = [],
    stack?: string,
  ) {
    return res.status(statusCode).json({
      status: 'failed',
      timeStamp: Date.now(),
      message,
      errors,
      stack: process.env.NODE_ENV === 'development' ? stack : undefined,
    });
  },
};

export default ApiResponse;
