/**
 * Chat Routes — /api/chat
 */
import express from 'express';
import {
  listConversations, getConversation, getUnreadCount,
  listRooms, createRoom, getRoomMessages, addMember, removeMember, deleteRoom,
} from '../controllers/chatController.js';
import { authenticate } from '../middleware/auth.js';
import { body } from 'express-validator';
import { chatRoomCreateValidation, idParamValidation } from '../validators/contentValidator.js';
import { checkValidation } from '../validators/validatorUtils.js';
import { chatSendLimiter } from '../middleware/rateLimiters.js';

const router = express.Router();
router.use(authenticate);

/**
 * @openapi
 * /chat/conversations:
 *   get:
 *     tags: [Chat]
 *     summary: List all DM conversations (most-recent-message-first)
 *     responses:
 *       200:
 *         description: Conversation previews
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 conversations:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       userId: { type: integer, example: 99 }
 *                       username: { type: string, example: "alpaca99" }
 *                       avatar: { type: string, nullable: true }
 *                       lastMessage: { type: string, example: "GG!" }
 *                       unreadCount: { type: integer, example: 2 }
 *                       updatedAt: { type: string, format: date-time }
 */
router.get('/conversations', listConversations);

/**
 * @openapi
 * /chat/unread:
 *   get:
 *     tags: [Chat]
 *     summary: Get total unread DM message count
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count: { type: integer, example: 5 }
 */
router.get('/unread', getUnreadCount);

/**
 * @openapi
 * /chat/dm/{userId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get DM history with a user (marks messages as read)
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *         description: The other user's ID
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Messages in chronological order
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages: { type: array, items: { $ref: '#/components/schemas/Message' } }
 *       400: { description: Invalid user ID or cannot message yourself }
 */
router.get('/dm/:userId', idParamValidation('userId'), checkValidation, getConversation);

/**
 * @openapi
 * /chat/rooms:
 *   get:
 *     tags: [Chat]
 *     summary: List group chat rooms I belong to
 *     responses:
 *       200:
 *         description: My rooms
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 rooms: { type: array, items: { $ref: '#/components/schemas/ChatRoom' } }
 *   post:
 *     tags: [Chat]
 *     summary: Create a group chat room
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 100, example: "Alpaca Gamers" }
 *               isPrivate: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Room created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 room: { $ref: '#/components/schemas/ChatRoom' }
 *       400: { description: Room name is required or too long }
 */
router.get('/rooms', listRooms);
router.post('/rooms', chatSendLimiter, chatRoomCreateValidation(), checkValidation, createRoom);

/**
 * @openapi
 * /chat/rooms/{id}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: Get messages in a group chat room
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Room ID
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Room messages
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 messages: { type: array, items: { $ref: '#/components/schemas/Message' } }
 *       403: { description: Not a member of this room }
 */
router.get('/rooms/:id/messages', idParamValidation(), checkValidation, getRoomMessages);

/**
 * @openapi
 * /chat/rooms/{id}/members:
 *   post:
 *     tags: [Chat]
 *     summary: Add a member to a group room (owner or admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Room ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userId]
 *             properties:
 *               userId: { type: integer, example: 42 }
 *     responses:
 *       201:
 *         description: Member added
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 member: { type: object }
 *       403: { description: Only the room owner can add members }
 *       404: { description: Room not found }
 */
router.post(
  '/rooms/:id/members',
  idParamValidation(),
  [body('userId').isInt({ min: 1 }).withMessage('userId must be a positive integer')],
  checkValidation,
  addMember,
);

/**
 * @openapi
 * /chat/rooms/{id}/members/{userId}:
 *   delete:
 *     tags: [Chat]
 *     summary: Remove a member from a room (owner/admin, or self-leave)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Room ID
 *       - in: path
 *         name: userId
 *         required: true
 *         schema: { type: integer }
 *         description: User ID to remove (use your own ID to leave)
 *     responses:
 *       200:
 *         description: Member removed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403: { description: Only the room owner can remove other members }
 *       404: { description: Room not found }
 */
router.delete(
  '/rooms/:id/members/:userId',
  idParamValidation(), idParamValidation('userId'), checkValidation,
  removeMember,
);

/**
 * @openapi
 * /chat/rooms/{id}:
 *   delete:
 *     tags: [Chat]
 *     summary: Delete a group chat room (owner or admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Room deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403: { description: Not the room owner }
 *       404: { description: Room not found }
 */
router.delete('/rooms/:id', idParamValidation(), checkValidation, deleteRoom);

export default router;
