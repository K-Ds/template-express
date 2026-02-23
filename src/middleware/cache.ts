import type { Request, Response, NextFunction } from 'express';
import { redisClient } from '@/configs/redis';
import AppError from '../utils/AppError';
import { logger } from '../utils/logger';
import { cacheHitsTotal, cacheMissesTotal } from '@/configs/observability';
import ApiResponse from '@/utils/ApiResponse';
import type { CacheOptions, errorBody, payloadCache, successBody } from '@/types/cache';

export const cacheRoute = ({ durationInSeconds, keyBuilder, tags }: CacheOptions) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET') return next();

    const uniquePath = keyBuilder ? keyBuilder(req) : `global:${req.originalUrl}`;
    const key = `cache:${uniquePath}`;
    const routeName = req.route ? req.route.path : req.path;

    try {
      const cachedResponse = await redisClient.get(key);

      if (cachedResponse) {
        logger.debug(`Cache hit for ${key}`);
        cacheHitsTotal.labels(routeName).inc();

        const parsedPayload = JSON.parse(cachedResponse);
        return ApiResponse.success(res, 200, parsedPayload.message, parsedPayload.data);
      }

      logger.debug(`Cache miss for ${key}`);
      cacheMissesTotal.labels(routeName).inc();

      const originalJson = res.json.bind(res);

      res.json = (body: successBody | errorBody): Response => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const payloadToCache: payloadCache = {
            message: body.message,
          };

          if ('data' in body) {
            payloadToCache.data = body.data;
          }

          const multi = redisClient.multi();
          multi.setEx(key, durationInSeconds, JSON.stringify(payloadToCache));

          if (tags) {
            const resolvedTags = tags(req);
            resolvedTags.forEach((tag: string) => {
              const tagKey = `tag:${tag}`;
              multi.sAdd(tagKey, key);
              multi.expire(tagKey, durationInSeconds);
            });
          }

          multi.exec().catch((err) => {
            logger.error({ err }, `Failed to set cache and tags for ${key}`);
          });
        }

        return originalJson(body);
      };

      next();
    } catch (error) {
      logger.error({ error }, `Redis GET error for key: ${key}`);
      next(new AppError(500, 'Internal Cache Service Error', [error]));
    }
  };
};

export const invalidateTags = (tagsResolver: string[] | ((req: Request) => string[])) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      const tags = typeof tagsResolver === 'function' ? tagsResolver(req) : tagsResolver;

      for (const tag of tags) {
        const tagKey = `tag:${tag}`;

        const keysToDelete = await redisClient.sMembers(tagKey);

        if (keysToDelete.length > 0) {
          await redisClient.del([...keysToDelete, tagKey]);
          logger.info(`Invalidated ${keysToDelete.length} keys for tag: ${tag}`);
        }
      }

      next();
    } catch (error) {
      logger.error({ error }, 'Failed to invalidate cache tags');
      next(new AppError(500, 'Internal Cache Service Error', [error]));
    }
  };
};

export const invalidateKey = (keyBuilder: string | ((req: Request) => string)) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const uniquePath = typeof keyBuilder === 'function' ? keyBuilder(req) : keyBuilder;
    const key = `cache:${uniquePath}`;

    try {
      const deletedCount = await redisClient.del(key);

      if (deletedCount > 0) {
        logger.info(`Successfully invalidated exact cache key: ${key}`);
      } else {
        logger.debug(`Attempted to invalidate ${key}, but it was not found in cache.`);
      }

      next();
    } catch (error) {
      logger.error({ error }, `Failed to invalidate precise key: ${key}`);
      next(new AppError(500, 'Internal Cache Service Error', [error]));
    }
  };
};
