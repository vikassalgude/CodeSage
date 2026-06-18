import { prisma } from '../config/db.js';
import { qdrant } from '../config/qdrant.js';
import { parseGithubUrl, getRepoDetails, fetchFileContent } from '../services/github.service.js';
import { addIngestionJob } from '../queues/ingestion.queue.js';
import { logger } from '../utils/logger.js';
import { mapLanguageToEnum } from '../utils/enumNormalizer.js';

/**
 * POST /api/repos
 * Register a new GitHub repository for indexing.
 */
export async function registerRepo(req, res, next) {
  try {
    const { githubUrl } = req.body;
    if (!githubUrl) {
      return res.status(400).json({ error: { message: 'githubUrl is required' } });
    }

    // Validate URL format early
    parseGithubUrl(githubUrl);

    // Prevent duplicate registrations per user
    const existing = await prisma.repo.findFirst({
      where: { userId: req.user.id, githubUrl }
    });
    if (existing) {
      return res.status(409).json({ 
        error: { message: 'This repository is already registered.' },
        repo: existing 
      });
    }

    // Fetch repo metadata from GitHub
    const { name, language, commitSha, size } = await getRepoDetails(githubUrl);

    // Limit repository size to 50MB (50,000 KB) for free tier stability
    const MAX_REPO_SIZE_KB = 50000;
    if (size > MAX_REPO_SIZE_KB) {
      return res.status(400).json({
        error: { message: `Repository is too large (${Math.round(size / 1024)}MB). The free tier limit is 50MB.` }
      });
    }

    // Create the repo record in PostgreSQL (status starts as 'INDEXING')
    const repo = await prisma.repo.create({
      data: {
        userId: req.user.id,
        githubUrl,
        name,
        language: mapLanguageToEnum(language),
        commitSha,
        status: 'INDEXING'
      }
    });

    // Enqueue the background ingestion job
    const job = await addIngestionJob(repo.id, githubUrl);
    logger.info(`Queued ingestion job ${job.id} for repo ${repo.id}`);

    res.status(202).json({
      message: 'Repository registered. Indexing has started in the background.',
      repo: {
        ...repo,
        status: repo.status.toLowerCase(),
        language: repo.language ? repo.language.toLowerCase() : null
      },
      jobId: job.id
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repos
 * List all repositories belonging to the authenticated user.
 */
export async function listRepos(req, res, next) {
  try {
    const repos = await prisma.repo.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, githubUrl: true, language: true,
        status: true, chunkCount: true, createdAt: true
      }
    });
    const mapped = repos.map(r => ({
      ...r,
      status: r.status.toLowerCase(),
      language: r.language ? r.language.toLowerCase() : null
    }));
    res.json({ repos: mapped });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repos/:id
 * Get the indexing status and details of a specific repository.
 */
export async function getRepo(req, res, next) {
  try {
    const repo = await prisma.repo.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!repo) {
      return res.status(404).json({ error: { message: 'Repository not found' } });
    }
    res.json({
      repo: {
        ...repo,
        status: repo.status.toLowerCase(),
        language: repo.language ? repo.language.toLowerCase() : null
      }
    });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/repos/:id
 * Delete a repository — removes all chunks and Qdrant collection.
 */
export async function deleteRepo(req, res, next) {
  try {
    const repo = await prisma.repo.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!repo) {
      return res.status(404).json({ error: { message: 'Repository not found' } });
    }

    // Delete the Qdrant collection (cascades all vectors)
    const collectionName = `repo_${repo.id}`;
    try {
      const { exists } = await qdrant.collectionExists(collectionName);
      if (exists) {
        await qdrant.deleteCollection(collectionName);
        logger.info(`Deleted Qdrant collection: ${collectionName}`);
      }
    } catch (qdrantErr) {
      logger.warn(`Could not delete Qdrant collection ${collectionName}:`, qdrantErr.message);
    }

    // Delete repo from PostgreSQL — Prisma cascades to Chunk, Conversation, Message
    await prisma.repo.delete({ where: { id: repo.id } });
    logger.info(`Deleted repo ${repo.id} from PostgreSQL`);

    res.json({ message: 'Repository and all associated data deleted successfully.' });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repos/:id/files
 * List all unique code files indexed for this repository.
 */
export async function getRepoFiles(req, res, next) {
  try {
    const repo = await prisma.repo.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!repo) {
      return res.status(404).json({ error: { message: 'Repository not found' } });
    }

    const chunks = await prisma.chunk.findMany({
      where: { repoId: repo.id },
      select: { filePath: true, language: true },
      distinct: ['filePath']
    });

    const files = chunks.map(c => ({
      path: c.filePath,
      language: c.language ? c.language.toLowerCase() : null
    }));

    res.json({ files });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repos/:id/file?path=...
 * Fetch raw file content on-demand from GitHub for display in Monaco.
 */
export async function getFileContent(req, res, next) {
  try {
    const { path: filePath } = req.query;
    if (!filePath) {
      return res.status(400).json({ error: { message: 'filePath query parameter is required' } });
    }

    const repo = await prisma.repo.findFirst({
      where: { id: req.params.id, userId: req.user.id }
    });
    if (!repo) {
      return res.status(404).json({ error: { message: 'Repository not found' } });
    }

    logger.info(`Webhook: Fetching raw content for file '${filePath}' in repo '${repo.name}'`);
    const content = await fetchFileContent(repo.githubUrl, filePath);
    res.json({ content });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/repos/github-list
 * Fetches user's personal GitHub repositories list using their saved OAuth token,
 * correlating them with locally indexed repositories.
 */
export async function getGithubRepos(req, res, next) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user || !user.githubToken) {
      return res.status(200).json({ repos: [], hasToken: false });
    }

    // Exchange with GitHub API
    const response = await fetch('https://api.github.com/user/repos?sort=updated&per_page=50', {
      headers: {
        'Authorization': `Bearer ${user.githubToken}`,
        'User-Agent': 'CodeSage-App'
      }
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired/invalid, unset on user profile
        await prisma.user.update({
          where: { id: req.user.id },
          data: { githubToken: null }
        });
        return res.status(200).json({ repos: [], hasToken: false });
      }
      throw new Error(`GitHub API returned status ${response.status}`);
    }

    const githubRepos = await response.json();

    // Fetch existing indexed repos for this user
    const indexedRepos = await prisma.repo.findMany({
      where: { userId: req.user.id }
    });

    // Cross-reference list
    const mapped = githubRepos.map(gr => {
      const localMatch = indexedRepos.find(
        lr => lr.githubUrl.toLowerCase() === gr.html_url.toLowerCase()
      );

      return {
        id: localMatch ? localMatch.id : null,
        name: gr.full_name,
        description: gr.description || '',
        htmlUrl: gr.html_url,
        language: localMatch && localMatch.language ? localMatch.language.toLowerCase() : (gr.language ? gr.language.toLowerCase() : 'unknown'),
        isPrivate: gr.private,
        status: localMatch ? localMatch.status.toLowerCase() : 'unindexed',
        chunkCount: localMatch ? localMatch.chunkCount : 0
      };
    });

    return res.status(200).json({ repos: mapped, hasToken: true });
  } catch (error) {
    logger.error('Repo: Error fetching GitHub repositories list:', error);
    next(error);
  }
}
