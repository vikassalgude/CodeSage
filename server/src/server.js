import app from './app.js';
import { env } from './config/env.js';
import { prisma, redis } from './config/db.js';
import { logger } from './utils/logger.js';

const PORT = env.PORT || 3000;

const server = app.listen(PORT, () => {
  logger.info(`CodeSage API Server running on port ${PORT} in ${env.NODE_ENV} mode`);
});

/**
 * Handles graceful shutdown of all active server connections.
 * @param {string} signal - The OS signal received.
 */
async function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);

  // Terminate Express incoming connections first
  server.close(() => {
    logger.info('Express HTTP server closed.');
  });

  try {
    // Terminate Prisma / PostgreSQL Client
    await prisma.$disconnect();
    logger.info('PostgreSQL connection closed via Prisma.');

    // Terminate Redis Client
    await redis.quit();
    logger.info('Redis connection closed.');

    logger.info('Graceful shutdown completed. Exiting process.');
    process.exit(0);
  } catch (err) {
    logger.error('Error during graceful shutdown:', err);
    process.exit(1);
  }
}

// OS signals listeners
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Catch-all safety listeners for unhandled errors
process.on('unhandledRejection', (reason, promise) => {
  logger.fatal({ msg: 'Unhandled Rejection at Promise', promise, reason });
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.fatal({ msg: 'Uncaught Exception thrown', error });
  process.exit(1);
});
