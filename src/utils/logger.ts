import pino from 'pino';
import type { LoggerOptions } from 'pino';
import type { Request } from 'express';
import 'dotenv/config';

const isDev = process.env.NODE_ENV === 'development';

const pinoOptions: LoggerOptions = {
  level: process.env.LOG_LEVEL || 'debug',
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
    remove: true,
  },
  serializers: {
    req: (req: Request) => {
      const serialized = pino.stdSerializers.req(req);

      if (req.body) {
        return { ...serialized, body: req.body };
      }

      return serialized;
    },
    res: pino.stdSerializers.res,
    err: pino.stdSerializers.err,
  },
};

if (isDev) {
  pinoOptions.transport = {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid',
    },
  };
}

export const logger = pino(pinoOptions);
