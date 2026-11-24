# studio-filmowe

Środowisko do tworzenia filmów **z kodu** w stylu [hyperframes](https://github.com/heygen-com/hyperframes):
filmy generowane prosto **z promptu** albo **według pytań** (ankieta), renderowane do MP4.

Całość działa lokalnie: hyperframes + headless Chrome + ffmpeg/ffprobe + GSAP są już skonfigurowane
(własny sysroot w `vendor/sysroot`, więc nie trzeba instalować nic przez apt/sudo).

## Szybki start

```bash
# 1) Film z promptu (jednym zdaniem opisujesz film, reszta wykrywana automatycznie):
npm run z-promptu -- "Neonowy film o kawie: \"Zaparz dobrą kawę\" | \"Poczuj aromat\" | \"Rusz w miasto\", każda scena 3 sekundy, 1280x720, 30 fps, efekt slide, pasek postępu, licznik scen" --nazwa moja-kawa

# 2) Albo ankieta — odpowiadasz na pytania krok po kroku:
npm run nowy-film

# 3) Albo doprecyzuj wykryte parametry pytaniami:
npm run z-promptu -- "Film pionowy 9:16 o górach, 3 sceny" --pytania
```

Wynik: `output/<nazwa>.mp4`. Projekt (kod HTML/GSAP) ląduje w `projects/<nazwa>/` — możesz go dalej
edytować ręcznie, to zwykły kod.

## Inne komendy

```bash
npm run render -- <nazwa>     # renderuje istniejący projekt z projects/ do output/
npm run podglad -- <nazwa>    # podgląd na żywo na http://localhost:3002 (tylko lokalnie)
npm run przyklad              # gotowy przykład (neonowa kawa)
npm run sysroot               # przebuduj vendor/sysroot (biblioteki Chrome + ffmpeg z Debiana)
```

Bezpośrednio przez hyperframes (z właściwym środowiskiem):

```bash
tools/hf render -o ../../output/out.mp4 .   # z katalogu projects/<nazwa>
tools/hf preview --port 3002 .
tools/hf render --help                       # wszystkie opcje (fps, jakość, gif, webm, ...)
```

## Jak to działa

- `src/lib/spec.mjs` — specyfikacja filmu: palety kolorów, efekty, rozdzielczości + parser promptu
  (rozpoznaje rozdzielczość 9:16/4K/720p, fps, czas w sekundach/minutach, kolory, efekty, sceny
  w cudzysłowach lub rozdzielone `|`).
- `src/lib/generator.mjs` — zamienia specyfikację na projekt hyperframes: `index.html` z kompozycją
  (`data-composition-id`, `data-duration`, `data-fps`, warstwy scen z `data-start`/`data-duration`)
  i timeline **GSAP** (`window.__timelines["main"]`). GSAP jest lokalny (`vendor/gsap.min.js`).
- `src/lib/render.mjs` — uruchamia `tools/hf render` (hyperframes + Chrome + ffmpeg z sysrootu).
- `src/cli/` — `nowy-film.mjs` (ankieta), `z-promptu.mjs` (prompt, opcje `--pytania`, `--bez-renderu`,
  `--nazwa`), `render.mjs`, `podglad.mjs`.
- `tools/fetch-sysroot.mjs` — pobiera pakiety .deb z deb.debian.org do `vendor/sysroot`
  (biblioteki Chrome, fonty DejaVu/Liberation, ffmpeg+ffprobe). `tools/env.sh` ustawia
  `LD_LIBRARY_PATH`, `FONTCONFIG_FILE`, `HYPERFRAMES_FFMPEG_PATH`, `HYPERFRAMES_FFPROBE_PATH`.

## Specyfikacja filmu (JSON w `projects/<nazwa>/spec.json`)

```json
{
  "title": "Film o kawie",
  "width": 1280, "height": 720, "fps": 30,
  "sceneDuration": 3,
  "palette": "neon",
  "effect": "slide",
  "scenes": [{ "text": "Zaparz dobrą kawę", "sub": "opcjonalny podtytuł", "duration": 3 }],
  "extras": { "progressBar": true, "sceneCounter": true, "watermark": "MójKanał" }
}
```

- `palette`: `noc`, `neon`, `zachod`, `morska`, `papier`, `mieta`, `lawenda`, `klasyk` — lub własny obiekt
  `{ tlo, tekst, akcent, wyciszony }` z kolorami `#rrggbb`.
- `effect`: `fade` (zanikanie + blur), `slide` (wjazd z boku), `typewriter` (odkrywanie tekstu),
  `zoom` (powiększenie), `pop`, `mix` (rotacja efektów między scenami).

## Wskazówki do promptów

- Sceny: w cudzysłowach `"tekst 1" | "tekst 2"` albo numerowane `1) ... 2) ...`, albo samo zdanie.
- Rozdzielczość: `pion 9:16` / `kwadrat` / `720p` / `4k` (domyślnie 1920×1080).
- Czas: `film na 10 sekund`, `każda scena 3 sekundy`, `2 minuty`.
- Kolory: nazwa po polsku (`czerwony akcent`) lub `#ff5500`; palety: `neon`, `zachód`, `morska`, ...
- Efekty: `efekt slide`, `typewriter / maszyna do pisania`, `zoom`, `fade / zanikaj`, `pop`.
- Dodatki: `pasek postępu`, `licznik scen`, `znak wodny "MójKanał"`.

## Uruchomienie w chmurze z telefonu (GitHub Codespaces)

1. Załóż repo `hyperframes-mistral` na GitHub i wrzuć do niego ten kod.
2. Na telefonie: github.com → repo → **Code → Create codespace on main** (darmowy tier: 120 core-godzin/mies.; do renderów 720p/1080p wystarczy).
3. W terminalu Codespaces (otwiera się w przeglądarce telefonu):

```bash
npm install
npm run sysroot          # lokalne biblioteki Chrome + fonty + ffmpeg/ffprobe — bez sudo
npm run z-promptu -- "Film o górach: \"Szczyt o świcie\" | \"Zjazd\", 1280x720, efekt slide" --nazwa gory
npm run nowy-film        # albo ankieta krok po kroku
```

4. MP4 ląduje w `output/` — pobierz przez menu pliku (Download) albo `scp`.
5. Podgląd na żywo: `npm run podglad -- <nazwa>`, potem zakładka **Ports** → `localhost:3002` (visibility: Private).

> **Uwaga (Codespaces):** w Codespaces zarówno `~/.cache`, jak i katalog repo (`/workspaces/<repo>`, 775)
> są grupowo-zapisywalne. Hyperframes odrzuca wtedy cache i **cicho wraca do `~/.cache`**, co kończy się
> błędem „group-writable ~/.cache is refused” — nawet gdy ustawisz `HYPERFRAMES_CACHE_DIR` na katalog
> wewnątrz repo. Dlatego skrypty npm i `tools/env.sh` ustawiają cache poza repo:
> `HYPERFRAMES_CACHE_DIR=$HOME/.hf-cache/hyperframes` (chmod 700; sam `$HOME` ma 750 = prywatny).
> Jeśli mimo to widzisz ten błąd — zrób najpierw `git pull`. Przy ręcznym `npx hyperframes ...`
> wyeksportuj: `export HYPERFRAMES_CACHE_DIR=$HOME/.hf-cache/hyperframes`.

Alternatywa: własny VPS — patrz `scripts/setup-vps.sh` (instaluje Node 22 + ffmpeg + biblioteki Chrome jednym skryptemem, potem SSH z telefonu, np. Termius).

## Struktura katalogów

```
studio-filmowe/
  src/cli/          # komendy: nowy-film, z-promptu, render, podglad
  src/lib/          # spec, generator (spec -> HTML/GSAP), render, ankieta
  tools/            # hf (wrapper hyperframes), env.sh, fetch-sysroot.mjs
  vendor/           # sysroot (Chrome libs, fonty, ffmpeg) + gsap.min.js
  projects/<nazwa>/ # wygenerowane projekty hyperframes (index.html = kod filmu)
  output/           # wyrenderowane MP4
```
