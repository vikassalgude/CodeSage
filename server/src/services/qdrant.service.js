import { qdrant } from '../config/qdrant.js';
import { embedQuery } from './embedder.service.js';

function cosineSimilarity(a, b) {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function mmrRerank(queryVector, candidates, topK = 5, lambda = 0.7) {
  const selected = [];
  const remaining = [...candidates];

  while (selected.length < topK && remaining.length > 0) {
    let bestIdx = -1;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const candidate = remaining[i];
      const relevance = cosineSimilarity(queryVector, candidate.vector);

      let maxSimilarity = 0;
      for (const sel of selected) {
        const sim = cosineSimilarity(candidate.vector, sel.vector);
        if (sim > maxSimilarity) maxSimilarity = sim;
      }

      const mmrScore = lambda * relevance - (1 - lambda) * maxSimilarity;
      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIdx = i;
      }
    }

    if (bestIdx >= 0) {
      selected.push(remaining.splice(bestIdx, 1)[0]);
    }
  }
  return selected;
}

export async function searchCodebase(repoId, query, topK = 5) {
  const collectionName = `repo_${repoId}`;

  // Now uses Xenova local embeddings via embedder.service.js
  const queryVector = await embedQuery(query);
  const candidateCount = topK * 4;

  const searchResult = await qdrant.search(collectionName, {
    vector: queryVector,
    limit: candidateCount,
    with_payload: true,
    with_vector: true
  });

  if (!searchResult || searchResult.length === 0) return [];

  const reranked = mmrRerank(queryVector, searchResult, topK);

  return reranked.map(result => ({
    content: result.payload.content,
    filePath: result.payload.filePath,
    startLine: result.payload.startLine,
    endLine: result.payload.endLine,
    language: result.payload.language,
    sourceType: result.payload.sourceType || 'code',
    score: result.score
  }));
}