/**
 * User Routes
 * @owner ValGSgit
 * @issue https://github.com/ValGSgit/AlpacaParty/issues/9
 */
import express from 'express';
import {
  getMe, updateMe, changePassword, getUser, listUsers,
  exportMyData, requestDeletion, listDataRequests, generateAvatar, generateImage,
} from '../controllers/userController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/me', getMe);
router.put('/me', updateMe);
router.put('/me/password', changePassword);
router.get('/me/export', exportMyData);
router.post('/me/delete-request', requestDeletion);
router.get('/me/data-requests', listDataRequests);
router.post('/me/generate-avatar', generateAvatar);
router.post('/me/generate-image', generateImage);

router.get('/', listUsers);
router.get('/:id', getUser);

export default router;
