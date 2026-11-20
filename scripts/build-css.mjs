/* build-css.mjs, bundles the home page stylesheets into one small file.
   Run: npm run css   (re-run after editing any file listed below)
   The home page loads css/site.min.css so phones make one request instead of
   eight. Landing pages and demos still use their own files. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILES = ["base", "animations", "components", "layout", "audit", "showcase", "landing", "revamp"];

const min = (css) => css
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/[ \t]*\n[ \t]*/g, "\n")
  .replace(/\s*([{};])\s*/g, "$1")
  .replace(/\n+/g, " ")
  .replace(/ {2,}/g, " ")
  .trim();

const out = FILES.map((f) => min(readFileSync(join(ROOT, "css", f + ".css"), "utf8"))).join("\n");
writeFileSync(join(ROOT, "css", "site.min.css"), out + "\n");
console.log(`css/site.min.css written (${(out.length / 1024).toFixed(1)} KiB)`);
