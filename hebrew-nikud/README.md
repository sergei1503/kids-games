# אותיות וניקוד — Hebrew nikud learning game

A tablet-friendly game for a child who knows the Hebrew letters but not the **nikud**
(vowel points). Core idea: *the same letter changes sound when the little marks change.*

## Two modes
- **לגלות (Explore):** pick a letter → tap each of its 5 vowel forms → hear the syllable.
  No scores, no timer, no failing — pure discovery.
- **לשחק (Quiz):** hear a syllable → tap the matching nikud. Stars for correct, gentle replay
  for wrong. No penalties.

## Content
- 5 core vowels: patach(a), segol(e), chirik(i), holam(o), kubutz(u).
- Starter letters (single, unambiguous sounds): מ ל נ ר ת ס.
- All content lives in `data.js` — add letters/vowels there; no other code changes needed.

## Audio
Spoken syllables are static MP3s at `audio/<letter>_<vowel>.mp3` (e.g. `audio/mem_a.mp3`),
served over HTTPS. This is what makes sound reliable on the tablet (a raw `file://` HTML page
blocks audio — that was the original problem). A single tap-to-start gate unlocks audio for
the session. Success/wrong feedback chimes are generated live via Web Audio (no files).

If an MP3 is missing, the game falls back to the browser's Hebrew speech voice so it stays
playable during development.

### Generating the audio
**Chosen route: record your own voice** (warmest for Laliv, zero cost) via the guided
recorder UI:
```
python3 ../scripts/recorder/serve.py    # open http://localhost:8123/ , record 30 syllables
../scripts/recorder/convert.sh          # → audio/*.mp3 (trimmed + loudness-normalized)
```
See `../scripts/record-your-own.md` for the full walkthrough.

Automated TTS alternative (if billing is ever enabled): `../scripts/generate-audio-google.sh`
(Google Cloud he-IL neural voice).

> TTS routes tested and rejected: macOS `say -v Carmit` collapses isolated 1–2 char syllables
> to a fixed ~0.2s clip and drops the vowel; Google TTS needs billing on the GCP project;
> the available OpenAI key is over quota; **Deepgram has no Hebrew TTS voice** (Aura-2 covers
> en/es/fr/de/it/nl/ja only).

## Run locally
Never open via `file://` (audio will fail — reproduces the original bug). Use a static server:
```
cd kids-games && python3 -m http.server 8080
# open http://localhost:8080/hebrew-nikud/
```

## Deploy
Part of the `kids-games` monorepo; pushing to `main` auto-deploys via Vercel. Lives at
`<vercel-domain>/hebrew-nikud/` and is linked from the launcher.
