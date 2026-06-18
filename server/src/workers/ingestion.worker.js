import { Worker } from 'bullmq';
import { redis, prisma } from '../config/db.js';
import { fetchRepoFiles, detectLanguage } from '../services/github.service.js';
import { chunkFile } from '../services/chunker.service.js';
import { embedAndStore } from '../services/embedder.service.js';
import { logger } from '../utils/logger.js';

// Instantiate and configure the BullMQ background worker
export const ingestionWorker = new Worker('ingestion', async (job) => {
  const { repoId, repoUrl } = job.data;
  logger.info(`Ingestion Worker: Starting ingestion for repo ID: ${repoId} (${repoUrl})`);

  try {
    // Step 1: Fetch files from GitHub
    logger.info(`Ingestion Worker [${repoId}]: Fetching repository files...`);
    await job.updateProgress(10);
    const files = await fetchRepoFiles(repoUrl);
    logger.info(`Ingestion Worker [${repoId}]: Successfully fetched ${files.length} files.`);

    // Step 2: AST Chunking
    logger.info(`Ingestion Worker [${repoId}]: Performing syntax-aware AST chunking...`);
    await job.updateProgress(30);
    
    // Fix: Dynamically detect and attach the language property to each file before chunking
    const allChunks = files.flatMap(file => 
      chunkFile({
        path: file.path,
        content: file.content,
        language: detectLanguage(file.path)
      })
    );
    logger.info(`Ingestion Worker [${repoId}]: Created ${allChunks.length} chunks from ${files.length} files.`);

    // Step 3: Embed & Store (OpenAI -> Qdrant + PostgreSQL)
    logger.info(`Ingestion Worker [${repoId}]: Generating embeddings & upserting vectors...`);
    await job.updateProgress(50);
    await embedAndStore(repoId, allChunks);

    // Step 4: Update Repository Status in PostgreSQL
    logger.info(`Ingestion Worker [${repoId}]: Updating repository relational status...`);
    await prisma.repo.update({
      where: { id: repoId },
      data: { 
        status: 'READY', 
        chunkCount: allChunks.length 
      }
    });

    await job.updateProgress(100);
    logger.info(`Ingestion Worker: Ingestion complete for repo ID: ${repoId}. ${allChunks.length} chunks indexed.`);
  } catch (err) {
    logger.error(`Ingestion Worker [${repoId}]: Failed processing job:`, err);
    
    // Mark repo status as failed so users are notified in the UI
    try {
      await prisma.repo.update({
        where: { id: repoId },
        data: { status: 'FAILED' }
      });
    } catch (dbErr) {
      logger.error(`Ingestion Worker [${repoId}]: Failed updating failure status in DB:`, dbErr);
    }
    
    throw err; // Propagate error back to BullMQ for retry scheduling
  }
}, { 
  connection: redis, 
  concurrency: 2 // Allow processing up to 2 repo ingestions in parallel
});

ingestionWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

ingestionWorker.on('completed', (job) => {
  logger.info(`Job ${job?.id} completed successfully.`);
});
