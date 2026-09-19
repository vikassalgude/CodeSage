import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import TypeScriptPkg from 'tree-sitter-typescript';
import { countTokens } from '../utils/tokenCounter.js';

const { typescript: TypeScript, tsx: TSX } = TypeScriptPkg;

// Map file languages to their corresponding Tree-sitter parsers
const PARSERS = { 
  javascript: JavaScript,
  jsx: JavaScript,
  python: Python,
  typescript: TypeScript,
  tsx: TSX
};

// Target AST node types for codebase RAG chunking
const CHUNK_NODES = [
  'function_declaration', 
  'arrow_function', 
  'method_definition',
  'class_declaration', 
  'export_statement'
];

/**
 * Splits a source file into logical semantic chunks using Tree-sitter AST,
 * falling back to line-based chunking if the language is not supported.
 * @param {{path: string, content: string, language: string, type: string, subType: string}} file - The file object
 * @returns {Array<{content: string, filePath: string, startLine: number, endLine: number, language: string, type: string, sourceType: string}>} Array of chunks
 */
export function chunkFile({ path, content, language, type, subType }) {
  // If it's classified as documentation/plain_text, use our documentation chunker
  if (type === 'documentation' || subType === 'plain_text') {
    const chunks = documentChunk(path, content, language);
    return chunks.map(c => ({
      ...c,
      sourceType: 'documentation'
    }));
  }

  const parser = new Parser();
  const lang = PARSERS[language];

  // Fallback: if language is not supported, use line-based chunking
  if (!lang) {
    const chunks = lineChunk(path, content, language);
    return chunks.map(c => ({
      ...c,
      sourceType: 'code'
    }));
  }

  try {
    parser.setLanguage(lang);
    const tree = parser.parse(content);
    const lines = content.split('\n');
    const chunks = [];

    // Recursive function to traverse the AST nodes
    function walk(node) {
      if (CHUNK_NODES.includes(node.type)) {
        const startLine = node.startPosition.row;
        const endLine = node.endPosition.row;

        // Grab 3 lines of context before the node to capture docstrings/decorators/comments
        const overlapStart = Math.max(0, startLine - 3);
        const chunkContent = lines.slice(overlapStart, endLine + 1).join('\n');

        // Skip empty or tiny helper functions/definitions
        if (chunkContent.trim().length > 20) {
          chunks.push({
            content: chunkContent,
            filePath: path,
            startLine: overlapStart,
            endLine,
            language,
            type: node.type,
            sourceType: 'code'
          });
        }
        // Return early to avoid indexing duplicate nested functions within the same block
        return;
      }

      for (const child of node.children) {
        walk(child);
      }
    }

    walk(tree.rootNode);

    // If walk didn't find any code chunks but the file has content, run fallback chunker
    if (chunks.length === 0 && content.trim().length > 0) {
      const lineChunks = lineChunk(path, content, language);
      return lineChunks.map(c => ({
        ...c,
        sourceType: 'code'
      }));
    }

    return chunks;
  } catch (error) {
    console.error(`[ast] Failed parsing ${path}, falling back to line chunking:`, error.message);
    const lineChunks = lineChunk(path, content, language);
    return lineChunks.map(c => ({
      ...c,
      sourceType: 'code'
    }));
  }
}

/**
 * Paragraph-based sliding token window chunker for plain-text / documentation.
 * @param {string} path - File path
 * @param {string} content - File content
 * @param {string} language - File language
 * @param {number} maxTokens - Maximum tokens per chunk (default: 300)
 * @returns {Array} Array of chunks
 */
