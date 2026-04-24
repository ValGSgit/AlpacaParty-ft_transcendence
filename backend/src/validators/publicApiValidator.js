import { body } from "express-validator";
import { idParamValidation } from "./contentValidator.js";

export const postCreateValidation = () => [
  body("content")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("content is required")
    .isLength({ max: 2000 })
    .withMessage("content must be 2000 characters or fewer"),
  body("imageUrl")
    .optional({ values: "null" })
    .isString()
    .isLength({ max: 2048 })
    .withMessage("invalid imageUrl"),
  body("authorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("authorId must be a positive integer"),
];

export const postUpdateValidation = () => [
  idParamValidation(),
  body("content")
    .isString()
    .trim()
    .notEmpty()
    .withMessage("content is required")
    .isLength({ max: 2000 })
    .withMessage("content must be 2000 characters or fewer"),
  body("imageUrl")
    .optional({ values: "null" })
    .isString()
    .isLength({ max: 2048 })
    .withMessage("invalid imageUrl"),
  body("authorId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("authorId must be a positive integer"),
];
