#!/usr/bin/env bash
# Split one recording of all 30 syllables (in table order, row by row) into the
# named per-syllable MP3 files. Splits on silence using ffmpeg.
#
# Usage:  ./scripts/split-recording.sh raw.m4a
# Output: hebrew-nikud/audio/<letter>_<vowel>.mp3   (30 files)
#
# Tuning: if you get the wrong number of segments, adjust SILENCE (dB, e.g. -30dB)
# and GAP (min silence seconds between syllables, e.g. 0.4).

set -euo pipefail
cd "$(dirname "$0")/.."

SRC="${1:?usage: split-recording.sh <recording-file>}"
OUT="hebrew-nikud/audio"
SILENCE="${SILENCE:--35dB}"
GAP="${GAP:-0.35}"
mkdir -p "$OUT"

# expected order — must match how you recorded (row by row from record-your-own.md)
NAMES=(
  mem_a mem_e mem_i mem_o mem_u
  lamed_a lamed_e lamed_i lamed_o lamed_u
  nun_a nun_e nun_i nun_o nun_u
  resh_a resh_e resh_i resh_o resh_u
  tav_a tav_e tav_i tav_o tav_u
  samech_a samech_e samech_i samech_o samech_u
)

echo "Detecting silence boundaries in $SRC ..."
LOG=$(ffmpeg -hide_banner -i "$SRC" -af "silencedetect=noise=${SILENCE}:d=${GAP}" -f null - 2>&1)

# Build cut points: each syllable is the audio between silence_end[i] and silence_start[i+1].
mapfile -t STARTS < <(echo "$LOG" | grep -oE "silence_end: [0-9.]+" | grep -oE "[0-9.]+")
mapfile -t ENDS   < <(echo "$LOG" | grep -oE "silence_start: [0-9.]+" | grep -oE "[0-9.]+")

# The first syllable starts at 0 (audio before the first detected silence).
SEG_STARTS=(0 "${STARTS[@]}")
SEG_ENDS=("${ENDS[@]}")

count=$(( ${#SEG_ENDS[@]} ))
echo "Found $count segment(s); expected 30."
[ "$count" -lt 1 ] && { echo "No segments — adjust SILENCE/GAP."; exit 1; }

n=0
for i in "${!NAMES[@]}"; do
  s="${SEG_STARTS[$i]:-}"; e="${SEG_ENDS[$i]:-}"
  [ -z "$s" ] && break
  if [ -z "$e" ]; then  # last segment runs to end of file
    ffmpeg -y -loglevel error -i "$SRC" -ss "$s" -codec:a libmp3lame -qscale:a 4 "$OUT/${NAMES[$i]}.mp3"
  else
    ffmpeg -y -loglevel error -i "$SRC" -ss "$s" -to "$e" -codec:a libmp3lame -qscale:a 4 "$OUT/${NAMES[$i]}.mp3"
  fi
  echo "  ✓ ${NAMES[$i]}.mp3  [$s → ${e:-end}]"
  n=$((n+1))
done
echo "Wrote $n file(s) to $OUT. Listen and re-record any that are off."
