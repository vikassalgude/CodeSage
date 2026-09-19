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
    const repoRecord = await prisma.repo.findUnique({ where: { id: repoId }, include: { user: true } });
    const userToken = repoRecord?.user?.githubToken;
    const files = await fetchRepoFiles(repoUrl, userToken);
    logger.info(`Ingestion Worker [${repoId}]: Successfully fetched ${files.length} files.`);

    // Step 2: Batched file processing & embeddings
    const FILE_BATCH_SIZE = 15;
    let processedFilesCount = 0;
    let totalChunksCount = 0;

    // Set initial totals in DB
    await prisma.repo.update({
      where: { id: repoId },
      data: {
        status: 'INDEXING',
        totalFiles: files.length,
        processedFiles: 0,
        chunkCount: 0
      }
    });

    logger.info(`Ingestion Worker [${repoId}]: Starting batched file processing in chunks of ${FILE_BATCH_SIZE}...`);

    for (let i = 0; i < files.length; i += FILE_BATCH_SIZE) {
      const batchFiles = files.slice(i, i + FILE_BATCH_SIZE);
      const batchIndex = Math.floor(i / FILE_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / FILE_BATCH_SIZE);

      logger.info(`Ingestion Worker [${repoId}]: Processing batch ${batchIndex}/${totalBatches} (${batchFiles.length} files)...`);

      // Generate chunks for only the files in this batch
      const batchChunks = batchFiles.flatMap(file => 
        chunkFile({
          path: file.path,
          content: file.content,
          language: detectLanguage(file.path),
          type: file.type,
          subType: file.subType
        })
      );

      if (batchChunks.length > 0) {
        logger.info(`Ingestion Worker [${repoId}]: Generating embeddings & upserting ${batchChunks.length} vectors...`);
        await embedAndStore(repoId, batchChunks);
        totalChunksCount += batchChunks.length;
      }

      processedFilesCount += batchFiles.length;

      // Update progress in DB. Make repo usable (PARTIALLY_READY) after the first batch is completed!
      const status = (i === 0) ? 'PARTIALLY_READY' : undefined;
      await prisma.repo.update({
        where: { id: repoId },
        data: {
          processedFiles: processedFilesCount,
          chunkCount: totalChunksCount,
          ...(status ? { status } : {})
        }
      });

      // Update job progress
      const progress = Math.min(100, Math.round((processedFilesCount / files.length) * 100));
      await job.updateProgress(progress);
      logger.info(`Ingestion Worker [${repoId}]: Progress: ${progress}% (${processedFilesCount}/${files.length} files indexed)`);
    }

    // Step 3: Final status update to READY
    logger.info(`Ingestion Worker [${repoId}]: Finalizing repository status...`);
    await prisma.repo.update({
      where: { id: repoId },
      data: {
        status: 'READY',
        processedFiles: files.length
      }
    });

    await job.updateProgress(100);
    logger.info(`Ingestion Worker: Ingestion complete for repo ID: ${repoId}. ${totalChunksCount} total chunks indexed.`);
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
  concurrency: 1 // Concurrency limit of 1 to prevent CPU/memory spikes during heavy local embeddings
});

ingestionWorker.on('failed', (job, err) => {
  logger.error(`Job ${job?.id} failed:`, err);
});

ingestionWorker.on('completed', (job) => {
  logger.info(`Job ${job?.id} completed successfully.`);
});
