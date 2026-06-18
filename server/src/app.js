import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { errorHandler } from './middleware/error.middleware.js';
import repoRoutes from './routes/repo.routes.js';
import queryRoutes from './routes/query.routes.js';
import webhookRoutes from './routes/webhook.routes.js';
import authRoutes from './routes/auth.routes.js';
import { logger } from './utils/logger.js';

const app = express();

// Apply security headers
app.use(helmet());

// Configure CORS
app.use(cors({
  origin: [
    'http://localhost:5173', 
    'https://code-sage-ruddy-theta.vercel.app'
  ], // Restrict to front-end domain in production if needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Apply body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Custom Request Logging Middleware
app.use((req, res, next) => {
  logger.info({ 
    msg: `Incoming Request: ${req.method} ${req.url}`,
    ip: req.ip,
    userAgent: req.headers['user-agent']
  });
  next();
});

// API Routes
app.use('/api/repos', repoRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/auth', authRoutes);

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Global fallback for undefined routes (triggers error handler)
app.use((req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

// Register global error handler (must be last middleware)
app.use(errorHandler);

export default app;
