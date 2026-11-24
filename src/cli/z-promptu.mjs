import { parsujPrompt, walidujSpec, slugify } from "../lib/spec.mjs";
import { generujProjekt } from "../lib/generator.mjs";
import { renderujProjekt } from "../lib/render.mjs";
import { stworzAnkiete } from "../lib/ankieta.mjs";

const args = process.argv.slice(2);
const flagi = new Set(args.filter((a) => a.startsWith("--")));
const prompt = args.filter((a) => !a.startsWith("--") && !a.startsWith("--nazwa=") && args[args.indexOf(a) - 1] !== "--nazwa").join(" ").trim();

function argFlag(nazwa) {
  const i = args.indexOf(nazwa);
  return i >= 0 ? args[i + 1] : null;
}

async function main() {
  if (!prompt) {
    console.error("Podaj prompt, np.: npm run z-promptu -- \"Neonowy intro o podróżach, 3 sceny po 3 sekundy, pion 9:16, efekt typewriter\"");
    process.exit(1);
  }
  const pytania = flagi.has("--pytania") || flagi.has("--ankieta");
  const bezRenderu = flagi.has("--bez-renderu");
  const nazwa = argFlag("--nazwa") || slugify(prompt.slice(0, 40));

  let spec = parsujPrompt(prompt);
  spec = walidujSpec(spec);

  if (pytania) {
    const ank = stworzAnkiete();
    const pytaj = ank.pytaj;
    const title = await pytaj("Tytuł filmu", spec.title);
    const roz = await pytaj(`Rozdzielczość ${spec.width}×${spec.height} — zostaw, lub wpisz np. 1080x1920`, `${spec.width}x${spec.height}`);
    const [w, h] = roz.toLowerCase().split("x").map(Number);
    const czas = await pytaj("Całkowity czas w sekundach (puste = suma scen)", spec.duration ? String(spec.duration) : "");
    const efekt = await pytaj("Efekt (fade/slide/typewriter/zoom/pop/mix)", spec.effect);
    const sceny = await pytaj("Sceny oddzielone | (puste = wykryte z promptu)", spec.scenes.map((s) => s.text).join(" | "));
    ank.zamknij();
    spec = walidujSpec({
      ...spec,
      title,
      width: w || spec.width,
      height: h || spec.height,
      duration: czas ? Number(czas) : null,
      effect: efekt || spec.effect,
      scenes: sceny ? sceny.split("|").map((s) => s.trim()).filter(Boolean) : spec.scenes.map((s) => s.text),
    });
  }

  console.log(`\nPrompt: ${prompt}`);
  console.log(`Specyfikacja: ${spec.scenes.length} scen, ${spec.width}×${spec.height} @ ${spec.fps} fps, efekt ${spec.effect}, paleta ${typeof spec.palette === "object" ? spec.palette.akcent : spec.palette}`);
  spec.scenes.forEach((s, i) => console.log(`  scena ${i + 1}: ${s.text.slice(0, 70)} (${s.duration}s)`));

  const { slug, dir } = generujProjekt(spec, nazwa);
  console.log(`\nProjekt: ${dir}`);

  if (!bezRenderu) {
    try {
      const out = await renderujProjekt(dir, slug);
      console.log(`\nGotowe! Film: ${out}`);
    } catch (e) {
      console.error(`\nRender nieudany: ${e.message}`);
      process.exitCode = 1;
    }
  } else {
    console.log("\n(bez renderu — użyj: npm run render -- " + slug + ")");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
