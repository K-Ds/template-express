import mongoose from 'mongoose';
import { logger } from '@/utils/logger';
import 'dotenv/config';
import { standardizationPlugin } from '@/utils/mongoosePlugin';

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    logger.fatal('MONGO_URI is not defined in environment variables');
    process.exit(1);
}

const dbConfig: mongoose.ConnectOptions = {
  autoIndex: process.env.NODE_ENV !== 'production',

  family: 4,
  connectTimeoutMS: 10000,

  // readPreference: 'primaryPreferred',
  // writeConcern: {
  //   w: 'majority',
  //   j: true,
  //   wtimeout: 5000,
  // },

  maxPoolSize: 20,
  minPoolSize: 2,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 30000,
};

export const connectDB = async (): Promise<void> => {
  try {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to DB Cluster');
    });

    mongoose.connection.on('error', (err) => {
      logger.error({ err }, 'Mongoose connection error');
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected');
    });

    mongoose.plugin(standardizationPlugin);

    mongoose.set('debug', (collectionName, method, query, doc) => {
      const logMessage = `Mongoose: ${collectionName}.${method}`;
      
      if (process.env.NODE_ENV !== 'production') {
        logger.debug({ query, doc }, logMessage);
      } else {
        logger.info(logMessage);
      }
    });

    await mongoose.connect(MONGO_URI, dbConfig);
  } catch (err) {
    logger.fatal({ err }, 'Initial Mongoose connection failed');
    process.exit(1);
  }
};

export const closeDB = async (): Promise<void> => {
  await mongoose.connection.close();
  logger.info('Mongoose connection closed through app termination');
};
