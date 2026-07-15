import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseLimitOffset,
  parseIdParam,
  clampInt,
  getPagination,
} from "../src/utils/pagination.js";

test("parseLimitOffset applies defaults for missing values", () => {
  assert.deepEqual(parseLimitOffset({}, { defaultLimit: 20, maxLimit: 100 }), {
    limit: 20,
    offset: 0,
  });
});

test("parseLimitOffset clamps limit to maxLimit and floors at 1", () => {
  assert.equal(parseLimitOffset({ limit: "9999" }, { maxLimit: 100 }).limit, 100);
  assert.equal(parseLimitOffset({ limit: "0" }).limit, 1);
  assert.equal(parseLimitOffset({ limit: "-5" }).limit, 1);
});

test("parseLimitOffset rejects junk and negative offset", () => {
  assert.equal(parseLimitOffset({ limit: "abc" }, { defaultLimit: 20 }).limit, 20);
  assert.equal(parseLimitOffset({ offset: "-10" }).offset, 0);
  assert.equal(parseLimitOffset({ offset: "nope" }).offset, 0);
});

test("parseIdParam accepts positive integers only", () => {
  assert.equal(parseIdParam("42"), 42);
  assert.equal(parseIdParam("0"), null);
  assert.equal(parseIdParam("-3"), null);
  assert.equal(parseIdParam("1.5"), null);
  assert.equal(parseIdParam("abc"), null);
  assert.equal(parseIdParam(""), null);
  assert.equal(parseIdParam(undefined), null);
});

test("clampInt bounds values and rejects NaN", () => {
  assert.equal(clampInt("50", 0, 100), 50);
  assert.equal(clampInt(500, 0, 100), 100);
  assert.equal(clampInt(-5, 0, 100), 0);
  assert.equal(clampInt("not-a-number", 0, 100), 0);
  assert.equal(clampInt(7.9, 0, 100), 7); // truncates
});

test("getPagination computes skip/take with sane minimums", () => {
  assert.deepEqual(getPagination({ page: "2", pageSize: "10" }), {
    pageNumber: 2,
    pageSizeNumber: 10,
    skip: 10,
    take: 10,
  });
  // "0" is falsy so it hits the default (10); a negative survives parseInt and
  // is then floored to 1 by Math.max.
  assert.equal(getPagination({ pageSize: "0" }).pageSizeNumber, 10);
  const clamped = getPagination({ page: "-1", pageSize: "-5" });
  assert.equal(clamped.pageNumber, 1);
  assert.equal(clamped.pageSizeNumber, 1);
  assert.equal(clamped.skip, 0);
});
