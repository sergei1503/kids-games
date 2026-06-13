#!/usr/bin/env bash
# Generate Hebrew nikud syllable audio with Google Cloud Text-to-Speech.
#
# Prereqs (one-time):
#   1. gcloud auth login        (already done for sergei1503@gmail.com)
#   2. A GCP project with BILLING enabled and the TTS API on:
#        gcloud services enable texttospeech.googleapis.com --project <PROJECT>
#   TTS free tier (1M chars/month standard, 1M WaveNet) dwarfs this usage (~hundreds of chars).
#
# Usage:
#   PROJECT=stitch-sergei ./scripts/generate-audio-google.sh
#
# Output: hebrew-nikud/audio/<letter>_<vowel>.mp3   (matches data.js audioPath()).

set -euo pipefail
cd "$(dirname "$0")/.."

PROJECT="${PROJECT:-stitch-sergei}"
VOICE="${VOICE:-he-IL-Wavenet-A}"   # try Wavenet-A/B/C/D; Standard-A/B/C/D also exist
RATE="${RATE:-0.82}"
OUT="hebrew-nikud/audio"
mkdir -p "$OUT"

TOKEN="$(gcloud auth print-access-token)"

# letterId:char   (keep in sync with data.js LETTERS)
LETTERS=( "mem:מ" "lamed:ל" "nun:נ" "resh:ר" "tav:ת" "samech:ס" )
# vowelId:mark    (combining nikud; keep in sync with data.js VOWELS)
VOWELS=( "a:ַ" "e:ֶ" "i:ִ" "o:ֹ" "u:ֻ" )

synth() {  # $1=text  $2=outfile
  local text="$1" out="$2"
  local body
  body=$(printf '{"input":{"text":"%s"},"voice":{"languageCode":"he-IL","name":"%s"},"audioConfig":{"audioEncoding":"MP3","speakingRate":%s}}' "$text" "$VOICE" "$RATE")
  local resp
  resp=$(curl -s -X POST "https://texttospeech.googleapis.com/v1/text:synthesize" \
    -H "Authorization: Bearer $TOKEN" \
    -H "x-goog-user-project: $PROJECT" \
    -H "Content-Type: application/json; charset=utf-8" \
    --data "$body")
  if echo "$resp" | grep -q '"audioContent"'; then
    echo "$resp" | sed -E 's/.*"audioContent": *"([^"]*)".*/\1/' | base64 -d > "$out"
    echo "  ✓ $out"
  else
    echo "  ✗ FAILED: $(echo "$resp" | head -c 200)" >&2
    return 1
  fi
}

echo "Generating syllables → $OUT  (voice=$VOICE)"
for lp in "${LETTERS[@]}"; do
  lid="${lp%%:*}"; lchar="${lp##*:}"
  for vp in "${VOWELS[@]}"; do
    vid="${vp%%:*}"; vmark="${vp##*:}"
    synth "${lchar}${vmark}" "$OUT/${lid}_${vid}.mp3"
  done
done
echo "Done. $(ls "$OUT" | wc -l | tr -d ' ') files in $OUT"
