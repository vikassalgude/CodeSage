import { Octokit } from '@octokit/rest';
import path from 'path';

/**
 * Creates an Octokit instance with fallback.
 * @param {string} [customToken] 
 */
function getOctokit(customToken) {
  const token = customToken || process.env.GITHUB_TOKEN;
  const isValid = token && 
    !token.startsWith('ghp_your') && 
    token !== 'ghp_...' && 
    !token.startsWith('ghp_1VlHk6MQDX');

  if (isValid) {
    return new Octokit({ auth: token });
  }
  return new Octokit();
}

/**
 * Executes a GitHub API call with automatic 401 unauthenticated fallback.
 */
async function withOctokit(customToken, apiCall) {
  try {
    const client = getOctokit(customToken);
    return await apiCall(client);
  } catch (err) {
    if (err.status === 401) {
      console.warn("[github] Auth token invalid or unauthorized (401). Falling back to unauthenticated API client...");
      const unauthClient = new Octokit();
      return await apiCall(unauthClient);
    }
    throw err;
  }
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
 * Helper to filter out non-source files and folders.
 */
function isSourceFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  
  // Exclude common build/dependency folders
  const excludeFolders = ['node_modules/', 'dist/', 'build/', 'bin/', 'obj/', 'out/', '.git/'];
  if (excludeFolders.some(folder => normalized.includes(folder) || normalized.startsWith(folder))) {
    return false;
  }
  
  // Exclude minified files
  if (normalized.endsWith('.min.js') || normalized.endsWith('.min.css')) {
    return false;
  }
  
  // Exclude lockfiles
  const excludeFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 'cargo.lock', 'go.sum', 'gemfile.lock'];
  const fileName = normalized.split('/').pop();
  if (excludeFiles.includes(fileName)) {
    return false;
  }
  
  // Exclude binary extensions, images, fonts
  const excludeExts = [
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp', // Images
    '.woff', '.woff2', '.eot', '.ttf', '.otf', // Fonts
    '.zip', '.tar', '.gz', '.rar', '.7z', // Archives
    '.pdf', '.epub', '.mp3', '.mp4', '.avi', '.mov', // Media
    '.db', '.sqlite', '.exe', '.dll', '.so', '.dylib' // Binaries/DBs
  ];
  if (excludeExts.some(ext => normalized.endsWith(ext))) {
    return false;
  }

  return true;
}

/**
 * Classifies a file for processing or skipping.
 * @param {string} filePath 
 * @returns {{status: 'process'|'skipped', type?: 'code'|'documentation', subType?: string, reason?: string}}
 */
