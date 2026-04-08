/**
 * Friend Controller
 * @owner ValGSgit
 */
import Friend from '../models/Friend.js';
import User from '../models/User.js';
import NotificationService from '../services/notificationService.js';
import GamificationService from '../services/gamificationService.js';

/** GET /api/friends — list my friends */
export const listFriends = async (req, res, next) => {
  try {
    const { limit = 50, offset = 0 } = req.query;
    const friends = await Friend.getFriends(req.user.id, { limit: Number(limit), offset: Number(offset) });
    res.json({ friends });
  } catch (err) { next(err); }
};

/** GET /api/friends/online */
export const listOnlineFriends = async (req, res, next) => {
  try {
    const friends = await Friend.getOnlineFriends(req.user.id);
    res.json({ friends });
  } catch (err) { next(err); }
};

/** GET /api/friends/requests */
export const listRequests = async (req, res, next) => {
  try {
    const [received, sent] = await Promise.all([
      Friend.getPendingReceived(req.user.id),
      Friend.getPendingSent(req.user.id),
    ]);
    res.json({ received, sent });
  } catch (err) { next(err); }
};

/** POST /api/friends/requests — send a friend request */
export const sendRequest = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) {
      return res.status(400).json({
        error: {
          message: 'userId is required',
          fields: { userId: 'userId is required' },
        },
      });
    }
    if (Number(userId) === req.user.id) {
      return res.status(400).json({ error: { message: 'Cannot friend yourself' } });
    }

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ error: { message: 'User not found' } });

    const request = await Friend.sendRequest(req.user.id, Number(userId));
    await NotificationService.friendRequest(Number(userId), req.user.username);
    res.status(201).json({ request });
  } catch (err) { next(err); }
};

/** PUT /api/friends/requests/:id/accept */
export const acceptRequest = async (req, res, next) => {
  try {
    const request = await Friend.acceptRequest(Number(req.params.id), req.user.id);
    if (!request) return res.status(404).json({ error: { message: 'Request not found' } });
    await NotificationService.friendAccepted(request.senderId, req.user.username);
    await GamificationService.checkSocialAchievements(req.user.id);
    res.json({ request });
  } catch (err) { next(err); }
};

/** PUT /api/friends/requests/:id/decline */
export const declineRequest = async (req, res, next) => {
  try {
    const request = await Friend.declineRequest(Number(req.params.id), req.user.id);
    if (!request) return res.status(404).json({ error: { message: 'Request not found' } });
    res.json({ request });
  } catch (err) { next(err); }
};

/** DELETE /api/friends/:id — remove friend */
export const removeFriend = async (req, res, next) => {
  try {
    await Friend.removeFriend(req.user.id, Number(req.params.id));
    res.json({ message: 'Friend removed' });
  } catch (err) { next(err); }
};

/** POST /api/friends/block */
export const blockUser = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: { message: 'userId is required' } });
    await Friend.blockUser(req.user.id, Number(userId));
    res.json({ message: 'User blocked' });
  } catch (err) { next(err); }
};

/** DELETE /api/friends/block/:id */
export const unblockUser = async (req, res, next) => {
  try {
    await Friend.unblockUser(req.user.id, Number(req.params.id));
    res.json({ message: 'User unblocked' });
  } catch (err) { next(err); }
};

/** GET /api/friends/blocked */
export const listBlocked = async (req, res, next) => {
  try {
    const blocked = await Friend.getBlocked(req.user.id);
    res.json({ blocked });
  } catch (err) { next(err); }
};
