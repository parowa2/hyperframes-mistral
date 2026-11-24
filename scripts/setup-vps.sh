#!/bin/bash
# One-shot setup studia filmowego na świeżym VPS (Debian/Ubuntu), np. Hetzner CX22 (~5 EUR/mies.).
# Użycie na serwerze:  bash setup-vps.sh <URL_REPO_GIT> [katalog]
set -euo pipefail

REPO="${1:?Podaj URL repo git, np. https://github.com/uzytkownik/studio-filmowe.git}"
DIR="${2:-studio-filmowe}"

if [ "$(id -u)" = "0" ]; then
  apt-get update
  apt-get install -y ffmpeg git curl ca-certificates \
    libnss3 libnspr4 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
    libatspi2.0-0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 fonts-dejavu-core fonts-liberation
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
else
  echo "Uruchom jako root (sudo bash $0 ...) albo na maszynie z już zainstalowanym Node 22 + ffmpeg." >&2
  exit 1
fi

git clone "$REPO" "$DIR"
cd "$DIR"
npm ci

cat <<'EOF'

Gotowe. Od teraz (także z telefonu przez SSH, np. Termius):

  cd studio-filmowe
  npm run z-promptu -- "Neonowy film o kawie: \"Zaparz kawę\" | \"Rusz w miasto\", 1280x720, efekt slide" --nazwa kawa
  npm run nowy-film            # ankieta krok po kroku
  ls output/                   # wyrenderowane MP4 -> pobierz przez SFTP

Podgląd na żywo przez tunel SSH (bez wystawiania portu na świat):
  ssh -L 3002:localhost:3002 user@serwer   # i na telefonie: http://localhost:3002
  npm run podglad -- <nazwa>

Pierwszy render sam pobierze chrome-headless-shell (~100 MB) do ~/.cache/hyperframes.
EOF
