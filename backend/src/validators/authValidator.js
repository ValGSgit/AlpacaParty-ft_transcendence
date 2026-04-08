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

export const authLoginValidation = () => [
  userNameChain(body("username")),
  userPasswordChain(body("password")),
];
