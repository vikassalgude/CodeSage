import { Langfuse } from 'langfuse';
import { logger } from './logger.js';

const isConfigured = 
  process.env.LANGFUSE_PUBLIC_KEY && 
  process.env.LANGFUSE_SECRET_KEY &&
  !process.env.LANGFUSE_PUBLIC_KEY.startsWith('pk-lf-your') &&
  !process.env.LANGFUSE_SECRET_KEY.startsWith('sk-lf-your') &&
  process.env.LANGFUSE_PUBLIC_KEY.trim() !== '' &&
  process.env.LANGFUSE_SECRET_KEY.trim() !== '';

export const langfuse = isConfigured 
  ? new Langfuse({
      publicKey: process.env.LANGFUSE_PUBLIC_KEY,
      secretKey: process.env.LANGFUSE_SECRET_KEY,
      baseUrl: process.env.LANGFUSE_HOST || 'https://cloud.langfuse.com'
    })
  : null;

if (!isConfigured) {
  logger.info('Langfuse: Observability tracing is disabled (keys are missing or placeholders)');
} else {
  logger.info('Langfuse: Observability tracing initialized successfully');
}

/**
 * Executes a function inside a Langfuse trace block, if configured.
 * Otherwise, runs the block natively without tracing.
 * 
 * @param {Object} options - Trace creation metadata
 * @param {string} options.name - Trace name
 * @param {any} options.input - Initial input payload
 * @param {string} options.userId - Unique ID of the authenticated user
 * @param {function} fn - The RAG pipeline execution logic callback
 */
export async function withTrace({ name, input, userId }, fn) {
  if (!langfuse) {
    // Return empty trace context so calls to span/generation do not crash
    const mockTrace = {
      span: () => ({ end: () => {} }),
      generation: () => ({ end: () => {} }),
      update: () => {},
      id: null
    };
    return await fn(mockTrace);
  }

  const trace = langfuse.trace({
    name,
    input,
    userId
  });

  try {
    const result = await fn(trace);
    trace.update({ output: result });
    return result;
  } catch (error) {
    trace.update({ 
      output: { error: error.message, stack: error.stack }
    });
    throw error;
  } finally {
    // Flush to send traces immediately in server environments
    await langfuse.shutdownAsync();
  }
}
