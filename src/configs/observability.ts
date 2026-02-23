import { pinoHttp } from 'pino-http';
import promClient from 'prom-client';
import { randomUUID } from 'crypto';

import { logger } from '@/utils/logger';
import type { Request, Response } from 'express';

export const requestLogger = pinoHttp({
  logger: logger,
  genReqId: (req) => (req.headers['x-request-id'] as string) || randomUUID(),

  autoLogging: {
    ignore: (req) => req.url === '/health' || req.url === '/metrics',
  },

  customProps: (req: Request, _res: Response) => {
    const authReq = req;

    if (!authReq.user) return {};

    return {
      userId: authReq.user.id,
      userRole: authReq.user.role,
    };
  },

  customSuccessMessage: (req, res) => {
    return `${req.method} ${req.url} completed in ${res.statusCode}`;
  },
});

export const promRegister = new promClient.Registry();

promClient.collectDefaultMetrics({ register: promRegister });

export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [promRegister],
});