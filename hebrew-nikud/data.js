// data.js — content model for the Hebrew nikud game.
// Grow the game by editing these two arrays. Audio files live at
// audio/<letterId>_<vowelId>.mp3  (e.g. audio/mem_a.mp3).
//
// Nikud are combining marks (they attach to the preceding letter):
//   patach U+05B7 · segol U+05B6 · chirik U+05B4 · holam U+05B9 · kubutz U+05BB

const VOWELS = [
  { id: 'a', mark: 'ַ', name: 'פַּתָּח',  hint: 'אַ' }, // a
  { id: 'e', mark: 'ֶ', name: 'סֶגוֹל',   hint: 'אֶ' }, // e
  { id: 'i', mark: 'ִ', name: 'חִירִיק',  hint: 'אִ' }, // i
  { id: 'o', mark: 'ֹ', name: 'חוֹלָם',   hint: 'אוֹ' }, // o
  { id: 'u', mark: 'ֻ', name: 'קֻבּוּץ',  hint: 'אֻ' }, // u
];

// Starter set: single-sound letters with no dagesh / shin-dot ambiguity,
// so every letter has exactly one clear consonant sound. Add more later.
const LETTERS = [
  { id: 'mem',    char: 'מ', name: 'מֵם' },
  { id: 'lamed',  char: 'ל', name: 'לָמֶד' },
  { id: 'nun',    char: 'נ', name: 'נוּן' },
  { id: 'resh',   char: 'ר', name: 'רֵישׁ' },
  { id: 'tav',    char: 'ת', name: 'תָּו' },
  { id: 'samech', char: 'ס', name: 'סָמֶךְ' },
];

// The pointed syllable glyph for display, e.g. "מ" + patach.
function syllableText(letter, vowel) {
  return letter.char + vowel.mark;
}

// Audio path convention. Build script writes files to match.
function audioPath(letter, vowel) {
  return `audio/${letter.id}_${vowel.id}.mp3`;
}
