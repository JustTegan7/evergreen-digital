/* =============================================================================
   html.js, tiny dependency-free HTML helpers for the website audit
   =============================================================================

   Regex-based on purpose: the audit only needs a handful of signals from one
   page, and avoiding an HTML parser keeps the function at zero npm
   dependencies like the rest of the site. These helpers are forgiving rather
   than exact, which is fine for a scored checklist.
   ============================================================================= */

const ENTITY_MAP = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", copy: "©" };

export function decodeEntities(str = "") {
  return str
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, name) => ENTITY_MAP[name.toLowerCase()] ?? m);
}

/** Removes comments, scripts, styles, noscript, svg and template blocks. */
export function stripNonContent(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, " ");
}

/** Visible-ish text of an HTML fragment, whitespace collapsed. */
export function textOf(html) {
  return decodeEntities(stripNonContent(html).replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Parses the attributes of a single opening tag string. */
export function parseAttrs(tag) {
  const attrs = {};
  const re = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  const inner = tag.replace(/^<\s*[^\s>/]+/, "").replace(/\/?>$/, "");
  let m;
  while ((m = re.exec(inner))) {
    attrs[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? "");
  }
  return attrs;
}

/** All opening tags of a given name, as attribute objects. */
export function findTags(html, name) {
  const re = new RegExp(`<${name}\\b[^>]*>`, "gi");
  return (html.match(re) || []).map((t) => ({ raw: t, attrs: parseAttrs(t) }));
}

/** All elements with inner HTML (non-nested match is fine for a, h1, title, button). */
export function findElements(html, name) {
  const re = new RegExp(`<${name}\\b([^>]*)>([\\s\\S]*?)<\\/${name}>`, "gi");
  const out = [];
  let m;
  while ((m = re.exec(html))) {
    out.push({ attrs: parseAttrs(`<${name} ${m[1]}>`), inner: m[2], index: m.index });
  }
  return out;
}

export function metaContent(html, key) {
  const k = key.toLowerCase();
  const tag = findTags(html, "meta").find(
    (t) => (t.attrs.name || "").toLowerCase() === k || (t.attrs.property || "").toLowerCase() === k
  );
  return tag ? (tag.attrs.content || "").trim() : null;
}

/** Every JSON-LD object on the page, flattened through @graph and arrays. */
export function jsonLdObjects(html) {
  const blocks = html.match(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi) || [];
  const out = [];
  const walk = (node) => {
    if (!node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach(walk);
    out.push(node);
    if (node["@graph"]) walk(node["@graph"]);
  };
  for (const block of blocks) {
    const json = block.replace(/^<script[^>]*>/i, "").replace(/<\/script>$/i, "");
    try {
      walk(JSON.parse(json));
    } catch {
      /* malformed JSON-LD is common; ignore it */
    }
  }
  return out;
}

export function schemaTypes(objects) {
  return objects.flatMap((o) => [].concat(o["@type"] || [])).map(String);
}
