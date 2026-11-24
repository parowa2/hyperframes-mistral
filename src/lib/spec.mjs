export const PALETY = {
  noc: { nazwa: "Noc", tlo: "#0b0e17", tekst: "#f5f7ff", akcent: "#6ea8fe", wyciszony: "#8b93a7" },
  neon: { nazwa: "Neon", tlo: "#0a0a14", tekst: "#ffffff", akcent: "#00ffc8", wyciszony: "#7f8aa3" },
  zachod: { nazwa: "Zachód słońca", tlo: "#1b0f2e", tekst: "#ffe9d6", akcent: "#ff7a59", wyciszony: "#b08ba8" },
  morska: { nazwa: "Morska", tlo: "#062a3a", tekst: "#e8f6ff", akcent: "#2ec4ff", wyciszony: "#7fb2c9" },
  papier: { nazwa: "Papier (jasna)", tlo: "#f6f1e7", tekst: "#1c1c22", akcent: "#d64545", wyciszony: "#8a8577" },
  mieta: { nazwa: "Mięta", tlo: "#0d1f1a", tekst: "#eafff6", akcent: "#4ade80", wyciszony: "#7fae9b" },
  lawenda: { nazwa: "Lawenda", tlo: "#14101f", tekst: "#f1ecff", akcent: "#a78bfa", wyciszony: "#8d84ad" },
  klasyk: { nazwa: "Klasyczna czerń", tlo: "#000000", tekst: "#ffffff", akcent: "#ffd166", wyciszony: "#9a9a9a" },
};

export const EFEKTY = ["fade", "slide", "typewriter", "zoom", "pop", "mix"];

export const ROZDZIELCZOSCI = {
  "1": { label: "1920×1080 (Full HD, poziomo)", width: 1920, height: 1080 },
  "2": { label: "1280×720 (HD)", width: 1280, height: 720 },
  "3": { label: "1080×1920 (pion, Reels/TikTok)", width: 1080, height: 1920 },
  "4": { label: "1080×1080 (kwadrat)", width: 1080, height: 1080 },
  "5": { label: "3840×2160 (4K)", width: 3840, height: 2160 },
};

const KOLORY_PL = {
  czarny: "#111318", biały: "#ffffff", czerwony: "#e63946", niebieski: "#457b9d",
  zielony: "#2a9d8f", żółty: "#e9c46a", pomarańczowy: "#f4a261", fioletowy: "#7b2cbf",
  różowy: "#ff70a6", różowy2: "#ff70a6", turkusowy: "#2ec4b6", szary: "#6b7280", srebrny: "#c0c0c0",
};

export function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "film";
}

