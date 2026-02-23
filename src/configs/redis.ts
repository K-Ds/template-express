import { createClient, type RedisClientOptions } from 'redis';
import 'dotenv/config';
import { logger } from '@/utils/logger';

const redisUrl =
  process.env.REDIS_URL ||
  `redis://${process.env.REDIS_HOST || '127.0.0.1'}:${process.env.REDIS_PORT || '6379'}`;

const redisConnectionOptions: RedisClientOptions = {
  url: redisUrl,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 20) {
        logger.error('Redis max reconnection attempts reached. Terminating connection.');
        return new Error('Max retries reached');
      }
      const delay = Math.min(retries * 100, 3000);
      logger.warn({ delay, retries }, 'Redis connection lost. Attempting to reconnect...');
      return delay;
    },
  },
};

if (process.env.REDIS_PASSWORD) {
  redisConnectionOptions.password = process.env.REDIS_PASSWORD;
}

export const redisClient = createClient(redisConnectionOptions);

redisClient.on('connect', () => logger.info('Redis connection established physically.'));
redisClient.on('ready', () => logger.info('Redis client is ready.'));
redisClient.on('error', (err: Error) => logger.error({ err }, 'Redis connection error.'));
redisClient.on('end', () => logger.warn('Redis connection closed.'));
redisClient.on('reconnecting', () => logger.info('Redis reconnecting...'));

export const connectRedis = async () => {
  try {
    await redisClient.connect();
  } catch (error) {
    logger.fatal({ error }, 'Failed to initialize Redis connection during startup');
    process.exit(1);
  }
};
