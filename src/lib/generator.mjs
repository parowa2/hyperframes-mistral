import { mkdirSync, writeFileSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { slugify, SVG_PRESETY } from "./spec.mjs";
import { generujDzwiek } from "./sfx.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const SVG = {
  gwiazda: '<svg viewBox="0 0 100 100"><path d="M50 5 L61 38 L96 38 L68 59 L79 93 L50 72 L21 93 L32 59 L4 38 L39 38 Z" fill="currentColor"/></svg>',
  blyskawica: '<svg viewBox="0 0 100 100"><path d="M55 5 L25 55 L45 55 L40 95 L75 40 L52 40 Z" fill="currentColor"/></svg>',
  serce: '<svg viewBox="0 0 100 100"><path d="M50 88 C20 62 8 44 8 30 C8 16 19 8 30 8 C39 8 46 13 50 20 C54 13 61 8 70 8 C81 8 92 16 92 30 C92 44 80 62 50 88 Z" fill="currentColor"/></svg>',
  ksiezyc: '<svg viewBox="0 0 100 100"><path d="M65 8 A42 42 0 1 0 65 92 A34 34 0 1 1 65 8 Z" fill="currentColor"/></svg>',
  fala: '<svg viewBox="0 0 200 100"><path d="M0 50 Q25 20 50 50 T100 50 T150 50 T200 50 L200 100 L0 100 Z" fill="currentColor"/></svg>',
  strzalka: '<svg viewBox="0 0 100 100"><path d="M5 45 L60 45 L60 25 L95 50 L60 75 L60 55 L5 55 Z" fill="currentColor"/></svg>',
  okrag: '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="11"/></svg>',
  kwiat: '<svg viewBox="0 0 100 100"><g fill="currentColor"><circle cx="50" cy="24" r="16"/><circle cx="75" cy="42" r="16"/><circle cx="66" cy="71" r="16"/><circle cx="34" cy="71" r="16"/><circle cx="25" cy="42" r="16"/></g><circle cx="50" cy="50" r="11" fill="#00000055"/></svg>',
};
const SVG_NAZWY = Object.keys(SVG);

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

function efektWejscie(effect, i, dims) {
  const { W, minSide } = dims;
  const effects = ["fade", "slide", "typewriter", "zoom", "pop", "stagger", "bounce", "wipe"];
  const e = effect === "mix" ? effects[i % effects.length] : effect;
  switch (e) {
    case "slide":
      return { from: { x: (i % 2 === 0 ? -1 : 1) * W * 0.18, opacity: 0 }, to: { x: 0, opacity: 1 }, ease: "power3.out" };
    case "typewriter":
      return { from: { clipPath: "inset(0 100% 0 0)", opacity: 1 }, to: { clipPath: "inset(0 0% 0 0)", opacity: 1 }, ease: "power2.inOut" };
    case "wipe":
      return { from: { clipPath: "inset(0 100% 0 0)", x: -W * 0.06, opacity: 1 }, to: { clipPath: "inset(0 0% 0 0)", x: 0, opacity: 1 }, ease: "power2.inOut" };
    case "zoom":
      return { from: { scale: 1.25, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "power3.out" };
    case "pop":
      return { from: { scale: 0.6, opacity: 0 }, to: { scale: 1, opacity: 1 }, ease: "back.out(1.8)" };
    case "stagger":
      return { letters: true, from: { opacity: 0, y: minSide * 0.05, rotate: 8 }, to: { opacity: 1, y: 0, rotate: 0 }, ease: "back.out(2)" };
    case "bounce":
      return { from: { y: -minSide * 0.35, opacity: 0 }, to: { y: 0, opacity: 1 }, ease: "bounce.out" };
    default:
      return { from: { opacity: 0, filter: "blur(14px)" }, to: { opacity: 1, filter: "blur(0px)" }, ease: "power4.out" };
  }
}

function svgDlaSceny(s, spec, i) {
  const wybor = s.svg || spec.svg;
  if (!wybor) return null;
  if (wybor === "mix") return SVG_NAZWY[i % SVG_NAZWY.length];
  return SVG[wybor] ? wybor : null;
}

function stylCss(style, P, dims) {
  const { minSide } = dims;
  const jasne = parseInt(P.tlo.slice(1, 3), 16) > 127;
  if (style === "kinowy") {
    return `
      .bar { position: absolute; left: 0; right: 0; height: 7%; background: #000; z-index: 6; }
      .bar-top { top: 0; } .bar-bottom { bottom: 0; }
      #vignette { position: absolute; inset: 0; z-index: 5; pointer-events: none;
        background: radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.5) 100%); }
      #progress-wrap { bottom: 7%; }
      #counter, #watermark { bottom: 9%; }`;
  }
  if (style === "grid") {
    return `
      #grid-bg { position: absolute; inset: 0; pointer-events: none;
        background-image: linear-gradient(${P.akcent}17 1px, transparent 1px), linear-gradient(90deg, ${P.akcent}17 1px, transparent 1px);
        background-size: ${Math.round(minSide * 0.09)}px ${Math.round(minSide * 0.09)}px; }`;
  }
  if (style === "gradient") {
    return `
      #grad-bg { position: absolute; inset: 0; pointer-events: none;
        background: linear-gradient(120deg, ${P.tlo}, ${P.akcent}59, ${P.tlo});
        background-size: 300% 300%; }`;
  }
  if (style === "karta") {
    const tloKarty = jasne ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.07)";
    return `
      .scene-inner { background: ${tloKarty}; border: 1px solid ${P.akcent}55;
        border-radius: ${Math.round(minSide * 0.03)}px; padding: ${Math.round(minSide * 0.05)}px ${Math.round(minSide * 0.07)}px;
        backdrop-filter: blur(8px); }`;
  }
  return "";
}

