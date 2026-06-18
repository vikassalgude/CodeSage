import { qdrant } from '../config/qdrant.js';
import { prisma } from '../config/db.js';
import { fetchFileContent, detectLanguage } from './github.service.js';
import { chunkFile } from './chunker.service.js';
import { embedAndStore } from './embedder.service.js';
import { logger } from '../utils/logger.js';

/**
 * Performs delta re-indexing for a list of changed/removed files.
 * Deletes stale vector points and PostgreSQL metadata, then refetches
 * and re-indexes modified/new files.
 * 
 * @param {string} repoId - The repository ID.
 * @param {string} repoUrl - The public GitHub URL.
 * @param {Array<{path: string, action: 'upsert'|'delete'}>} files - Array of files to sync.
 */
export async function deltaReindex(repoId, repoUrl, files) {
  const collectionName = `repo_${repoId}`;
  logger.info(`[reindex] Starting delta re-index for repo ${repoId} (${files.length} files to process)`);

  for (const file of files) {
    const { path: filePath, action } = file;
    logger.info(`[reindex] Syncing file ${filePath} with action: ${action}`);

    try {
      // 1. Delete old Qdrant points for this file
      await qdrant.delete(collectionName, {
        filter: {
          must: [
            {
              key: 'filePath',
              match: {
                value: filePath
              }
            }
          ]
        }
      });

      // 2. Delete old chunks from PostgreSQL
      await prisma.chunk.deleteMany({
        where: {
          repoId,
          filePath
        }
      });

      // 3. If the action is upsert, fetch content and re-index
      if (action === 'upsert') {
        const content = await fetchFileContent(repoUrl, filePath);
        
        const chunks = chunkFile({
          path: filePath,
          content,
          language: detectLanguage(filePath)
        });

        if (chunks.length > 0) {
          await embedAndStore(repoId, chunks);
          logger.info(`[reindex] Successfully re-indexed file ${filePath} (${chunks.length} chunks)`);
        } else {
          logger.warn(`[reindex] File ${filePath} generated 0 chunks (empty or ignored file type)`);
        }
      } else {
        logger.info(`[reindex] Cleaned up references for deleted file ${filePath}`);
      }
    } catch (err) {
      logger.error(`[reindex] Failed syncing file ${filePath}:`, err);
    }
  }

  // Update repository chunk count in PostgreSQL
  try {
    const count = await prisma.chunk.count({
      where: { repoId }
    });
    await prisma.repo.update({
      where: { id: repoId },
      data: { chunkCount: count }
    });
    logger.info(`[reindex] Finished delta sync. New chunk count for repo: ${count}`);
  } catch (dbErr) {
    logger.error(`[reindex] Failed updating repository chunk count:`, dbErr);
  }
}
