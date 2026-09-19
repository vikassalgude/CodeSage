import { Worker } from 'bullmq';
import { redis } from '../config/db.js';
import { deltaReindex } from '../services/reindex.service.js';
import { logger } from '../utils/logger.js';

// Instantiate and configure the BullMQ background worker for delta reindexing
export const reindexWorker = new Worker('reindex', async (job) => {
  const { repoId, repoUrl, changedFiles } = job.data;
  logger.info(`Reindex Worker: Starting delta re-index for repo ID: ${repoId} (${repoUrl})`);

  try {
    await job.updateProgress(10);
    await deltaReindex(repoId, repoUrl, changedFiles);
    await job.updateProgress(100);
    logger.info(`Reindex Worker: Delta re-indexing complete for repo ID: ${repoId}`);
  } catch (err) {
    logger.error(`Reindex Worker [${repoId}]: Failed processing job:`, err);
    throw err; // Propagate error back to BullMQ for retry scheduling
  }
}, {
  connection: redis,
  concurrency: 1 // Process up to 1 re-index jobs in parallel
});

reindexWorker.on('failed', (job, err) => {
  logger.error(`Reindex Job ${job?.id} failed:`, err);
});

reindexWorker.on('completed', (job) => {
  logger.info(`Reindex Job ${job?.id} completed successfully.`);
});