export function classifyFile(filePath) {
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  const ext = path.extname(normalized);
  const fileName = normalized.split('/').pop();

  if (!isSourceFile(filePath)) {
    const excludeFolders = ['node_modules/', 'dist/', 'build/', 'bin/', 'obj/', 'out/', '.git/'];
    if (excludeFolders.some(folder => normalized.includes(folder) || normalized.startsWith(folder))) {
      return { status: 'skipped', reason: 'Junk or dependency directory' };
    }
    if (normalized.endsWith('.min.js') || normalized.endsWith('.min.css')) {
      return { status: 'skipped', reason: 'Minified asset file' };
    }
    const excludeFiles = ['package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'composer.lock', 'cargo.lock', 'go.sum', 'gemfile.lock'];
    if (excludeFiles.includes(fileName)) {
      return { status: 'skipped', reason: 'Lockfile' };
    }
    return { status: 'skipped', reason: 'Binary, asset, image, font, or audio/video media file' };
  }

  // Group (a): Tree-sitter supported languages
  const TREE_SITTER_EXTS = ['.js', '.ts', '.jsx', '.tsx', '.py'];
  if (TREE_SITTER_EXTS.includes(ext)) {
    return { status: 'process', type: 'code', subType: 'tree_sitter' };
  }

  // Other Code languages (no Tree-sitter, fallback to line-based chunker)
  const OTHER_CODE_EXTS = ['.go', '.java', '.rs', '.cpp', '.h', '.c', '.cs', '.sh', '.bash', '.sql'];
  if (OTHER_CODE_EXTS.includes(ext)) {
    return { status: 'process', type: 'code', subType: 'line_code' };
  }

  // Group (b): Plain-text files/docs
  const DOC_EXTS = ['.md', '.json', '.css', '.yaml', '.yml', '.txt', '.html', '.ini', '.toml', '.config', '.env'];
  const DOC_FILES = ['dockerfile', 'makefile', 'readme', 'license'];
  if (DOC_EXTS.includes(ext) || DOC_FILES.includes(fileName) || DOC_FILES.some(f => fileName.startsWith(f))) {
    return { status: 'process', type: 'documentation', subType: 'plain_text' };
  }

  return { status: 'skipped', reason: 'Unsupported file extension/type' };
}

/**
 * Recursively fetches all classified files from a GitHub repository.
 * Filters files by extension and limits size to avoid fetching large blobs.
 * @param {string} repoUrl - The GitHub URL.
 * @param {string} [userToken] - Optional GitHub user access token
 * @returns {Promise<Array<{path: string, content: string, size: number, type: string, subType: string}>>} Array of file objects
 */
export async function fetchRepoFiles(repoUrl, userToken = null) {
  const { owner, repo } = parseGithubUrl(repoUrl);

  // 1. Get default branch (with rate limit fallback)
  let branch = 'main';
  try {
    const repoData = await withOctokit(userToken, client => 
      client.repos.get({ owner, repo }).then(r => r.data)
    );
    if (repoData && repoData.default_branch) {
      branch = repoData.default_branch;
    }
  } catch (_) {
    console.warn(`[github] Default branch lookup rate limited/failed for ${owner}/${repo}. Defaulting to 'main'.`);
  }

  // 2. Fetch git tree recursively (with rate limit fallback)
  let treeData;
  try {
    treeData = await withOctokit(userToken, client =>
      client.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: '1'
      }).then(r => r.data)
    );
  } catch (err) {
    if (err.status === 403 || err.status === 429) {
      console.warn(`[github] API rate limit reached for tree fetch on ${owner}/${repo}. Trying public raw endpoint...`);
      const rawTreeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`);
      if (rawTreeRes.ok) {
        treeData = await rawTreeRes.json();
      } else {
        throw err;
      }
    } else {
      throw err;
    }
  }

  const filesToFetch = [];

  // 3. Classify all files
  for (const file of treeData.tree) {
    if (file.type !== 'blob') continue;

    const classification = classifyFile(file.path);
    if (classification.status === 'process') {
      if (file.size >= 100000) {
        console.log(`[github] Skipping file ${file.path} (Reason: Size ${Math.round(file.size / 1024)}KB exceeds 100KB limit)`);
      } else {
        filesToFetch.push({
          path: file.path,
          sha: file.sha,
          size: file.size,
          type: classification.type,
          subType: classification.subType
        });
      }
    } else {
      console.log(`[github] Skipping file ${file.path} (Reason: ${classification.reason})`);
    }
  }

  const MAX_FILES = 300;
  if (filesToFetch.length > MAX_FILES) {
    throw new Error(`Repository contains too many source files (${filesToFetch.length}). The free tier limit is ${MAX_FILES} files.`);
  }

  const totalSourceSize = filesToFetch.reduce((acc, f) => acc + (f.size || 0), 0);
  if (totalSourceSize > 50 * 1024 * 1024) {
    throw new Error(`The total size of source files (${(totalSourceSize / 1024 / 1024).toFixed(2)}MB) exceeds the 50MB limit.`);
  }

  console.log(`[github] Found ${filesToFetch.length} matching code and doc files in ${owner}/${repo}. Fetching content...`);

  const results = [];
  const BATCH_SIZE = 20;

  for (let i = 0; i < filesToFetch.length; i += BATCH_SIZE) {
    const batch = filesToFetch.slice(i, i + BATCH_SIZE);
    
    const contents = await Promise.all(batch.map(async (file) => {
      try {
        // Fast path: Try raw.githubusercontent.com first (bypasses REST API rate limits)
        const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${file.path}`;
        const rawRes = await fetch(rawUrl);
        if (rawRes.ok) {
          const content = await rawRes.text();
          return {
            path: file.path,
            content,
            size: file.size,
            type: file.type,
            subType: file.subType
          };
        }

        // Fallback: Octokit git.getBlob for private repos or edge cases
        const data = await withOctokit(userToken, client =>
          client.git.getBlob({
            owner,
            repo,
            file_sha: file.sha
          }).then(r => r.data)
        );
        
        const content = Buffer.from(data.content, 'base64').toString('utf8');
        return {
          path: file.path,
          content,
          size: file.size,
          type: file.type,
          subType: file.subType
        };
      } catch (err) {
        console.error(`[github] Failed to fetch file ${file.path}:`, err.message);
        return null;
      }
    }));

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
    '.rs': 'rust',
    '.md': 'markdown',
    '.json': 'json',
    '.css': 'css',
    '.yaml': 'yaml',
    '.yml': 'yaml',
    '.sh': 'shell',
    '.bash': 'shell',
    '.sql': 'sql',
    '.toml': 'toml',
    '.html': 'html',
    '.config': 'xml'
  };
  return map[ext] || 'plaintext';
}

