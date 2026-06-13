#!/usr/bin/env bash
# Convert recorded syllables (scripts/recorder/raw/*) into the game's MP3 files.
# Trims leading/trailing silence and normalizes loudness so clips sound even.
#
# Usage:  scripts/recorder/convert.sh
# Output: hebrew-nikud/audio/<id>.mp3

set -euo pipefail
cd "$(dirname "$0")/../.."          # -> kids-games/

RAW="scripts/recorder/raw"
OUT="hebrew-nikud/audio"
mkdir -p "$OUT"

shopt -s nullglob
files=( "$RAW"/*.webm "$RAW"/*.m4a "$RAW"/*.ogg "$RAW"/*.wav )
[ ${#files[@]} -eq 0 ] && { echo "No recordings in $RAW. Run serve.py and record first."; exit 1; }

TRIM="silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_silence=0.08:start_threshold=-40dB,areverse"
NORM="loudnorm=I=-16:TP=-1.5:LRA=11"

n=0
for f in "${files[@]}"; do
  id="$(basename "$f")"; id="${id%.*}"
  ffmpeg -y -loglevel error -i "$f" -af "${TRIM},${NORM}" -ar 44100 -ac 1 -codec:a libmp3lame -qscale:a 3 "$OUT/$id.mp3"
  echo "  ✓ $OUT/$id.mp3"
  n=$((n+1))
done
echo "Converted $n file(s) → $OUT"
echo "Expected 30 (6 letters × 5 vowels). Got: $(ls "$OUT"/*.mp3 2>/dev/null | wc -l | tr -d ' ')"
