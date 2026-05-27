/**
 * Strip tags capable of executing scripts and dangerous attributes/URLs
 * without entity-encoding the surrounding text. Defense-in-depth — the
 * frontend uses Vue's {{ }} interpolation which already escapes, but this
 * ensures stored content is never a stored-XSS sink even if a v-html slips in.
 *
 * Iterates until no further matches are produced — this is what defeats the
 * classic nested-tag bypass `<scr<script>ipt>alert(1)</script>` where a
 * single-pass replace leaves a reassembled `<script>` behind.
 *
 * @param {string} str
 * @returns {string}
 */
const DANGEROUS_TAG_PAIRS = ["script", "iframe", "object", "form", "style"];
const DANGEROUS_SELF_CLOSING = ["embed", "link", "meta"];
const URL_ATTRS = ["href", "src", "xlink:href", "action", "formaction"];
const BAD_URL_SCHEMES = /^\s*(?:javascript|vbscript|data|file):/i;

function stripPairTags(str, tag) {
  // Greedy strip of a paired dangerous tag, also handles tags with attributes.
  const pattern = new RegExp(
    `<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`,
    "gi",
  );
  // Also strip unterminated opening tags (no closing tag in remainder).
  const openOnly = new RegExp(`<${tag}\\b[^>]*>`, "gi");
  return str.replace(pattern, "").replace(openOnly, "");
}

function stripSelfClosing(str, tag) {
  return str.replace(new RegExp(`<${tag}\\b[^>]*\\/?>`, "gi"), "");
}

function stripBadUrlAttrs(str) {
  // Remove href/src/etc. attributes whose value starts with a dangerous scheme.
  // Match attribute name = (quoted | unquoted) value.
  for (const attr of URL_ATTRS) {
    const re = new RegExp(
      `\\s${attr}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]*))`,
      "gi",
    );
    str = str.replace(re, (match, dq, sq, uq) => {
      const value = dq ?? sq ?? uq ?? "";
      return BAD_URL_SCHEMES.test(value) ? "" : match;
    });
  }
  return str;
}

export function stripDangerousHtml(str) {
  if (typeof str !== "string") return str;
  let out = str;
  let prev;
  // Iterate so that nested/overlapping bypasses (e.g. <scr<script>ipt>) are
  // eventually fully removed.
  let guard = 0;
  do {
    prev = out;
    for (const tag of DANGEROUS_TAG_PAIRS)
      out = stripPairTags(out, tag);
    for (const tag of DANGEROUS_SELF_CLOSING)
      out = stripSelfClosing(out, tag);
    // Inline event handlers: on*="..." | on*='...' | on*=value
    out = out.replace(
      /\son\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi,
      "",
    );
    out = stripBadUrlAttrs(out);
  } while (out !== prev && ++guard < 10);
  return out;
}
