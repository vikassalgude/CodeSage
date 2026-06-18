import { Queue } from 'bullmq';
import { redis } from '../config/db.js';

// Initialize the BullMQ reindex queue
export const reindexQueue = new Queue('reindex', { 
  connection: redis 
});

/**
 * Adds a delta reindexing job to the BullMQ queue.
 * @param {string} repoId - The repository database ID.
 * @param {string} repoUrl - The public GitHub URL of the repository.
 * @param {string[]} changedFiles - List of changed/modified/added file paths.
 * @returns {Promise<Job>} The published job instance.
 */
export async function addReindexJob(repoId, repoUrl, changedFiles) {
  return await reindexQueue.add(
    'reindex-repo', 
    { repoId, repoUrl, changedFiles }, 
    {
      attempts: 3,
      backoff: { 
        type: 'exponential', 
        delay: 5000 
      },
      removeOnComplete: { age: 24 * 3600 },
      removeOnFail: { age: 7 * 24 * 3600 }
    }
  );
}
