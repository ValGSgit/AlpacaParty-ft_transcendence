/**
 * Organization Routes — /api/organizations
 */
import express from 'express';
import {
  listOrgs, listMyOrgs, getOrg, createOrg, updateOrg, deleteOrg,
  addMember, removeMember,
} from '../controllers/organizationController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
router.use(authenticate);

router.get('/', listOrgs);
router.get('/mine', listMyOrgs);
router.get('/:id', getOrg);
router.post('/', createOrg);
router.put('/:id', updateOrg);
router.delete('/:id', deleteOrg);
router.post('/:id/members', addMember);
router.delete('/:id/members/:userId', removeMember);

export default router;
