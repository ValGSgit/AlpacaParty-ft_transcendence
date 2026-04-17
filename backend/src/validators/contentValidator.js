import { body, param } from "express-validator";

// Content validators for user-generated strings.
//
// Important: we never call .escape() here. The frontend renders these
// values through Vue's reactive templating (and explicit sanitization
// where raw HTML is rendered), so server-side HTML-entity escaping would
// double-encode and corrupt the displayed text. The job of these chains
// is length/shape validation only — XSS prevention is enforced at render.

const contentChain = (chain, { min = 1, max = 5000, field = "content" } = {}) =>
  chain
    .isString()
    .withMessage(`${field} must be a string`)
    .bail()
    .trim()
    .notEmpty()
    .withMessage(`${field} is required`)
    .bail()
    .isLength({ min, max })
    .withMessage(`${field} must be between ${min} and ${max} characters`);

const optionalContentChain = (chain, opts = {}) =>
  contentChain(chain.optional({ values: "falsy" }), opts);

const urlChain = (chain, field = "imageUrl") =>
  chain
    .optional({ values: "null" })
    .isString()
    .withMessage(`${field} must be a string`)
    .isLength({ max: 2048 })
    .withMessage(`${field} must be 2048 characters or fewer`);

// ── Posts ─────────────────────────────────────────────────────────────────

export const postCreateValidation = () => [
  contentChain(body("content"), { max: 5000, field: "content" }),
  urlChain(body("imageUrl")),
  urlChain(body("image_url")),
  body("isPublic").optional().isBoolean().withMessage("isPublic must be a boolean"),
];

export const postUpdateValidation = () => [
  optionalContentChain(body("content"), { max: 5000, field: "content" }),
  urlChain(body("imageUrl")),
  urlChain(body("image_url")),
  body("isPublic").optional().isBoolean().withMessage("isPublic must be a boolean"),
];

// ── Comments ──────────────────────────────────────────────────────────────

export const commentCreateValidation = () => [
  contentChain(body("content"), { max: 1000, field: "content" }),
];

// ── Reposts ───────────────────────────────────────────────────────────────

export const repostValidation = () => [
  optionalContentChain(body("comment"), { max: 500, field: "comment" }),
];

// ── Chat messages & rooms ─────────────────────────────────────────────────

export const chatMessageValidation = () => [
  contentChain(body("content"), { max: 2000, field: "content" }),
];

export const chatRoomCreateValidation = () => [
  body("name")
    .isString()
    .withMessage("Room name must be a string")
    .bail()
    .trim()
    .notEmpty()
    .withMessage("Room name is required")
    .bail()
    .isLength({ min: 1, max: 100 })
    .withMessage("Room name must be 100 characters or fewer"),
  optionalContentChain(body("description"), { max: 500, field: "description" }),
];

// ── Organizations ─────────────────────────────────────────────────────────

export const orgCreateValidation = () => [
  contentChain(body("name"), { min: 1, max: 100, field: "name" }),
  optionalContentChain(body("description"), { max: 1000, field: "description" }),
];

export const orgUpdateValidation = () => [
  optionalContentChain(body("name"), { min: 1, max: 100, field: "name" }),
  optionalContentChain(body("description"), { max: 1000, field: "description" }),
];

// ── Common path params ────────────────────────────────────────────────────

export const idParamValidation = (name = "id") => [
  param(name).isInt({ min: 1 }).withMessage(`${name} must be a positive integer`),
];
