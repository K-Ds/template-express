import { pinoHttp } from 'pino-http';
import promClient from 'prom-client';
import { randomUUID } from 'crypto';

import { logger } from '@/utils/logger';
import type { Request, Response, NextFunction } from 'express';

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

const promRegister = new promClient.Registry();

promClient.collectDefaultMetrics({ register: promRegister });

const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [promRegister],
});

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  if (req.path === '/metrics' || req.path === '/health') {
    next();
    return;
  }
  const start = Date.now();

  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;

    httpRequestDuration
      .labels(req.method, req.route ? req.route.path : req.path, res.statusCode.toString())
      .observe(duration);
  });
  next();
};

export const metricsEndpoint = async (_: Request, res: Response) => {
  res.set('Content-Type', promRegister.contentType);
  res.end(await promRegister.metrics());
};
