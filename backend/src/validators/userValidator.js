import { body } from "express-validator";
import config from "#config/index.js";

export const userUpdateValidation = () => [
  userNameChain(body("username").optional()),
  userEmailChain(body("email").optional()),
  userBioChain(body("bio")),
  userStatusChain(body("status")),
  userAvatarChain(body("avatar")),
];

export const userPasswordValidation = () => [
  userPasswordChain(body("newPassword")),
];

export const userNameChain = (chain) =>
  chain
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isAlphanumeric()
    .withMessage("Name may only contain letters and numbers")
    .isLength({ min: 3, max: 32 })
    .withMessage("Name must be between 3 and 32 characters")
    .escape();

export const userEmailChain = (chain) =>
  chain
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email")
    .normalizeEmail();

export const userBioChain = (chain) =>
  chain
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Bio must be under 255 characters")
    .escape();

export const userStatusChain = (chain) =>
  chain
    .optional()
    .trim()
    .isLength({ max: 255 })
    .withMessage("Status must be under 255 characters")
    .escape();

export const userAvatarChain = (chain) =>
  chain
    .optional()
    .trim()
    .isLength({ max: 512 })
    .withMessage("Avatar must be under 512 characters");

export const userPasswordChain = (chain) => {
  const minLen = config.password.minLength;
  const maxLen = 50;
  const requireUppercase = config.password.requireUppercase;
  const requireLowercase = config.password.requireLowercase;
  const requireNumber = config.password.requireNumber;
  return chain
    .isLength({ min: minLen, max: maxLen })
    .withMessage(`Password must be between ${minLen} and ${maxLen} characters`)
    .custom((value) => !requireUppercase || /[A-Z]/.test(value))
    .withMessage("Password must contain at least one uppercase letter")
    .custom((value) => !requireLowercase || /[a-z]/.test(value))
    .withMessage("Password must contain at least one lowercase letter")
    .custom((value) => !requireNumber || /\d/.test(value))
    .withMessage("Password must contain at least one number");
};
