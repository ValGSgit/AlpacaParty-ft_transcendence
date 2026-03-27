/**
 * Shared Zod schemas — reused across route validation.
 *
 * Import with:
 *   import { positiveId, paginationQuery, usernameSchema, imageUrlSchema } from '../schemas/shared.js';
 */
import { z } from '../middleware/validate.js';

export { z };

/** Coerces a path/query string to a positive integer (for :id params) */
export const positiveId = z.coerce.number().int().positive({ message: 'ID must be a positive integer' });

/**
 * Standard pagination query params.
 * Uses passthrough() so other query params (search, gameType, etc.) are preserved.
 */
export const paginationQuery = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
}).passthrough();

/** Username: 3-32 alphanumeric + hyphens/underscores */
export const usernameSchema = z
  .string()
  .min(3, 'Username must be at least 3 characters')
  .max(32, 'Username must be 32 characters or fewer')
  .regex(/^[a-zA-Z0-9_-]+$/, 'Username may only contain letters, numbers, hyphens and underscores');

/** Optional nullable image/avatar URL (max 2048 chars) */
export const imageUrlSchema = z.string().max(2048, 'URL must be 2048 characters or fewer').nullable().optional();
