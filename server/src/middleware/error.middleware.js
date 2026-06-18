import { logger } from '../utils/logger.js';

/**
 * Global Express Error Handling Middleware.
 */
export function errorHandler(err, req, res, next) {
  logger.error({
    msg: err.message || 'Express Route Error',
    stack: err.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    body: req.body
  });

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      // Only attach stack trace in development
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}
