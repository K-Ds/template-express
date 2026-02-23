import express from 'express';
import cors from 'cors';
import type { Response } from 'express';
import ApiResponse from './utils/ApiResponse';
import { globalErrorHandler } from './middleware/ErrorHandler';
import { metricsEndpoint, metricsMiddleware } from './middleware/observability';
import { requestLogger } from './configs/observability';
import { redisClient } from './configs/redis';
import { logger } from './utils/logger';
import { pool } from './configs/database';

const app = express();

app.use(cors());
app.use(express.json());

app.use(requestLogger);
app.use(metricsMiddleware);

app.get('/metrics', metricsEndpoint);

app.get('/health/live', (_req, res) => {
  return ApiResponse.success(res, 200, 'Process is alive', {
    uptime: Math.floor(process.uptime()),
  });
});

app.get('/health', async (_req, res) => {
  let redisStatus = 'down';
  try {
    if (redisClient.isOpen) {
      await redisClient.ping();
      redisStatus = 'up';
    }
  } catch (err) {
    logger.error({ err }, 'Redis ping failed during health check');
  }

  let dbStatus = 'down';
  const poolStats = {
    total: pool?.totalCount,
    idle: pool?.idleCount,
    waiting: pool?.waitingCount,
  };

  try {
    await pool.query('SELECT 1');
    dbStatus = 'up';
  } catch (err) {
    logger.error({ err }, 'Database readiness check failed');
  }

  const isSystemUp = redisStatus === 'up' && dbStatus === 'up';

  const healthData = {
    services: {
      redis: {
        status: redisStatus,
      },
      database: {
        status: dbStatus,
        pool: poolStats,
      },
    },
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  };

  if (!isSystemUp) {
    logger.warn(healthData, 'Health check failed');

    return ApiResponse.error(res, 503, 'Service Unavailable', [healthData.services]);
  }

  return ApiResponse.success(res, 200, 'System is healthy', healthData);
});

app.use((_, res: Response) => {
  ApiResponse.error(res, 404, 'Route not found');
});

app.use(globalErrorHandler);

export { app };
