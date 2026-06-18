import crypto from 'crypto';
import { addReindexJob } from '../queues/reindex.queue.js';
import { prisma } from '../config/db.js';
import { logger } from '../utils/logger.js';

/**
 * Handles incoming GitHub Push Webhook events.
 * Verifies payload signature, identifies changed/deleted files,
 * and queues a background delta re-indexing job.
 */
export async function handleGithubWebhook(req, res) {
  const sig = req.headers['x-hub-signature-256'];
  
  if (!process.env.GITHUB_WEBHOOK_SECRET) {
    logger.error('[webhook] GITHUB_WEBHOOK_SECRET is not configured in environment variables');
    return res.status(500).json({ error: { message: 'Webhook secret not configured' } });
  }

  // Calculate HMAC-SHA256 signature to verify authenticity of the push event
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(req.body))
    .digest('hex');

  if (sig !== expected) {
    logger.warn('[webhook] Signature verification failed');
    return res.status(401).send('Invalid signature');
  }

  const { repository, commits } = req.body;
  if (!repository || !commits) {
    logger.warn('[webhook] Malformed push payload received');
    return res.status(400).send('Malformed payload');
  }

  const repoUrl = repository.html_url;

  try {
    // 1. Locate repository in PostgreSQL
    const repo = await prisma.repo.findFirst({
      where: { 
        githubUrl: {
          equals: repoUrl,
          mode: 'insensitive' // case-insensitive matching
        }
      }
    });

    if (!repo) {
      logger.info(`[webhook] Push event received for untracked repo: ${repoUrl}`);
      return res.status(200).send('Repo not indexed');
    }

    // 2. Extract and classify all files modified, added, or removed across commits
    const filesList = [];
    for (const commit of commits) {
      if (commit.added) {
        commit.added.forEach(f => filesList.push({ path: f, action: 'upsert' }));
      }
      if (commit.modified) {
        commit.modified.forEach(f => filesList.push({ path: f, action: 'upsert' }));
      }
      if (commit.removed) {
        commit.removed.forEach(f => filesList.push({ path: f, action: 'delete' }));
      }
    }

    if (filesList.length === 0) {
      logger.info(`[webhook] No relevant file changes in commits for ${repo.name}`);
      return res.status(200).send('No file changes');
    }

    // 3. Deduplicate files (latest status overrides previous ones)
    const fileMap = {};
    for (const file of filesList) {
      fileMap[file.path] = file.action;
    }
    const uniqueFiles = Object.entries(fileMap).map(([path, action]) => ({ path, action }));

    // 4. Queue delta re-indexing job
    logger.info(`[webhook] Queueing delta re-indexing job for repo '${repo.name}' with ${uniqueFiles.length} file changes.`);
    await addReindexJob(repo.id, repoUrl, uniqueFiles);

    return res.status(200).send('Queued');
  } catch (error) {
    logger.error('[webhook] Error handling GitHub push webhook:', error);
    return res.status(500).send('Internal Server Error');
  }
}