export function normalizujSceny(sceny, domyslnyCzas = 4) {
  const lista = (Array.isArray(sceny) ? sceny : [sceny])
    .map((s) => (typeof s === "string" ? { text: s } : s))
    .filter((s) => s && String(s.text || "").trim())
    .map((s) => ({
      text: String(s.text).trim(),
      sub: String(s.sub || "").trim(),
      duration: clamp(Number(s.duration) || domyslnyCzas, 1, 60),
      effect: EFEKTY.includes(s.effect) ? s.effect : null,
    }));
  if (!lista.length) lista.push({ text: "Twój film", sub: "", duration: domyslnyCzas, effect: null });
  return lista;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function walidujSpec(s) {
  const paleta = typeof s.palette === "string" && PALETY[s.palette]
    ? PALETY[s.palette]
    : { ...PALETY.noc, ...(s.palette || {}) };
  const scenes = normalizujSceny(s.scenes, s.sceneDuration || 4);
  const width = clamp(Math.round(Number(s.width) || 1920), 320, 3840);
  const height = clamp(Math.round(Number(s.height) || 1080), 320, 3840);
  return {
    title: String(s.title || "Film").slice(0, 200),
    width,
    height,
    fps: [24, 25, 30, 50, 60].includes(Number(s.fps)) ? Number(s.fps) : 30,
    sceneDuration: clamp(Number(s.sceneDuration) || 4, 1, 60),
    duration: s.duration ? clamp(Number(s.duration), 1, 600) : null,
    palette: paleta,
    effect: EFEKTY.includes(s.effect) ? s.effect : "mix",
    scenes,
    extras: {
      progressBar: s.extras?.progressBar !== false,
      sceneCounter: !!s.extras?.sceneCounter,
      watermark: String(s.extras?.watermark || ""),
    },
  };
}

export function parsujPrompt(prompt) {
  const p = ` ${prompt.toLowerCase()} `;
  const spec = { title: prompt.slice(0, 80), scenes: [], effect: "mix" };

  if (/pion|9:?16|tiktok|reels|shorts|stories/.test(p)) { spec.width = 1080; spec.height = 1920; }
  else if (/kwadrat|1:1|post na instagram/.test(p)) { spec.width = 1080; spec.height = 1080; }
  else if (/4k|uhd|3840/.test(p)) { spec.width = 3840; spec.height = 2160; }
  else if (/720p|1280/.test(p)) { spec.width = 1280; spec.height = 720; }
  else { spec.width = 1920; spec.height = 1080; }

  const fps = prompt.match(/(\d{2,3})\s*fps/i);
  if (fps) spec.fps = Number(fps[1]);

  const czasSceny = prompt.match(/(?:każda )?scen[a-ząćęłńóśźż]*[^.\d|]{0,25}(\d+)\s*(sekund\w*|sek|s)\b/i);
  if (czasSceny) spec.sceneDuration = Number(czasSceny[1]);
  const bezCzasuSceny = czasSceny ? prompt.replace(czasSceny[0], " ") : prompt;
  const minuty = bezCzasuSceny.match(/(\d+)\s*(minut\w*|min)\b/i);
  const czas = !minuty && bezCzasuSceny.match(/(\d+)\s*(sekund\w*|sek|s)\b(?!\w)/i);
  if (minuty) spec.duration = Number(minuty[1]) * 60;
  else if (czas) spec.duration = Number(czas[1]);

  if (/neon/.test(p)) spec.palette = "neon";
  else if (/zachód|zachod/.test(p)) spec.palette = "zachod";
  else if (/morska|morski|ocean/.test(p)) spec.palette = "morska";
  else if (/mięta|miętowa/.test(p)) spec.palette = "mieta";
  else if (/lawend|purpurow|fiolet/.test(p)) spec.palette = "lawenda";
  else if (/papier|jasn[ayy]|świetln/.test(p)) spec.palette = "papier";
  else if (/ciemn|noc|nocy/.test(p)) spec.palette = "noc";
  else spec.palette = "noc";

  const hex = prompt.match(/#[0-9a-fA-F]{6}\b/);
  if (hex) {
    spec.palette = { tlo: PALETY.noc.tlo, tekst: PALETY.noc.tekst, akcent: hex[0], wyciszony: PALETY.noc.wyciszony };
  } else {
    for (const [nazwa, kod] of Object.entries(KOLORY_PL)) {
      if (p.includes(` ${nazwa}`)) {
        const baza = PALETY[typeof spec.palette === "string" ? spec.palette : "noc"];
        spec.palette = { ...baza, akcent: kod };
        break;
      }
    }
  }

  if (/maszyna do pisania|typewriter|pisząc|litera po literze/.test(p)) spec.effect = "typewriter";
  else if (/szybk|dynamiczn|energicz|wjazd|\bslide\b/.test(p)) spec.effect = "slide";
  else if (/\bzoom\b|powiększ|przybliż/.test(p)) spec.effect = "zoom";
  else if (/zanikaj|\bfade\b|powoli|znikaj/.test(p)) spec.effect = "fade";
  else if (/\bpop\b|wybuch|uderz/.test(p)) spec.effect = "pop";

  if (/pasek postępu|progress bar/.test(p)) spec.extras = { ...(spec.extras || {}), progressBar: true };
  if (/licznik scen|numer sceny/.test(p)) spec.extras = { ...(spec.extras || {}), sceneCounter: true };
  const znak = prompt.match(/znak wodny[^"„]*[„"]([^"”]+)["”]/i);
  if (znak) spec.extras = { ...(spec.extras || {}), watermark: znak[1] };

  const cudzyslowy = [...prompt.matchAll(/[„"]([^"”]{3,200})[”"]/g)].map((m) => m[1].trim());
  let sceny = cudzyslowy;
  if (!sceny.length && prompt.includes("|")) sceny = prompt.split("|").map((s) => s.trim()).filter(Boolean);
  if (!sceny.length) {
    const numerowane = prompt.split(/(?:^|\s)\d+[.)]\s+/).map((s) => s.trim()).filter((s) => s.length > 2);
    if (numerowane.length > 1) sceny = numerowane;
  }
  if (!sceny.length) {
    sceny = prompt.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter((s) => s.length > 2).slice(0, 6);
  }
  if (!sceny.length) sceny = [prompt.trim()];
  spec.scenes = sceny.slice(0, 8);
  return spec;
}
