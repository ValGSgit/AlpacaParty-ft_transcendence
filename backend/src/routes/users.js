/**
 * User Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/Cleanscendence/issues/9
 */
import express from 'express';
import { getMe, updateMe, changePassword, getUser, listUsers } from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All user routes require authentication
router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', changePassword);

router.get('/', listUsers);
router.get('/:id', getUser);

export default router;
