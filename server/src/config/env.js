import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env
dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid connection URL"),
  REDIS_URL: z.string().url("REDIS_URL must be a valid URL"),
  QDRANT_URL: z.string().url("QDRANT_URL must be a valid URL"),
  QDRANT_API_KEY: z.string().optional().default(""),
  GROQ_API_KEY: z.string().min(1, "GROQ_API_KEY is required"),
  GITHUB_TOKEN: z.string().optional().default(""),
  GITHUB_CLIENT_ID: z.string().optional().default(""),
  GITHUB_CLIENT_SECRET: z.string().optional().default(""),
  GITHUB_WEBHOOK_SECRET: z.string().default("your_webhook_secret_here"),
  LANGFUSE_PUBLIC_KEY: z.string().optional().default(""),
  LANGFUSE_SECRET_KEY: z.string().optional().default(""),
  LANGFUSE_HOST: z.string().url().default("https://cloud.langfuse.com"),
  JWT_SECRET: z.string().min(8, "JWT_SECRET must be at least 8 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('debug')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("[env] Environment validation failed:");
  console.error(JSON.stringify(parsed.error.format(), null, 2));
  process.exit(1);
}

export const env = parsed.data;