/**
 * Fetches basic repository metadata from the GitHub API.
 * @param {string} repoUrl - The GitHub URL.
 * @param {string} [userToken] - Optional GitHub user access token
 * @returns {Promise<{name: string, language: string|null, commitSha: string|null, size: number}>}
 */
export async function getRepoDetails(repoUrl, userToken = null) {
  const { owner, repo } = parseGithubUrl(repoUrl);
  
  try {
    const data = await withOctokit(userToken, client => 
      client.repos.get({ owner, repo }).then(r => r.data)
    );

    let commitSha = null;
    try {
      const branchData = await withOctokit(userToken, client =>
        client.repos.getBranch({ owner, repo, branch: data.default_branch }).then(r => r.data)
      );
      commitSha = branchData.commit.sha;
    } catch (_) { /* non-fatal */ }

    return {
      name: data.full_name,
      language: data.language || null,
      commitSha,
      size: data.size
    };
  } catch (err) {
    if (err.status === 403 || err.status === 429) {
      console.warn(`[github] API rate limit reached for metadata fetch on ${owner}/${repo}. Using fallback repository details.`);
      return {
        name: `${owner}/${repo}`,
        language: null,
        commitSha: null,
        size: 10000
      };
    }
    throw err;
  }
}

/**
 * Fetches the content of a specific file in the repository.
 * @param {string} repoUrl - The GitHub URL.
 * @param {string} filePath - Path to the file.
 * @param {string} [userToken] - Optional GitHub user access token
 * @returns {Promise<string>} File content decoded as a UTF-8 string.
 */
export async function fetchFileContent(repoUrl, filePath, userToken = null) {
  const { owner, repo } = parseGithubUrl(repoUrl);
  
  // Try raw.githubusercontent.com first
  try {
    const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/HEAD/${filePath}`;
    const rawRes = await fetch(rawUrl);
    if (rawRes.ok) {
      return await rawRes.text();
    }
  } catch (_) { /* fallback to API */ }

  const data = await withOctokit(userToken, client =>
    client.repos.getContent({ owner, repo, path: filePath }).then(r => r.data)
  );
  
  if (Array.isArray(data)) {
    throw new Error('Path is a directory, not a file');
  }
  
  return Buffer.from(data.content, 'base64').toString('utf8');
}
