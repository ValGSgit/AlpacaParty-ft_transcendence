/**
 * Strips tags capable of executing scripts without entity-encoding the
 * surrounding text.  contentValidator intentionally skips .escape() so
 * Vue templates can render plain text without double-encoding.
 *
 * Does NOT remove benign formatting tags (<b>, <i>, etc.).
 *
 * @param {string} str
 * @returns {string}
 */
export function stripDangerousHtml(str) {
  return str
    .replace(/<script\b[\s\S]*?<\/script>/gi, "")
    .replace(/<iframe\b[\s\S]*?<\/iframe>/gi, "")
    .replace(/<object\b[\s\S]*?<\/object>/gi, "")
    .replace(/<embed\b[^>]*\/?>/gi, "")
    .replace(/<form\b[\s\S]*?<\/form>/gi, "")
    .replace(/<style\b[\s\S]*?<\/style>/gi, "")
    .replace(/\bon\w+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*)/gi, "");
}
