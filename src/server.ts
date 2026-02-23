import dotenv from 'dotenv';
import { app } from './app';
import { logger } from './utils/logger';
import { redisClient, connectRedis } from '@/configs/redis';

dotenv.config();

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  await connectRedis();

  const server = app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV}`);
  });

  const gracefulShutdown = async (signal: string) => {
    logger.info(`${signal} signal received: closing HTTP server`);

    server.close(async () => {
      logger.info('HTTP server closed');
      try {
        await redisClient.quit();
        logger.info('Redis connection closed gracefully');
        process.exit(0);
      } catch (err) {
        logger.error({ err }, 'Error during graceful shutdown');
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
};

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception! Shutting down...');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled Rejection! Shutting down...');
  process.exit(1);
});

startServer();
