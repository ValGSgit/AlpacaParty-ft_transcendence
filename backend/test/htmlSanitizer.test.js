import { test } from "node:test";
import assert from "node:assert/strict";
import { stripDangerousHtml } from "../src/utils/htmlSanitizer.js";

test("leaves plain text untouched", () => {
  assert.equal(stripDangerousHtml("hello world"), "hello world");
});

test("removes script tags and their body", () => {
  assert.equal(stripDangerousHtml("a<script>alert(1)</script>b"), "ab");
});

test("collapses reassembly-based obfuscation", () => {
  // <scr<script>ipt> should not survive as a working <script> after one pass.
  const out = stripDangerousHtml("<scr<script>ipt>alert(1)</script>");
  assert.ok(!/<script/i.test(out), `still contains a script tag: ${out}`);
});

test("strips inline event handlers", () => {
  const out = stripDangerousHtml('<div onclick="steal()">hi</div>');
  assert.ok(!/onclick/i.test(out), out);
});

test("strips javascript: URLs from href/src", () => {
  const out = stripDangerousHtml('<a href="javascript:alert(1)">x</a>');
  assert.ok(!/javascript:/i.test(out), out);
});

test("keeps safe URLs", () => {
  const input = '<a href="https://example.com">ok</a>';
  assert.ok(stripDangerousHtml(input).includes("https://example.com"));
});

test("removes iframe/object/embed", () => {
  assert.ok(!/iframe/i.test(stripDangerousHtml('<iframe src="x"></iframe>')));
  assert.ok(!/embed/i.test(stripDangerousHtml('<embed src="x">')));
});

test("returns non-string input unchanged", () => {
  assert.equal(stripDangerousHtml(123), 123);
  assert.equal(stripDangerousHtml(null), null);
});
