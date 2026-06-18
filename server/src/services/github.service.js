import { Octokit } from '@octokit/rest';
import path from 'path';

const githubToken = process.env.GITHUB_TOKEN;
const isPlaceholder = !githubToken || githubToken === 'ghp_...' || githubToken.startsWith('ghp_your');

const octokit = new Octokit({ 
  auth: isPlaceholder ? undefined : githubToken 
});

if (isPlaceholder) {
  console.warn("[github] Using unauthenticated API client. Rate limit is capped at 60 requests/hour.");
}

/**
 * Parses owner and repository name from a GitHub URL.
 * Supports trailing slashes and .git extensions.
 * @param {string} repoUrl - The GitHub URL (e.g. https://github.com/expressjs/express)
 * @returns {{owner: string, repo: string}} parsed owner and repo name
 */
export function parseGithubUrl(repoUrl) {
  const cleanUrl = repoUrl.trim().replace(/\/$/, '').replace(/\.git$/, '');
  const match = cleanUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) {
    throw new Error('Invalid GitHub repository URL. Must be in the format: https://github.com/owner/repo');
  }
  return { 
    owner: match[1], 
    repo: match[2] 
  };
}

/**
 * Recursively fetches all code files from a GitHub repository.
 * Filters files by extension and limits size to avoid fetching large blobs.
 * Fetching is batched to prevent rate limiting.
 * @param {string} repoUrl - The GitHub URL.
 * @returns {Promise<Array<{path: string, content: string, size: number}>>} Array of file objects
 */
export async function fetchRepoFiles(repoUrl) {
  const { owner, repo } = parseGithubUrl(repoUrl);

  // 1. Get the repository's default branch
  const { data: repoData } = await octokit.repos.get({ owner, repo });
  const branch = repoData.default_branch;

  // 2. Fetch the entire git tree recursively (one API call)
  const { data: treeData } = await octokit.git.getTree({
    owner,
    repo,
    tree_sha: branch,
    recursive: '1'
  });

  const CODE_EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py', '.go', '.java', '.rs'];

  // 3. Filter for files that are blobs, match code extensions, and are under 100KB
  const filesToFetch = treeData.tree.filter(f =>
    f.type === 'blob' &&
    CODE_EXTS.some(ext => f.path.endsWith(ext)) &&
    f.size < 100000 // Skip files > 100KB
  );

  const MAX_FILES = 300;
  if (filesToFetch.length > MAX_FILES) {
    throw new Error(`Repository contains too many code files (${filesToFetch.length}). The free tier limit is ${MAX_FILES} files.`);
  }

  console.log(`[github] Found ${filesToFetch.length} matching code files in ${owner}/${repo}. Fetching content...`);

  const results = [];
  const BATCH_SIZE = 20;

  // 4. Fetch content in parallel batches of 20 to avoid API rate limit bottlenecks
  for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
    const batch = filesToFetch.slice(i, i + BATCH_SIZE);
    
    const contents = await Promise.all(batch.map(async (file) => {
      try {
        const { data } = await octokit.git.getBlob({
          owner,
          repo,
          file_sha: file.sha
        });
        
        // Decode base64 file content returned by GitHub API
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return {
          path: file.path,
          content,
          size: file.size
        };
      } catch (err) {
        console.error(`[github] Failed to fetch file ${file.path}:`, err.message);
        return null; // Return null so we can filter out failed fetches
      }
    }));

    // Add successfully fetched files to results
    results.push(...contents.filter(Boolean));
  }

  return results;
}

/**
 * Detects programming language based on file extension.
 * @param {string} filePath - Path to the file
 * @returns {string} The detected language name
 */
export function detectLanguage(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.py': 'python',
    '.go': 'golang',
    '.java': 'java',
    '.rs': 'rust'
  };
  return map[ext] || 'unknown';
}

/**
 * Fetches basic repository metadata from the GitHub API.
 * @param {string} repoUrl - The GitHub URL.
 * @returns {Promise<{name: string, language: string|null, commitSha: string|null}>}
 */
export async function getRepoDetails(repoUrl) {
  const { owner, repo } = parseGithubUrl(repoUrl);
  const { data } = await octokit.repos.get({ owner, repo });

  // Get the latest commit SHA on the default branch
  let commitSha = null;
  try {
    const { data: branchData } = await octokit.repos.getBranch({
      owner, repo, branch: data.default_branch
    });
    commitSha = branchData.commit.sha;
  } catch (_) { /* non-fatal */ }

  return {
    name: data.full_name,
    language: data.language || null,
    commitSha,
    size: data.size // size in KB
  };
}

/**
 * Fetches the content of a specific file in the repository.
 * @param {string} repoUrl - The GitHub URL.
 * @param {string} filePath - Path to the file.
 * @returns {Promise<string>} File content decoded as a UTF-8 string.
 */
export async function fetchFileContent(repoUrl, filePath) {
  const { owner, repo } = parseGithubUrl(repoUrl);
  const { data } = await octokit.repos.getContent({
    owner,
    repo,
    path: filePath
  });
  
  if (Array.isArray(data)) {
    throw new Error('Path is a directory, not a file');
  }
  
  return Buffer.from(data.content, 'base64').toString('utf8');
}
