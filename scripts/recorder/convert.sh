#!/usr/bin/env bash
# Convert recorded syllables (scripts/recorder/raw/<voice>/*) into the game's MP3s.
# Trims leading/trailing silence and normalizes loudness so clips sound even.
#
# Usage:  scripts/recorder/convert.sh            # all voices
#         scripts/recorder/convert.sh abba        # one voice
# Output: hebrew-nikud/audio/<voice>/<id>.mp3

set -euo pipefail
cd "$(dirname "$0")/../.."          # -> kids-games/

RAW="scripts/recorder/raw"
OUTBASE="hebrew-nikud/audio"
TRIM="silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB,areverse"
NORM="loudnorm=I=-16:TP=-1.5:LRA=11"

voices=("$@")
if [ ${#voices[@]} -eq 0 ]; then
  shopt -s nullglob
  for d in "$RAW"/*/; do voices+=("$(basename "$d")"); done
fi
[ ${#voices[@]} -eq 0 ] && { echo "No voice folders in $RAW. Record first (serve.py)."; exit 1; }

total=0
for voice in "${voices[@]}"; do
  src="$RAW/$voice"; out="$OUTBASE/$voice"
  [ -d "$src" ] || { echo "skip: no $src"; continue; }
  mkdir -p "$out"
  shopt -s nullglob
  files=( "$src"/*.webm "$src"/*.m4a "$src"/*.ogg "$src"/*.wav )
  echo "Voice '$voice': ${#files[@]} recording(s) -> $out"
  for f in "${files[@]}"; do
    id="$(basename "$f")"; id="${id%.*}"
    ffmpeg -y -loglevel error -i "$f" -af "${TRIM},${NORM}" -ar 44100 -ac 1 -codec:a libmp3lame -qscale:a 3 "$out/$id.mp3" 2>/dev/null
    total=$((total+1))
  done
  echo "  -> $(ls "$out"/*.mp3 2>/dev/null | wc -l | tr -d ' ') mp3 files in $out"
done
echo "Done. Converted $total file(s). Full set per voice = 110 (22 letters × 5 vowels)."
