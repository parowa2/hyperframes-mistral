import { gunzipSync } from "node:zlib";
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const DEBS = join(ROOT, "vendor", "debs");
const SYSROOT = join(ROOT, "vendor", "sysroot");
const INDEX_URL =
  "https://deb.debian.org/debian/dists/trixie/main/binary-amd64/Packages.gz";

const SEEDS = [
  "libglib2.0-0", "libnspr4", "libnss3", "libatk1.0-0", "libatk-bridge2.0-0",
  "libdbus-1-3", "libx11-6", "libxcomposite1", "libxdamage1", "libxext6",
  "libxfixes3", "libxrandr2", "libgbm1", "libxcb1", "libxkbcommon0",
  "libasound2", "libatspi2.0-0", "libcups2", "libdrm2", "libpango-1.0-0",
  "libcairo2", "libfontconfig1", "fontconfig-config", "fonts-dejavu-core",
  "fonts-liberation", "ffmpeg", "libpulse0", "libblas3", "liblapack3", "libgfortran5",
];

function installedPackages() {
  try {
    const out = execFileSync("dpkg-query", ["-W", "-f=${Package}\n"], {
      encoding: "utf8",
    });
    return new Set(out.trim().split("\n"));
  } catch {
    return new Set();
  }
}

function systemSonames() {
  try {
    const out = execFileSync("ldconfig", ["-p"], { encoding: "utf8" });
    const names = new Set();
    for (const line of out.split("\n")) {
      const m = line.match(/\(([^)]+)\)/);
      if (m) names.add(m[1].trim());
      const arrow = line.split("->")[1];
      if (arrow) {
        const base = arrow.trim().split("/").pop();
        if (base.endsWith(".so") || base.includes(".so.")) names.add(base);
      }
    }
    return names;
  } catch {
    return new Set();
  }
}

async function fetchIndex() {
  const cache = join(DEBS, "Packages.gz");
  mkdirSync(DEBS, { recursive: true });
  if (!existsSync(cache)) {
    console.log("Pobieram indeks pakietów Debiana...");
    const res = await fetch(INDEX_URL);
    if (!res.ok) throw new Error(`index HTTP ${res.status}`);
    writeFileSync(cache, Buffer.from(await res.arrayBuffer()));
  }
  const text = gunzipSync(readFileSync(cache)).toString("utf8");
  const byName = new Map();
  const provides = new Map();
  for (const stanza of text.split("\n\n")) {
    const fields = {};
    let key = null;
    for (const line of stanza.split("\n")) {
      if (/^ /.test(line) && key) fields[key] += "\n" + line;
      else {
        const idx = line.indexOf(":");
        if (idx > 0) {
          key = line.slice(0, idx);
          fields[key] = line.slice(idx + 1).trim();
        }
      }
    }
    const name = fields["Package"];
    if (!name || !fields["Filename"]) continue;
    if (!byName.has(name)) byName.set(name, fields);
    for (const p of (fields["Provides"] || "").split(",")) {
      const pn = p.trim().split(/\s/)[0];
      if (pn && !provides.has(pn)) provides.set(pn, name);
    }
  }
  return { byName, provides };
}

function parseDep(entry) {
  return entry
    .split(",")
    .map((d) => d.trim())
    .map((d) => d.split("|").map((a) => a.trim().split(/\s/)[0].split("(")[0]))
    .filter((alts) => alts.length && alts.some(Boolean));
}

async function main() {
  const { byName, provides } = await fetchIndex();
  const installed = installedPackages();
  const sonames = systemSonames();

  const resolve = (name) => {
    if (byName.has(name)) return name;
    if (provides.has(name)) return provides.get(name);
    return null;
  };

  const queue = [...SEEDS];
  const chosen = new Map();
  const missing = new Set();

  while (queue.length) {
    const raw = queue.shift();
    if (!raw) continue;
    const pkg = resolve(raw);
    if (!pkg) {
      if (!installed.has(raw) && !sonames.has(raw)) missing.add(raw);
      continue;
    }
    if (installed.has(pkg) || chosen.has(pkg)) continue;
    chosen.set(pkg, byName.get(pkg));
    for (const alts of parseDep(chosen.get(pkg)["Depends"] || "")) {
      const pick = alts.map(resolve).find(Boolean);
      if (pick) queue.push(pick);
      else queue.push(alts[0]);
    }
  }

  console.log(`Do pobrania: ${chosen.size} pakietów`);
  if (missing.size) console.log("Nierozwiązane (pominięte):", [...missing].join(", "));

  for (const [pkg, f] of chosen) {
    const debPath = join(DEBS, pkg + ".deb");
    if (!existsSync(debPath)) {
      const url = `https://deb.debian.org/debian/${f["Filename"]}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${pkg}: HTTP ${res.status}`);
      writeFileSync(debPath, Buffer.from(await res.arrayBuffer()));
    }
    execFileSync("dpkg-deb", ["-x", debPath, SYSROOT]);
  }

  const fontDir = join(SYSROOT, "etc", "fontconfig");
  mkdirSync(fontDir, { recursive: true });
  writeFileSync(
    join(fontDir, "fonts.conf"),
    `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${SYSROOT}/usr/share/fonts</dir>
  <cachedir>/tmp/fontconfig-cache</cachedir>
  <include ignore_missing="yes">conf.d</include>
</fontconfig>
`
  );
  console.log("Sysroot gotowy:", SYSROOT);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
