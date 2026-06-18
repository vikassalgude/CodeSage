import { encoding_for_model } from 'tiktoken';

let encoder = null;

/**
 * Lazily initializes and returns the tiktoken encoder for GPT-4o.
 * @returns {Tiktoken} The encoder instance.
 */
function getEncoder() {
  if (!encoder) {
    encoder = encoding_for_model('gpt-4o');
  }
  return encoder;
}

/**
 * Counts the number of tokens in a string using the GPT-4o tokenizer.
 * @param {string} text - The text to count tokens for.
 * @returns {number} The token count.
 */
export function countTokens(text) {
  return getEncoder().encode(text).length;
}

/**
 * Trims an array of context chunks to fit within a token budget.
 * Returns as many chunks as possible without exceeding the limit.
 * @param {Array<{content: string}>} chunks - The retrieved chunks.
 * @param {number} maxTokens - The maximum token budget (default: 12000).
 * @returns {Array} The trimmed array of chunks.
 */
export function trimToTokenBudget(chunks, maxTokens = 12000) {
  const result = [];
  let totalTokens = 0;

  for (const chunk of chunks) {
    const chunkTokens = countTokens(chunk.content);
    if (totalTokens + chunkTokens > maxTokens) break;
    totalTokens += chunkTokens;
    result.push(chunk);
  }

  return result;
}
