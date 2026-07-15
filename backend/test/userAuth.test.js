import { test } from "node:test";
import assert from "node:assert/strict";
import { extractPasswordHash } from "../src/utils/userAuth.js";

test("returns null for missing/empty user (never feeds null to bcrypt)", () => {
  assert.equal(extractPasswordHash(null), null);
  assert.equal(extractPasswordHash(undefined), null);
  assert.equal(extractPasswordHash({}), null);
});

test("reads the hash from the joined userAuth row", () => {
  const user = { id: 1, userAuth: { passwordHash: "$2b$hash" } };
  assert.equal(extractPasswordHash(user), "$2b$hash");
});

test("falls back to the legacy top-level passwordHash", () => {
  assert.equal(extractPasswordHash({ id: 1, passwordHash: "$2b$legacy" }), "$2b$legacy");
});

test("prefers userAuth over the legacy field when both exist", () => {
  const user = { userAuth: { passwordHash: "new" }, passwordHash: "old" };
  assert.equal(extractPasswordHash(user), "new");
});

test("returns null when userAuth exists but has no hash", () => {
  assert.equal(extractPasswordHash({ userAuth: {} }), null);
});
