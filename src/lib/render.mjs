import { spawn } from "node:child_process";
import { mkdirSync, chmodSync } from "node:fs";
import { join, dirname } from "node:path";
import { homedir } from "node:os";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

function prywatnyCache() {
  const base = (process.env.HYPERFRAMES_CACHE_DIR || join(homedir(), ".hf-cache", "hyperframes")).replace(/[/\\]hyperframes$/, "");
  for (const d of [base, join(base, "hyperframes"), join(base, "puppeteer")]) {
    mkdirSync(d, { recursive: true });
    try { chmodSync(d, 0o700); } catch {}
  }
  return {
    HYPERFRAMES_CACHE_DIR: join(base, "hyperframes"),
    PUPPETEER_CACHE_DIR: join(base, "puppeteer"),
    XDG_CACHE_HOME: base,
  };
}

export function renderujProjekt(projectDir, outName) {
  const outDir = join(ROOT, "output");
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, outName.endsWith(".mp4") ? outName : `${outName}.mp4`);
  const hf = join(ROOT, "tools", "hf");
  return new Promise((resolve, reject) => {
    const child = spawn(hf, ["render", "-o", out, "."], {
      cwd: projectDir,
      env: { ...process.env, ...prywatnyCache() },
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
