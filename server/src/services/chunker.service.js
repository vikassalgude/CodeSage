import Parser from 'tree-sitter';
import JavaScript from 'tree-sitter-javascript';
import Python from 'tree-sitter-python';
import TypeScriptPkg from 'tree-sitter-typescript';

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
 * @param {{path: string, content: string, language: string}} file - The file object
 * @returns {Array<{content: string, filePath: string, startLine: number, endLine: number, language: string, type: string}>} Array of chunks
 */
export function chunkFile({ path, content, language }) {
  const parser = new Parser();
  const lang = PARSERS[language];

  // Fallback: if language is not supported, use line-based chunking
  if (!lang) {
    return lineChunk(path, content, language);
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
            type: node.type
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
      return lineChunk(path, content, language);
    }

    return chunks;
  } catch (error) {
    console.error(`[ast] Failed parsing ${path}, falling back to line chunking:`, error.message);
    return lineChunk(path, content, language);
  }
}

/**
 * Fallback line-based chunking with sliding overlap window.
 * @param {string} path - File path
 * @param {string} content - File content
 * @param {string} language - File language
 * @param {number} size - Lines per chunk
 * @param {number} overlap - Overlapping lines between consecutive chunks
 * @returns {Array} Array of chunks
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
