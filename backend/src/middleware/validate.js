/**
 * Zod validation middleware factory.
 *
 * Usage:
 *   import { validate, z } from '../middleware/validate.js';
 *
 *   router.post('/foo', validate({
 *     body: z.object({ name: z.string().min(1) }),
 *     query: z.object({ limit: z.coerce.number().int().min(1).max(100).optional() }),
 *   }), handler);
 *
 * Validation errors are returned as:
 *   HTTP 400 { error: { message: "Validation failed", fields: { fieldName: "error message" } } }
 */
import { z } from 'zod';

export { z };

/**
 * @param {{ body?: import('zod').ZodTypeAny, query?: import('zod').ZodTypeAny, params?: import('zod').ZodTypeAny }} schemas
 */
export function validate(schemas) {
  return (req, res, next) => {
    const errors = {};

    for (const [key, schema] of Object.entries(schemas)) {
      const result = schema.safeParse(req[key]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          const field = issue.path.join('.') || key;
          errors[field] = issue.message;
        }
      } else {
        // Replace with coerced/transformed values (e.g. string → number for query params)
        req[key] = result.data;
      }
    }

    if (Object.keys(errors).length > 0) {
      return res.status(400).json({ error: { message: 'Validation failed', fields: errors } });
    }

    next();
  };
}
