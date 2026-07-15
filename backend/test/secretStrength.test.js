import { test } from "node:test";
import assert from "node:assert/strict";
import {
  jwtSecretProblems,
  MIN_SECRET_LENGTH,
} from "../src/config/secretStrength.js";

const strong = (c) => c.repeat(MIN_SECRET_LENGTH + 8);

test("accepts three long, distinct secrets", () => {
  const problems = jwtSecretProblems({
    JWT_SECRET: strong("a"),
    JWT_REFRESH_SECRET: strong("b"),
    JWT_PUBLIC_API_SECRET: strong("c"),
  });
  assert.deepEqual(problems, []);
});

test("rejects a secret shorter than the minimum length", () => {
  const problems = jwtSecretProblems({
    JWT_SECRET: "short",
    JWT_REFRESH_SECRET: strong("b"),
    JWT_PUBLIC_API_SECRET: strong("c"),
  });
  assert.ok(problems.some((p) => p.includes("JWT_SECRET") && p.includes("characters")));
});

test("rejects a known placeholder value regardless of case/whitespace", () => {
  const problems = jwtSecretProblems({
    JWT_SECRET: "  ChangeMe  ",
    JWT_REFRESH_SECRET: strong("b"),
    JWT_PUBLIC_API_SECRET: strong("c"),
  });
  assert.ok(problems.some((p) => p.includes("placeholder")));
});

test("rejects reusing the same secret across token types", () => {
  const shared = strong("a");
  const problems = jwtSecretProblems({
    JWT_SECRET: shared,
    JWT_REFRESH_SECRET: shared,
    JWT_PUBLIC_API_SECRET: strong("c"),
  });
  assert.ok(problems.some((p) => p.includes("must all be different")));
});

test("treats missing/undefined secrets as too short (no throw)", () => {
  const problems = jwtSecretProblems({
    JWT_SECRET: undefined,
    JWT_REFRESH_SECRET: null,
    JWT_PUBLIC_API_SECRET: strong("c"),
  });
  // undefined + null both stringify to "" → both flagged as too short, and
  // "" === "" collides → distinctness also flagged. The point is it never throws.
  assert.ok(problems.length >= 2);
});