export function documentChunk(path, content, language = 'markdown', maxTokens = 300) {
  const paragraphs = content.split(/\n\n+/);
  const chunks = [];
  const lines = content.split('\n');

  let currentParagraphs = [];
  let currentTokenCount = 0;

  function findLineNumber(snippet) {
    if (!snippet) return 1;
    const snippetLines = snippet.split('\n');
    const firstLine = snippetLines[0]?.trim();
    if (!firstLine) return 1;
    const idx = lines.findIndex(l => l.includes(firstLine));
    return idx !== -1 ? idx : 0; // 0-indexed as usual in lineChunk
  }

  for (let i = 0; i < paragraphs.length; i++) {
    const para = paragraphs[i];
    const paraTokens = countTokens(para);

    // If a single paragraph is too large, we chunk it by sliding word windows
    if (paraTokens > maxTokens) {
      if (currentParagraphs.length > 0) {
        const chunkText = currentParagraphs.join('\n\n');
        chunks.push({
          content: chunkText,
          filePath: path,
          startLine: findLineNumber(currentParagraphs[0]),
          endLine: findLineNumber(currentParagraphs[currentParagraphs.length - 1]) + currentParagraphs[currentParagraphs.length - 1].split('\n').length - 1,
          language,
          type: 'document_block'
        });
        currentParagraphs = [];
        currentTokenCount = 0;
      }

      const words = para.split(/\s+/);
      let wordGroup = [];
      
      for (const word of words) {
        wordGroup.push(word);
        const text = wordGroup.join(' ');
        if (countTokens(text) >= maxTokens) {
          const chunkText = wordGroup.join(' ');
          chunks.push({
            content: chunkText,
            filePath: path,
            startLine: findLineNumber(chunkText),
            endLine: findLineNumber(chunkText) + chunkText.split('\n').length - 1,
            language,
            type: 'document_block'
          });
          // Slide window with 25% overlap
          const overlapCount = Math.floor(wordGroup.length / 4);
          wordGroup = wordGroup.slice(wordGroup.length - overlapCount);
        }
      }
      if (wordGroup.length > 0) {
        const chunkText = wordGroup.join(' ');
        chunks.push({
          content: chunkText,
          filePath: path,
          startLine: findLineNumber(chunkText),
          endLine: findLineNumber(chunkText) + chunkText.split('\n').length - 1,
          language,
          type: 'document_block'
        });
      }
      continue;
    }

    if (currentTokenCount + paraTokens > maxTokens && currentParagraphs.length > 0) {
      const chunkText = currentParagraphs.join('\n\n');
      chunks.push({
        content: chunkText,
        filePath: path,
        startLine: findLineNumber(currentParagraphs[0]),
        endLine: findLineNumber(currentParagraphs[currentParagraphs.length - 1]) + currentParagraphs[currentParagraphs.length - 1].split('\n').length - 1,
        language,
        type: 'document_block'
      });
      // Keep last paragraph for context overlap
      const lastPara = currentParagraphs[currentParagraphs.length - 1];
      currentParagraphs = [lastPara, para];
      currentTokenCount = countTokens(lastPara) + paraTokens;
    } else {
      currentParagraphs.push(para);
      currentTokenCount += paraTokens;
    }
  }

  if (currentParagraphs.length > 0) {
    const chunkText = currentParagraphs.join('\n\n');
    chunks.push({
      content: chunkText,
      filePath: path,
      startLine: findLineNumber(currentParagraphs[0]),
      endLine: findLineNumber(currentParagraphs[currentParagraphs.length - 1]) + currentParagraphs[currentParagraphs.length - 1].split('\n').length - 1,
      language,
      type: 'document_block'
    });
  }

  return chunks;
}

/**
 * Fallback line-based chunking with sliding overlap window.
 */
function lineChunk(path, content, language = 'unknown', size = 60, overlap = 10) {
  const lines = content.split('\n');
  const chunks = [];
  const step = Math.max(1, size - overlap);

  for (let i = 0; i < lines.length; i += step) {
    const slice = lines.slice(i, i + size);
    const chunkContent = slice.join('\n');

    if (chunkContent.trim().length > 0) {
      chunks.push({
        content: chunkContent,
        filePath: path,
        startLine: i,
        endLine: Math.min(lines.length - 1, i + slice.length - 1),
        language,
        type: 'line'
      });
    }
  }
  return chunks;
}
