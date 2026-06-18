import { QdrantClient } from '@qdrant/js-client-rest';

const qdrantConfig = {
  url: process.env.QDRANT_URL,
};

// Use Qdrant Cloud API Key if configured
if (process.env.QDRANT_API_KEY) {
  qdrantConfig.apiKey = process.env.QDRANT_API_KEY;
}

export const qdrant = new QdrantClient(qdrantConfig);

/**
 * Ensures a Qdrant collection exists for a given repository.
 * Configured for Hybrid Dense (1,536 dim) + Sparse (BM25) search.
 * @param {string} repoId - The repository ID.
 * @returns {Promise<string>} The collection name.
 */
export async function ensureCollection(repoId) {
  const collectionName = `repo_${repoId}`;
  try {
    const exists = await qdrant.collectionExists(collectionName);
    if (!exists.exists) {
      console.log(`[qdrant] Collection '${collectionName}' not found. Provisioning...`);
      await qdrant.createCollection(collectionName, {
        vectors: { 
          size: 384, 
          distance: 'Cosine' 
        },
        sparse_vectors: { 
          bm25: { 
            modifier: 'idf' 
          } 
        }
      });
      console.log(`[qdrant] Collection '${collectionName}' created successfully.`);
    }
    return collectionName;
  } catch (error) {
    console.error(`[qdrant] Failed to verify or create collection '${collectionName}':`, error);
    throw error;
  }
}
