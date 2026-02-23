import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/client';
import { logger } from '@/utils/logger';

const DB_URL = process.env.DATABASE_URL;

if (!DB_URL) {
  logger.fatal('DATABASE_URL is not defined in environment variables');
  process.exit(1);
}

export const pool = new Pool({
  connectionString: DB_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

pool.on('connect', () => {
  logger.debug('New DB client established in pool');
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected error on idle DB client');
});

setInterval(() => {
  const { totalCount, idleCount, waitingCount } = pool;
  if (waitingCount > 0) {
    logger.warn(
      { totalCount, idleCount, waitingCount },
      'Database pool saturation detected: Requests are waiting for connections',
    );
  }
}, 5000);

const adapter = new PrismaPg(pool);

export const prisma = new PrismaClient({
  adapter,
  log: [
    { emit: 'event', level: 'query' },
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

prisma.$on('query', (e: Prisma.QueryEvent) => {
  logger.debug({ query: e.query, duration: `${e.duration}ms` }, 'Prisma Query');
});

prisma.$on('error', (e: Prisma.LogEvent) => {
  logger.error({ error: e }, 'Prisma Error');
});

prisma.$on('warn', (e: Prisma.LogEvent) => {
  logger.warn({ warning: e }, 'Prisma Warning');
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
  try {
    await prisma.$disconnect();

    await pool.end();

    logger.info('Database connections (Prisma & PG Pool) closed gracefully');
  } catch (err) {
    logger.error({ err }, 'Error during database shutdown');
    throw err;
  }
};
