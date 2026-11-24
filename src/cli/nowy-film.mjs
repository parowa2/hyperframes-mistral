import { walidujSpec, PALETY, EFEKTY, ROZDZIELCZOSCI, slugify } from "../lib/spec.mjs";
import { generujProjekt } from "../lib/generator.mjs";
import { renderujProjekt } from "../lib/render.mjs";
import { stworzAnkiete } from "../lib/ankieta.mjs";

const ank = stworzAnkiete();
const pytaj = ank.pytaj;

async function main() {
  console.log("\n=== Nowy film z kodu (hyperframes) ===\n");
  const title = await pytaj("Tytuł filmu");
  if (!title) {
    console.log("Tytuł jest wymagany.");
    ank.zamknij();
    process.exit(1);
  }
  const opis = await pytaj("Krótki opis / o czym ma być film? (możesz pominąć)");
  const scenyRaw = await pytaj("Teksty scen — rozdzielone znakiem | (puste = jedna scena z opisem)", opis ? "" : "");
  const sceneDuration = Number(await pytaj("Czas jednej sceny w sekundach", "4")) || 4;

  console.log("\nRozdzielczość:");
  for (const [k, v] of Object.entries(ROZDZIELCZOSCI)) console.log(`  ${k}) ${v.label}`);
  const roz = ROZDZIELCZOSCI[await pytaj("Wybierz numer", "1")] || ROZDZIELCZOSCI["1"];
  const fps = Number(await pytaj("Klatki na sekundę (24/30/60)", "30")) || 30;

  console.log("\nPalety kolorów:");
  const klucze = Object.keys(PALETY);
  klucze.forEach((k, i) => console.log(`  ${i + 1}) ${PALETY[k].nazwa} (tło ${PALETY[k].tlo}, akcent ${PALETY[k].akcent})`));
  const pal = await pytaj("Wybierz numer lub wpisz własny akcent w formacie #rrggbb, 0 = własna paleta", "1");
  let palette;
  if (pal === "0") {
    const tlo = await pytaj("Kolor tła (#rrggbb)", "#0b0e17");
    const tekst = await pytaj("Kolor tekstu (#rrggbb)", "#f5f7ff");
    const akcent = await pytaj("Kolor akcentu (#rrggbb)", "#6ea8fe");
    palette = { tlo, tekst, akcent, wyciszony: "#8b93a7" };
  } else if (/^#[0-9a-fA-F]{6}$/.test(pal)) {
    palette = { ...PALETY.noc, akcent: pal };
  } else {
    palette = klucze[Number(pal) - 1] || "noc";
  }

  console.log("\nEfekty przejść: " + EFEKTY.join(", "));
  const effect = (await pytaj("Wybierz efekt", "mix")) || "mix";

  const progressBar = (await pytaj("Pasek postępu na dole? (t/n)", "t")).toLowerCase() !== "n";
  const sceneCounter = (await pytaj("Licznik scen (np. 2 / 5)? (t/n)", "n")).toLowerCase() === "t";
  const watermark = await pytaj("Znak wodny w rogu (puste = brak)");
  const nazwa = (await pytaj("Nazwa projektu (slug)", slugify(title))) || slugify(title);
  const renderNow = (await pytaj("\nWygenerować projekt i od razu wyrenderować MP4? (T/n)", "T")).toLowerCase() !== "n";

  const sceny = scenyRaw
    ? scenyRaw.split("|").map((s) => s.trim()).filter(Boolean)
    : [opis || title];

  const spec = walidujSpec({
    title,
    width: roz.width,
    height: roz.height,
    fps,
    sceneDuration,
    palette,
    effect,
    scenes: sceny,
    extras: { progressBar, sceneCounter, watermark },
  });

  const { slug, dir } = generujProjekt(spec, nazwa);
  console.log(`\nProjekt wygenerowany: ${dir}`);
  console.log(`Sceny: ${spec.scenes.length}, rozdzielczość ${spec.width}×${spec.height} @ ${spec.fps} fps`);

  if (renderNow) {
    try {
      const out = await renderujProjekt(dir, slug);
      console.log(`\nGotowe! Film: ${out}`);
    } catch (e) {
      console.error(`\nRender nieudany: ${e.message}`);
      console.log("Możesz spróbować ręcznie: tools/hf render -o ../../output/" + slug + ".mp4 .  (z katalogu projektu)");
      process.exitCode = 1;
    }
  } else {
    console.log("\nRender później: npm run render -- " + slug);
  }
  ank.zamknij();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
