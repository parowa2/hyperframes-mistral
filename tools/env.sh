# Środowisko uruchomieniowe dla hyperframes w tym sandboxie (bez sudo):
# lokalny sysroot z bibliotekami Chrome, fontami i ffmpeg/ffprobe z Debiana.
# Użycie (POSIX sh):  . ./tools/env.sh   (z katalogu głównego projektu)
STUDIO="${STUDIO:-$PWD}"
SYSROOT="$STUDIO/vendor/sysroot"
LD_LIBRARY_PATH="$SYSROOT/usr/lib/x86_64-linux-gnu:$SYSROOT/usr/lib/x86_64-linux-gnu/pulseaudio:$SYSROOT/usr/lib/x86_64-linux-gnu/blas:$SYSROOT/usr/lib/x86_64-linux-gnu/lapack:$SYSROOT/lib/x86_64-linux-gnu${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}"
export LD_LIBRARY_PATH
FONTCONFIG_FILE="$SYSROOT/etc/fontconfig/fonts.conf"
export FONTCONFIG_FILE
HYPERFRAMES_FFMPEG_PATH="$SYSROOT/usr/bin/ffmpeg"
export HYPERFRAMES_FFMPEG_PATH
HYPERFRAMES_FFPROBE_PATH="$SYSROOT/usr/bin/ffprobe"
export HYPERFRAMES_FFPROBE_PATH
PATH="$SYSROOT/usr/bin:$STUDIO/node_modules/.bin:$PATH"
export PATH
# Prywatny cache przeglądarki. UWAGA: w Codespaces i katalog repo (/workspaces/...), i ~/.cache
# są grupowo-zapisywalne, a hyperframes odrzuca wtedy cache i wraca do ~/.cache -> błąd.
# Dlatego cache idzie do $HOME/.hf-cache (sam $HOME ma 750, czyli jest prywatny).
HF_BASE="${HYPERFRAMES_CACHE_DIR:-$HOME/.hf-cache/hyperframes}"
HF_BASE="${HF_BASE%/hyperframes}"
mkdir -p "$HF_BASE/hyperframes" "$HF_BASE/puppeteer"
chmod 700 "$HF_BASE" "$HF_BASE/hyperframes" "$HF_BASE/puppeteer" 2>/dev/null || true
HYPERFRAMES_CACHE_DIR="$HF_BASE/hyperframes"
export HYPERFRAMES_CACHE_DIR
PUPPETEER_CACHE_DIR="$HF_BASE/puppeteer"
export PUPPETEER_CACHE_DIR
XDG_CACHE_HOME="$HF_BASE"
export XDG_CACHE_HOME
