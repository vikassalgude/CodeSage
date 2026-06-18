import { redis } from '../config/db.js';

/**
 * Sliding window rate limiter for queries.
 * Restricts the number of queries a user can make in a 24-hour period.
 * Uses Redis increment and expiration.
 */
export function queryRateLimit(maxPerDay = 50) {
  return async (req, res, next) => {
    try {
      const key = `ratelimit:query:${req.user.id}`;
      const count = await redis.incr(key);
      
      if (count === 1) {
        await redis.expire(key, 86400); // 24-hour TTL (in seconds)
      }
      
      if (count > maxPerDay) {
        return res.status(429).json({
          error: {
            message: 'Daily query limit reached. Upgrade to Pro.'
          }
        });
      }
      
      next();
    } catch (error) {
      next(error);
    }
  };
}
