import { httpRequestDuration, promRegister } from '@/configs/observability';
import type { Request, Response, NextFunction } from 'express';

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
