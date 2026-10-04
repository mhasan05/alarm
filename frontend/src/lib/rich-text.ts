// Rich text for description fields. Stored as a small, safe subset of HTML. The same cleaning runs on
// the server and in the browser (no DOM needed), so rendering never differs between the two.
// Older records hold plain text; they are shown with their line breaks kept.

/** The only tags rich text may contain; all attributes are dropped. */
const ALLOWED = new Set(["b", "strong", "i", "em", "u", "h3", "p", "br", "ul", "ol", "li", "blockquote", "div"]);
const TAG = /<\/?([a-zA-Z][a-zA-Z0-9]*)\b[^>]*>/g;

const escapeText = (t: string) => t.replace(/&(?![a-zA-Z]+;|#\d+;)/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** True when the value already holds rich-text markup (anything else is treated as plain text). */
export const isRich = (v: string) => /<(p|br|ul|ol|li|h3|b|strong|i|em|u|blockquote|div)\b/i.test(v);

/** Clean, safe HTML for display or storage. Plain text becomes paragraphs with line breaks. */
export function toSafeHtml(value: string | undefined | null): string {
  const v = value ?? "";
  if (!isRich(v)) {
    return v
      .split(/\n{2,}/)
      .map((para) => para.trim())
      .filter(Boolean)
      .map((para) => `<p>${escapeText(para).replace(/\n/g, "<br>")}</p>`)
      .join("");
  }
  // Drop script/style blocks entirely, then keep only allowed tags (without attributes).
  const noBlocks = v.replace(/<(script|style|iframe|object)\b[\s\S]*?<\/\1>/gi, "");
  let out = "";
  let last = 0;
  for (const m of noBlocks.matchAll(TAG)) {
    out += escapeText(noBlocks.slice(last, m.index));
    const name = m[1].toLowerCase();
    if (ALLOWED.has(name)) {
      const tag = name === "div" ? "p" : name; // editors wrap lines in <div>; store them as paragraphs
      out += m[0].startsWith("</") ? (tag === "br" ? "" : `</${tag}>`) : `<${tag}>`;
    }
    last = (m.index ?? 0) + m[0].length;
  }
  out += escapeText(noBlocks.slice(last));
  return out.replace(/<p>\s*<\/p>/g, "");
}

/** Plain text of a rich-text value: for search, short previews and length checks. */
export function plainText(value: string | undefined | null): string {
  const v = value ?? "";
  if (!isRich(v)) return v;
  return v
    .replace(/<(br|\/p|\/li|\/h3|\/div|\/blockquote)\s*\/?>/gi, " ")
    .replace(TAG, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
