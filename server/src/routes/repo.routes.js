import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import { registerRepo, listRepos, getRepo, deleteRepo, getRepoFiles, getFileContent, getGithubRepos } from '../controllers/repo.controller.js';

const router = Router();

// All repo routes require a valid JWT
router.use(authenticate);

router.post('/',         registerRepo);   // POST   /api/repos
router.get('/',          listRepos);      // GET    /api/repos
router.get('/github-list', getGithubRepos); // GET   /api/repos/github-list (mounted before :id)
router.get('/:id',       getRepo);        // GET    /api/repos/:id
router.delete('/:id',    deleteRepo);     // DELETE /api/repos/:id
router.get('/:id/files', getRepoFiles);   // GET    /api/repos/:id/files
router.get('/:id/file',  getFileContent);  // GET    /api/repos/:id/file

export default router;
