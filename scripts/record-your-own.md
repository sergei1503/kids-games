# Record the syllables in your own voice

The warmest option for Laliv — she learns from your voice. Zero cost, no API.
(macOS `say`/Carmit, Google TTS, OpenAI, and Deepgram were all ruled out — see
`../hebrew-nikud/README.md`. Deepgram has no Hebrew TTS voice.)

## Easiest path — the guided recorder UI (recommended)
A one-tap-per-syllable recorder that saves each clip as you go:
```
python3 scripts/recorder/serve.py     # then open http://localhost:8123/
```
It walks you through all 30 syllables (shows the glyph + the sound to say, e.g. "ma").
Tap the mic (or press Space) to record, it auto-plays back, then press → for the next.
Clips save instantly to `scripts/recorder/raw/`. When done:
```
scripts/recorder/convert.sh           # → hebrew-nikud/audio/*.mp3 (trimmed + normalized)
```

## Alternative — one long recording, auto-split

## What to record

30 short syllables (6 letters × 5 vowels). Say each as a **single clean syllable**
(e.g. "ma", "me", "mi", "mo", "mu") — not the letter name. Leave a small gap between them.

| Letter | a (פתח) | e (סגול) | i (חיריק) | o (חולם) | u (קובוץ) |
|--------|---------|----------|-----------|----------|-----------|
| מ mem    | מַ ma  | מֶ me  | מִ mi  | מֹ mo  | מֻ mu  |
| ל lamed  | לַ la  | לֶ le  | לִ li  | לֹ lo  | לֻ lu  |
| נ nun    | נַ na  | נֶ ne  | נִ ni  | נֹ no  | נֻ nu  |
| ר resh   | רַ ra  | רֶ re  | רִ ri  | רֹ ro  | רֻ ru  |
| ת tav    | תַ ta  | תֶ te  | תִ ti  | תֹ to  | תֻ tu  |
| ס samech | סַ sa  | סֶ se  | סִ si  | סֹ so  | סֻ su  |

## Easiest path
1. Record all 30 in one pass on your phone / QuickTime (Voice Memo), saying each syllable
   with a clear ~1s gap, **in the table order above (row by row)**.
2. Export the recording as `raw.m4a` (or .wav/.mp3) into this `scripts/` folder.
3. Run `./scripts/split-recording.sh raw.m4a` — it auto-splits on silence into the 30
   named files `hebrew-nikud/audio/<letter>_<vowel>.mp3` in the same order.
4. Check the result; re-record any that came out wrong (you can record a single file
   named e.g. `mem_o.mp3` by hand and drop it into `hebrew-nikud/audio/`).

## Filename convention
`hebrew-nikud/audio/<letterId>_<vowelId>.mp3` — letterIds: mem, lamed, nun, resh, tav, samech;
vowelIds: a, e, i, o, u.  (Matches `data.js`.)