function tloDlaStylu(style) {
  if (style === "kinowy") return `<div class="bar bar-top"></div><div class="bar bar-bottom"></div><div id="vignette"></div>`;
  if (style === "grid") return `<div id="grid-bg"></div>`;
  if (style === "gradient") return `<div id="grad-bg"></div>`;
  return "";
}

function budujHtml(spec) {
  const { sceny, total } = layoutScen(spec);
  const { width: W, height: H, palette: P } = spec;
  const minSide = Math.min(W, H);
  const dims = { W, H, minSide };
  const fontSize = Math.round(minSide * 0.088);
  const subSize = Math.round(minSide * 0.042);
  const barH = Math.max(3, Math.round(H * 0.006));
  const pad = Math.round(minSide * 0.06);
  const artSize = Math.round(minSide * 0.2);

  const warstwy = sceny
    .map((s) => {
      const eff = efektWejscie(s.effect || spec.effect, s.index, dims);
      const svgName = svgDlaSceny(s, spec, s.index);
      const art = svgName
        ? `<div class="scene-art" id="art-${s.index}" style="color:${P.akcent};width:${artSize}px">${SVG[svgName]}</div>`
        : "";
      let tresc = escapeHtml(s.text);
      if (eff.letters) {
        tresc = [...s.text].map((ch) => `<span class="ch">${ch === " " ? "&nbsp;" : escapeHtml(ch)}</span>`).join("");
      }
      const sub = s.sub
        ? `<p class="scene-sub" style="font-size:${subSize}px;color:${P.wyciszony}">${escapeHtml(s.sub)}</p>`
        : "";
      return `
    <div class="scene" id="scene-${s.index}" data-start="${s.start.toFixed(3)}" data-duration="${s.duration.toFixed(3)}" data-track-index="${s.index}">
      <div class="scene-inner" id="scene-inner-${s.index}">
        ${art}
        <div class="accent-bar" style="height:${barH}px;background:${P.akcent}"></div>
        <h1 class="scene-text" style="font-size:${fontSize}px;color:${P.tekst}">${tresc}</h1>
        ${sub}
      </div>
    </div>`;
    })
    .join("\n");

  const animacje = sceny
    .map((s) => {
      const eff = efektWejscie(s.effect || spec.effect, s.index, dims);
      const enterDur = Math.min(0.7, s.duration * 0.35);
      const exitDur = Math.min(0.45, s.duration * 0.3);
      const target = `#scene-inner-${s.index}`;
      const svgName = svgDlaSceny(s, spec, s.index);
      let enter;
      if (eff.letters) {
        enter = `tl.fromTo(${JSON.stringify(target + " .ch")}, ${JSON.stringify(eff.from)}, { ...${JSON.stringify(eff.to)}, duration: ${enterDur.toFixed(3)}, stagger: 0.035, ease: "${eff.ease}" }, ${s.start.toFixed(3)});`;
      } else {
        const fromEntries = Object.entries(eff.from)
          .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
          .join(", ");
        const toEntries = Object.entries(eff.to)
          .map(([k, v]) => `${k}: ${typeof v === "number" ? v : JSON.stringify(v)}`)
          .join(", ");
        enter = `tl.fromTo(${JSON.stringify(target)}, { ${fromEntries} }, { ${toEntries}, duration: ${enterDur.toFixed(3)}, ease: "${eff.ease}" }, ${s.start.toFixed(3)});`;
      }
      const artAnim = svgName
        ? `
      tl.fromTo("#art-${s.index}", { scale: 0, rotate: -25, opacity: 0 }, { scale: 1, rotate: 0, opacity: 1, duration: ${enterDur.toFixed(3)}, ease: "back.out(1.6)" }, ${s.start.toFixed(3)});
      tl.to("#art-${s.index}", { y: ${(-artSize * 0.12).toFixed(1)}, yoyo: true, repeat: -1, duration: 0.9, ease: "sine.inOut" }, ${(s.start + enterDur).toFixed(3)});`
        : "";
      return `
      tl.set("#scene-${s.index}", { visibility: "visible" }, ${s.start.toFixed(3)});
      ${enter}${artAnim}
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

  const gradientAnim = spec.style === "gradient"
    ? `
      tl.fromTo("#grad-bg", { backgroundPosition: "0% 50%" }, { backgroundPosition: "100% 50%", duration: ${total.toFixed(3)}, ease: "none", repeat: -1, yoyo: true }, 0);`
    : "";

  const audio = spec.sound && spec.sound !== "brak"
    ? sceny
        .map((s) => `<audio src="./assets/${spec.sound}.wav" data-start="${s.start.toFixed(3)}" data-volume="0.85" preload="auto"></audio>`)
        .join("\n      ")
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
        z-index: 2;
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
      .scene-art { flex: none; }
      .scene-art svg { width: 100%; height: auto; display: block; }
      .accent-bar { width: ${Math.round(minSide * 0.12)}px; border-radius: 999px; }
      .scene-text { font-weight: 700; line-height: 1.15; letter-spacing: -0.02em; max-width: 90%; }
      .scene-text .ch { display: inline-block; }
      .scene-sub { line-height: 1.4; max-width: 80%; font-weight: 400; }
      #progress-wrap {
        position: absolute;
        left: 0; right: 0; bottom: 0;
        height: ${barH}px;
        background: ${P.wyciszony}22;
        z-index: 6;
      }
      #progress { width: 100%; height: 100%; transform: scaleX(0); transform-origin: left center; }
      #counter {
        position: absolute;
        right: ${pad}px;
        bottom: ${Math.round(barH + minSide * 0.025)}px;
        font-size: ${Math.round(minSide * 0.022)}px;
        font-weight: 600;
        letter-spacing: 0.08em;
        z-index: 6;
      }
      #watermark {
        position: absolute;
        left: ${pad}px;
        bottom: ${Math.round(barH + minSide * 0.025)}px;
        font-size: ${Math.round(minSide * 0.022)}px;
        opacity: 0.6;
        letter-spacing: 0.04em;
        z-index: 6;
      }
      ${stylCss(spec.style, P, dims)}
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
      ${tloDlaStylu(spec.style)}
      ${warstwy}
      ${progressHtml}
      ${counterHtml}
      ${watermark}
      ${audio}
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#glow", { x: 0 }, { x: ${Math.round(W * 0.12)}, duration: ${Math.max(1, total * 0.5).toFixed(3)}, yoyo: true, repeat: -1, ease: "sine.inOut" }, 0);
      ${animacje}
      ${progress}
      ${gradientAnim}
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
  let sound = spec.sound;
  if (sound && sound !== "brak") {
    try {
      generujDzwiek(sound, join(dir, "assets"));
    } catch (e) {
      console.warn(`Dźwięk "${sound}" pominięty: ${e.message}`);
      sound = "brak";
    }
  }
  spec = { ...spec, sound };
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
