import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js");
const dest = join(ROOT, "vendor", "gsap.min.js");
if (existsSync(src) && !existsSync(dest)) {
  mkdirSync(join(ROOT, "vendor"), { recursive: true });
  copyFileSync(src, dest);
  console.log("Skopiowano gsap.min.js do vendor/");
}
