import { Router } from 'express';
import { handleGithubWebhook } from '../controllers/webhook.controller.js';

const router = Router();

// Endpoint for GitHub push event webhooks (verified internally using HMAC signature)
router.post('/', handleGithubWebhook);

export default router;
