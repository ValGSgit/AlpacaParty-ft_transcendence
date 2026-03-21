/**
 * Friend Routes — /api/friends
 */
import express from 'express';
import {
  listFriends, listOnlineFriends, listRequests,
  sendRequest, acceptRequest, declineRequest,
  removeFriend, blockUser, unblockUser, listBlocked,
} from '../controllers/friendController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listFriends);
router.get('/online', listOnlineFriends);
router.get('/blocked', listBlocked);
router.get('/requests', listRequests);
router.post('/requests', sendRequest);
router.put('/requests/:id/accept', acceptRequest);
router.put('/requests/:id/decline', declineRequest);
router.delete('/:id', removeFriend);
router.post('/block', blockUser);
router.delete('/block/:id', unblockUser);

export default router;
