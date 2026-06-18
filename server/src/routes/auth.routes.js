import { Router } from 'express';
import { me, updateGithubToken, githubLogin, getGithubConfig } from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/github', githubLogin);
router.get('/github/config', getGithubConfig);
router.get('/me', authenticate, me);
router.put('/github-token', authenticate, updateGithubToken);

export default router;
