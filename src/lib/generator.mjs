import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify } from "./spec.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function layoutScen(spec) {
  const overlap = Math.min(0.4, spec.sceneDuration * 0.15);
  const n = spec.scenes.length;
  let t = 0;
  const sceny = spec.scenes.map((s, i) => {
    const start = i === 0 ? 0 : t - overlap;
    const end = start + s.duration;
    t = end;
    return { ...s, start, end, index: i };
  });
  const total = sceny[n - 1].end;
  if (spec.duration && spec.duration !== total) {
    const scale = spec.duration / total;
    for (const s of sceny) {
      s.start *= scale;
      s.end *= scale;
      s.duration *= scale;
    }
    return { sceny, total: spec.duration };
  }
  return { sceny, total };
}

function efektWejscie(effect, i) {
  const effects = ["fade", "slide", "typewriter", "zoom", "pop"];
  const e = effect === "mix" ? effects[i % effects.length] : effect;
  switch (e) {
    case "slide":
      return { from: { x: (i % 2 === 0 ? -1 : 1) * 0.18, opacity: 0 }, to: { x: 0, opacity: 1 }, ease: "power3.out" };
    case "typewriter":
      return { from: { clipPath: "inset(0 100% 0 0)", opacity: 1 }, to: { clipPath: "inset(0 0% 0 0)", opacity: 1 }, ease: "power2.inOut" };
    case "zoom":
      return { from: { scale: 1.25, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "power3.out" };
    case "pop":
      return { from: { scale: 0.6, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "back.out(1.8)" };
    default:
      return { from: { opacity: 0, filter: "blur(14px)" }, to: { opacity: 1, filter: "blur(0px)" }, ease: "power4.out" };
  }
}

function budujHtml(spec) {
  const { sceny, total } = layoutScen(spec);
  const { width: W, height: H, palette: P } = spec;
  const minSide = Math.min(W, H);
  const fontSize = Math.round(minSide * 0.088);
  const subSize = Math.round(minSide * 0.042);
  const barH = Math.max(3, Math.round(H * 0.006));
  const pad = Math.round(minSide * 0.06);

  const warstwy = sceny
    .map((s) => {
      const eff = efektWejscie(spec.effect, s.index);
      const enterDur = Math.min(0.7, s.duration * 0.35);
      const exitDur = Math.min(0.45, s.duration * 0.3);
      const sub = s.sub
        ? `<p class="scene-sub" style="font-size:${subSize}px;color:${P.wyciszony}">${escapeHtml(s.sub)}</p>`
        : "";
      return `
    <div class="scene" id="scene-${s.index}" data-start="${s.start.toFixed(3)}" data-duration="${s.duration.toFixed(3)}" data-track-index="${s.index}">
      <div class="scene-inner" id="scene-inner-${s.index}">
        <div class="accent-bar" style="height:${barH}px;background:${P.akcent}"></div>
        <h1 class="scene-text" style="font-size:${fontSize}px;color:${P.tekst}">${escapeHtml(s.text)}</h1>
        ${sub}
      </div>
    </div>`;
    })
    .join("\n");

  const animacje = sceny
    .map((s) => {
      const eff = efektWejscie(s.effect || spec.effect, s.index);
      const enterDur = Math.min(0.7, s.duration * 0.35);
      const exitDur = Math.min(0.45, s.duration * 0.3);
      const target = `#scene-inner-${s.index}`;
      const fromEntries = Object.entries(eff.from)
        .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
        .join(", ");
      const toEntries = Object.entries(eff.to)
        .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
        .join(", ");
      return `
      tl.set("#scene-${s.index}", { visibility: "visible" }, ${s.start.toFixed(3)});
      tl.fromTo(${JSON.stringify(target)}, { ${fromEntries} }, { ${toEntries}, duration: ${enterDur.toFixed(3)}, ease: "${eff.ease}" }, ${s.start.toFixed(3)});
      tl.to(${JSON.stringify(target)}, { opacity: 0, duration: ${exitDur.toFixed(3)}, ease: "power2.in" }, ${(s.end - exitDur).toFixed(3)});
      tl.set("#scene-${s.index}", { visibility: "hidden" }, ${s.end.toFixed(3)});`;
    })
    .join("\n");

  const counter = spec.extras.sceneCounter
    ? `
      tl.call(() => { document.getElementById("counter").textContent = "1 / ${sceny.length}"; }, null, 0);` +
      sceny
        .map((s) => `
      tl.call(() => { document.getElementById("counter").textContent = "${s.index + 1} / ${sceny.length}"; }, null, ${s.start.toFixed(3)});`)
        .join("")
    : "";

  const progress = spec.extras.progressBar
    ? `
      tl.fromTo("#progress", { scaleX: 0 }, { scaleX: 1, duration: ${total.toFixed(3)}, ease: "none" }, 0);`
    : "";

  const watermark = spec.extras.watermark
    ? `<div id="watermark" style="color:${P.wyciszony}">${escapeHtml(spec.extras.watermark)}</div>`
    : "";
  const counterHtml = spec.extras.sceneCounter
    ? `<div id="counter" style="color:${P.wyciszony}">1 / ${sceny.length}</div>`
    : "";
  const progressHtml = spec.extras.progressBar ? `<div id="progress-wrap"><div id="progress" style="background:${P.akcent}"></div></div>` : "";

  return `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="./gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body {
        margin: 0;
        width: ${W}px;
        height: ${H}px;
        overflow: hidden;
        background: ${P.tlo};
      }
      #root {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        font-family: "DejaVu Sans", sans-serif;
      }
      #glow {
        position: absolute;
        width: ${Math.round(W * 0.7)}px;
        height: ${Math.round(W * 0.7)}px;
        left: ${Math.round(W * 0.15)}px;
        top: ${Math.round(H * 0.15)}px;
        background: radial-gradient(circle, ${P.akcent}33 0%, transparent 65%);
        opacity: 0.35;
        pointer-events: none;
      }
      .scene {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        visibility: hidden;
      }
      .scene-inner {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: ${Math.round(minSide * 0.03)}px;
        padding: 0 ${pad}px;
        text-align: center;
        max-width: 100%;
      }
      .accent-bar { width: ${Math.round(minSide * 0.12)}px; border-radius: 999px; }
      .scene-text { font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; max-width: 90%; }
      .scene-sub { line-height: 1.4; max-width: 80%; font-weight: 400; }
      #progress-wrap {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: ${barH}px;
        background: ${P.wyciszony}22;
      }
      #progress { width: 100%; height: 100%; transform: scaleX(0); transform-origin: left center; }
      #counter {
        position: absolute;
        right: ${pad}px;
        bottom: ${Math.round(barH + minSide * 0.025)}px;
        font-size: ${Math.round(minSide * 0.022)}px;
        font-weight: 600;
        letter-spacing: 0.08em;
      }
      #watermark {
        position: absolute;
        left: ${pad}px;
        bottom: ${Math.round(barH + minSide * 0.025)}px;
        font-size: ${Math.round(minSide * 0.022)}px;
        opacity: 0.6;
        letter-spacing: 0.04em;
      }
    </style>
  </head>
  <body>
    <div
      id="root"
      data-composition-id="main"
      data-start="0"
      data-duration="${total.toFixed(3)}"
      data-fps="${spec.fps}"
      data-width="${W}"
      data-height="${H}"
    >
      <div id="glow"></div>
      ${warstwy}
      ${progressHtml}
      ${counterHtml}
      ${watermark}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#glow", { x: 0 }, { x: ${Math.round(W * 0.12)}, duration: ${Math.max(1, total * 0.5).toFixed(3)}, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0);
      ${animacje}
      ${progress}
      ${counter}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
}

function znajdzGsap() {
  const candidates = [
    join(ROOT, "node_modules", "gsap", "dist", "gsap.min.js"),
    join(ROOT, "vendor", "gsap.min.js"),
  ];
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("Brak pliku gsap.min.js — uruchom najpierw: npm install");
  return found;
}

export function generujProjekt(spec, nazwa) {
  const slug = slugify(nazwa || spec.title);
  const dir = join(ROOT, "projects", slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "index.html"), budujHtml(spec));
  writeFileSync(
    join(dir, "hyperframes.json"),
    JSON.stringify(
      {
        $schema: "https://hyperframes.heygen.com/schema/hyperframes.json",
        paths: { blocks: "compositions", components: "compositions/components", assets: "assets" },
        media: { autoProxy: true },
      },
      null,
      2
    ) + "\n"
  );
  writeFileSync(
    join(dir, "meta.json"),
    JSON.stringify({ id: slug, name: spec.title, createdAt: new Date().toISOString() }, null, 2) + "\n"
  );
  copyFileSync(znajdzGsap(), join(dir, "gsap.min.js"));
  writeFileSync(join(dir, "spec.json"), JSON.stringify({ ...spec, slug }, null, 2) + "\n");
  return { slug, dir };
}
