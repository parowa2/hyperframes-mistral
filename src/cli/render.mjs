import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { renderujProjekt } from "../lib/render.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const nazwa = process.argv[2];

if (!nazwa) {
  const lista = existsSync(join(ROOT, "projects"))
    ? readdirSync(join(ROOT, "projects")).filter((d) => existsSync(join(ROOT, "projects", d, "index.html")))
    : [];
  console.log("Dostępne projekty: " + (lista.join(", ") || "(brak)"));
  console.log("Użycie: npm run render -- <nazwa-projektu>");
  process.exit(lista.length ? 0 : 1);
}

const dir = join(ROOT, "projects", nazwa);
if (!existsSync(join(dir, "index.html"))) {
  console.error(`Brak projektu: ${dir}`);
  process.exit(1);
}
const meta = JSON.parse(readFileSync(join(dir, "meta.json"), "utf8"));
console.log(`Renderuję "${meta.name}" (${nazwa})...`);
renderujProjekt(dir, nazwa)
  .then((out) => console.log(`\nGotowe! Film: ${out}`))
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
