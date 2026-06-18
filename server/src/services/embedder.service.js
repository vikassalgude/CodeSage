import { pipeline } from '@xenova/transformers';
import crypto from 'crypto';
import { qdrant, ensureCollection } from '../config/qdrant.js';
import { prisma } from '../config/db.js';
import { mapLanguageToEnum } from '../utils/enumNormalizer.js';

let embedder = null;

async function getEmbedder() {
  if (!embedder) {
    console.log('[embedder] Loading local embedding model (first run ~1 min download)...');
    embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    console.log('[embedder] Local embedding model ready.');
  }
  return embedder;
}

export async function embedAndStore(repoId, chunks) {
  if (!chunks || chunks.length === 0) {
    console.log('[embedder] No chunks provided.');
    return;
  }

  const collectionName = await ensureCollection(repoId);
  const embed = await getEmbedder();
  const BATCH_SIZE = 50;

  console.log(`[embedder] Starting pipeline for '${repoId}' with ${chunks.length} chunks...`);

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);
    try {
      const embedResults = await Promise.all(
        batch.map(async chunk => {
          const output = await embed(chunk.content, { 
            pooling: 'mean', 
            normalize: true 
          });
          return Array.from(output.data);
        })
      );

      const points = batch.map((chunk, idx) => ({
        id: crypto.randomUUID(),
        vector: embedResults[idx],
        payload: {
          repoId,
          filePath: chunk.filePath,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          language: chunk.language || 'unknown',
          content: chunk.content,
          type: chunk.type || 'block',
        }
      }));

      await qdrant.upsert(collectionName, { points });

      await prisma.chunk.createMany({
        data: batch.map((chunk, idx) => ({
          repoId,
          filePath: chunk.filePath,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          language: mapLanguageToEnum(chunk.language),
          qdrantId: points[idx].id,
        }))
      });

      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(chunks.length / BATCH_SIZE);
      console.log(`[embedder] Batch ${batchNum}/${totalBatches} done`);

    } catch (err) {
      console.error(`[embedder] Batch failed at index ${i}:`, err.message);
      throw err;
    }
  }
  console.log(`[embedder] Finished indexing repo '${repoId}'.`);
}

export async function embedQuery(queryText) {
  const embed = await getEmbedder();
  const output = await embed(queryText, { 
    pooling: 'mean', 
    normalize: true 
  });
  return Array.from(output.data);
}