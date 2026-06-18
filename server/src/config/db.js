import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';

// Instantiate database clients
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
});

export const redis = new Redis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null // Required by BullMQ
});

// Handle connection events
redis.on('connect', () => {
  console.log('[redis] Redis connected successfully');
});

redis.on('error', (err) => {
  console.error('[redis] Redis connection error:', err);
});
