import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/client';
import { logger } from '@/utils/logger';

const DB_URL = process.env.DATABASE_URL

if (!DB_URL) {
    logger.fatal('DATABASE_URL is not defined in environment variables');
    process.exit(1);
}

const pool = new Pool({
  connectionString: DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' }
  ],
});

prisma.$on('query' as any, (e: any) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
});

export const connectDB = async () => {
  try {
    await pool.query('SELECT 1');
    logger.info('Database connected');
  } catch (err) {
    logger.fatal({ err }, 'Prisma connection failed');
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
    await pool.end();
    logger.info('Database connection closed');
}