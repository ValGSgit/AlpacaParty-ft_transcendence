import { body } from "express-validator";
import {
  userEmailChain,
  userNameChain,
  userPasswordChain,
} from "./userValidator.js";

// todo match lengths with database schema

export const authRegisterValidation = () => [
  userNameChain(body("username")),
  userEmailChain(body("email")),
  userPasswordChain(body("password")),
];

// Login accepts either a username or an email in the "username" field.
const authUsernameOrEmailChain = (chain) =>
  chain
    .trim()
    .notEmpty()
    .withMessage("Username or email is required")
    .isLength({ min: 3, max: 254 })
    .withMessage("Username or email must be 3-254 characters");

export const authLoginValidation = () => [
  authUsernameOrEmailChain(body("username")),
  userPasswordChain(body("password")),
];
