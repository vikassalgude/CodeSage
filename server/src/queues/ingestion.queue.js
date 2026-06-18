import { Queue } from 'bullmq';
import { redis } from '../config/db.js';

// Initialize the BullMQ ingestion queue
export const ingestionQueue = new Queue('ingestion', { 
  connection: redis 
});

/**
 * Adds an repository ingestion job to the BullMQ queue.
 * @param {string} repoId - The repository database ID.
 * @param {string} repoUrl - The public GitHub URL of the repository.
 * @returns {Promise<Job>} The published job instance.
 */
export async function addIngestionJob(repoId, repoUrl) {
  return await ingestionQueue.add(
    'ingest-repo', 
    { repoId, repoUrl }, 
    {
      attempts: 3, // Retry up to 3 times on failure
      backoff: { 
        type: 'exponential', 
        delay: 5000 // Wait 5s, then 10s, then 20s...
      },
      removeOnComplete: { age: 24 * 3600 }, // Keep completed jobs for 24h
      removeOnFail: { age: 7 * 24 * 3600 } // Keep failed jobs for 7 days
    }
  );
}
