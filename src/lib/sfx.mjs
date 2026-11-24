import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export const SFX_PRESETY = {
  pop: "aevalsrc=0.9*sin(2*PI*(520-900*t)*t)*exp(-18*t):s=44100:d=0.22",
  ding: "aevalsrc=0.6*sin(2*PI*880*t)*exp(-7*t)+0.4*sin(2*PI*1318.5*t)*exp(-9*t):s=44100:d=0.6",
  whoosh: "anoisesrc=color=pink:duration=0.5:amplitude=0.8,asetrate=44100,afade=t=in:d=0.05,afade=t=out:st=0.15:d=0.35,lowpass=f=1800",
  click: "aevalsrc=0.8*sin(2*PI*1200*t)*exp(-60*t):s=44100:d=0.06",
  zap: "aevalsrc=0.5*sin(2*PI*(300+2200*t)*t)*exp(-8*t):s=44100:d=0.35",
};

export function znajdzFfmpeg() {
  const lokalny = join(ROOT, "vendor", "sysroot", "usr", "bin", "ffmpeg");
  if (process.env.HYPERFRAMES_FFMPEG_PATH && existsSync(process.env.HYPERFRAMES_FFMPEG_PATH)) {
    return process.env.HYPERFRAMES_FFMPEG_PATH;
  }
  if (existsSync(lokalny)) return lokalny;
  return "ffmpeg";
}

export function generujDzwiek(nazwa, destDir) {
  const expr = SFX_PRESETY[nazwa];
  if (!expr) throw new Error(`Nieznany dźwięk: ${nazwa}`);
  mkdirSync(destDir, { recursive: true });
  const dest = join(destDir, `${nazwa}.wav`);
  const ffmpeg = znajdzFfmpeg();
  const env = { ...process.env };
  if (ffmpeg.includes(join("vendor", "sysroot"))) {
    const sr = join(ROOT, "vendor", "sysroot");
    env.LD_LIBRARY_PATH = [
      join(sr, "usr/lib/x86_64-linux-gnu"),
      join(sr, "usr/lib/x86_64-linux-gnu/pulseaudio"),
      join(sr, "usr/lib/x86_64-linux-gnu/blas"),
      join(sr, "usr/lib/x86_64-linux-gnu/lapack"),
      join(sr, "lib/x86_64-linux-gnu"),
      env.LD_LIBRARY_PATH,
    ].filter(Boolean).join(":");
  }
  execFileSync(ffmpeg, ["-y", "-v", "error", "-f", "lavfi", "-i", expr, "-ar", "44100", "-ac", "1", dest], { env });
  return dest;
}
