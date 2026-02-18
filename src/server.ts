import dotenv from 'dotenv';
import { app } from './app';
import { logger } from './utils/logger';

dotenv.config();

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV}`);
});

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception! Shutting down...');
  process.exit(1);
});

process.on('unhandledRejection', (err) => {
  logger.fatal({ err }, 'Unhandled Rejection! Shutting down...');
  process.exit(1);
});

export default server;
