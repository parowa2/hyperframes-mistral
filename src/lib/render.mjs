import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function renderujProjekt(projectDir, outName) {
  const outDir = join(ROOT, "output");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, outName.endsWith(".mp4") ? outName : `${outName}.mp4`);
  const hf = join(ROOT, "tools", "hf");
  return new Promise((resolve, reject) => {
    const child = spawn(hf, ["render", "-o", out, "."], {
      cwd: projectDir,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let log = "";
    child.stdout.on("data", (d) => {
      log += d;
      process.stdout.write(d);
    });
    child.stderr.on("data", (d) => {
      log += d;
      process.stderr.write(d);
    });
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`Render zakończony kodem ${code}`));
    });
  });
}
