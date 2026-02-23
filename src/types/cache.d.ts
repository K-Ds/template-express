import type { errorStatusCodes, successStatusCodes } from '@/types/statusCodes';
import type { Request, Response } from 'express';

export interface successBody {
  res: Response;
  statusCode: successStatusCodes;
  message: string;
  data: Record<string, unknown>;
}

export interface errorBody {
  res: Response;
  statusCode: errorStatusCodes;
  message: string;
  errors: unknown[];
  stack?: string;
}

export interface payloadCache {
  message: string;
  data?: Record<string, unknown>;
}

export interface CacheOptions {
  durationInSeconds: number;
  keyBuilder?: (req: Request) => string;
  tags?: (req: Request) => string[];
}
