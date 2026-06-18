import pino from 'pino';

// Configure logging level and pretty-printing for development
export const logger = pino({
  level: process.env.LOG_LEVEL || 'debug',
  transport: process.env.NODE_ENV === 'development' ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      ignore: 'pid,hostname',
      translateTime: 'SYS:standard'
    }
  } : undefined
});
