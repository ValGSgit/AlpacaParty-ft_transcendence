/**
 * Chat Routes — /api/chat
 */
import express from 'express';
import {
  listConversations, getConversation, getUnreadCount,
  listRooms, createRoom, getRoomMessages, addMember, removeMember, deleteRoom,
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

// DM
router.get('/conversations', listConversations);
router.get('/unread', getUnreadCount);
router.get('/dm/:userId', getConversation);

// Group rooms
router.get('/rooms', listRooms);
router.post('/rooms', createRoom);
router.get('/rooms/:id/messages', getRoomMessages);
router.post('/rooms/:id/members', addMember);
router.delete('/rooms/:id/members/:userId', removeMember);
router.delete('/rooms/:id', deleteRoom);

export default router;
