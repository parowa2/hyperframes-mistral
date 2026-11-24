import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const nazwa = process.argv[2];
if (!nazwa) {
  console.log("Użycie: npm run podglad -- <nazwa-projektu>  (podgląd na http://localhost:3002)");
  process.exit(1);
}
const dir = join(ROOT, "projects", nazwa);
if (!existsSync(join(dir, "index.html"))) {
  console.error(`Brak projektu: ${dir}`);
  process.exit(1);
}
const child = spawn(join(ROOT, "tools", "hf"), ["preview", "--port", "3002", "."], {
  cwd: dir,
  stdio: "inherit",
});
child.on("close", (c) => process.exit(c ?? 0));
