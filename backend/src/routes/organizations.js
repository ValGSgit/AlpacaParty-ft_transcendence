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

/**
 * @openapi
 * /organizations:
 *   get:
 *     tags: [Organizations]
 *     summary: List all organizations
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Filter by name
 *       - $ref: '#/components/parameters/limitParam'
 *       - $ref: '#/components/parameters/offsetParam'
 *     responses:
 *       200:
 *         description: Organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations: { type: array, items: { $ref: '#/components/schemas/Organization' } }
 *   post:
 *     tags: [Organizations]
 *     summary: Create a new organization
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name]
 *             properties:
 *               name: { type: string, maxLength: 100, example: "AlpacaSquad" }
 *               description: { type: string, maxLength: 500, nullable: true, example: "The best alpaca gamers" }
 *               avatar: { type: string, nullable: true }
 *     responses:
 *       201:
 *         description: Organization created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization: { $ref: '#/components/schemas/Organization' }
 *       400: { description: Name is required }
 *       409: { description: Name already taken }
 */
router.get('/', listOrgs);
router.post('/', createOrg);

/**
 * @openapi
 * /organizations/mine:
 *   get:
 *     tags: [Organizations]
 *     summary: List organizations I belong to
 *     responses:
 *       200:
 *         description: My organizations
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organizations: { type: array, items: { $ref: '#/components/schemas/Organization' } }
 */
router.get('/mine', listMyOrgs);

/**
 * @openapi
 * /organizations/{id}:
 *   get:
 *     tags: [Organizations]
 *     summary: Get an organization by ID
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Organization detail including member list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization: { $ref: '#/components/schemas/Organization' }
 *                 members: { type: array, items: { $ref: '#/components/schemas/User' } }
 *       404: { description: Organization not found }
 *   put:
 *     tags: [Organizations]
 *     summary: Update an organization (owner or admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string, maxLength: 100 }
 *               description: { type: string, nullable: true }
 *               avatar: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Updated organization
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 organization: { $ref: '#/components/schemas/Organization' }
 *       403: { description: Not the owner }
 *       404: { description: Organization not found }
 *   delete:
 *     tags: [Organizations]
 *     summary: Delete an organization (owner or admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Organization deleted
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *       403: { description: Not the owner }
 *       404: { description: Organization not found }
 */
router.get('/:id', getOrg);
router.put('/:id', updateOrg);
router.delete('/:id', deleteOrg);

/**
 * @openapi
 * /organizations/{id}/members:
 *   post:
 *     tags: [Organizations]
 *     summary: Add a member to an organization (owner or admin only)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
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
 *       403: { description: Not the owner }
 *       404: { description: Organization or user not found }
 */
router.post('/:id/members', addMember);

/**
 * @openapi
 * /organizations/{id}/members/{userId}:
 *   delete:
 *     tags: [Organizations]
 *     summary: Remove a member from an organization (owner/admin, or self-leave)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
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
 *       403: { description: Not authorized }
 *       404: { description: Organization not found }
 */
router.delete('/:id/members/:userId', removeMember);

export default router;
