// data.js — content model for the Hebrew nikud game.
// Grow the game by editing these arrays. Audio files live at
//   audio/<voiceId>/<letterId>_<vowelId>.mp3   (e.g. audio/abba/bet_a.mp3)
//
// Nikud are combining marks: patach U+05B7 · segol U+05B6 · chirik U+05B4 ·
// holam U+05B9 · kubutz U+05BB.  `mod` is a dagesh (U+05BC) or shin-dot (U+05C1)
// baked onto two-sound letters so they get their clear/primary sound.

const VOWELS = [
  { id: 'a', mark: 'ַ', name: 'פַּתָּח',  hint: 'אַ' }, // a
  { id: 'e', mark: 'ֶ', name: 'סֶגוֹל',   hint: 'אֶ' }, // e
  { id: 'i', mark: 'ִ', name: 'חִירִיק',  hint: 'אִ' }, // i
  { id: 'o', mark: 'ֹ', name: 'חוֹלָם',   hint: 'אוֹ' }, // o
  { id: 'u', mark: 'ֻ', name: 'קֻבּוּץ',  hint: 'אֻ' }, // u
];

// Two voices — played at random in the game. Recorded separately.
const VOICES = [
  { id: 'abba', name: 'אבא' },
  { id: 'ima',  name: 'אמא' },
];

// Full alef-bet in alphabetical order. cons = Latin sound hint (for the recorder);
// alef/ayin are silent carriers, so their sound is just the vowel.
const LETTERS = [
  { id: 'alef',   char: 'א', mod: '',  name: 'אָלֶף',   cons: ''   },
  { id: 'bet',    char: 'ב', mod: 'ּ', name: 'בֵּית',   cons: 'b'  }, // dagesh -> b
  { id: 'gimel',  char: 'ג', mod: '',  name: 'גִּימֶל', cons: 'g'  },
  { id: 'dalet',  char: 'ד', mod: '',  name: 'דָלֶת',   cons: 'd'  },
  { id: 'he',     char: 'ה', mod: '',  name: 'הֵא',     cons: 'h'  },
  { id: 'vav',    char: 'ו', mod: '',  name: 'וָו',     cons: 'v'  },
  { id: 'zayin',  char: 'ז', mod: '',  name: 'זַיִן',   cons: 'z'  },
  { id: 'het',    char: 'ח', mod: '',  name: 'חֵית',    cons: 'ch' },
  { id: 'tet',    char: 'ט', mod: '',  name: 'טֵית',    cons: 't'  },
  { id: 'yod',    char: 'י', mod: '',  name: 'יוֹד',    cons: 'y'  },
  { id: 'kaf',    char: 'כ', mod: 'ּ', name: 'כָּף',    cons: 'k'  }, // dagesh -> k
  { id: 'lamed',  char: 'ל', mod: '',  name: 'לָמֶד',   cons: 'l'  },
  { id: 'mem',    char: 'מ', mod: '',  name: 'מֵם',     cons: 'm'  },
  { id: 'nun',    char: 'נ', mod: '',  name: 'נוּן',    cons: 'n'  },
  { id: 'samech', char: 'ס', mod: '',  name: 'סָמֶךְ',  cons: 's'  },
  { id: 'ayin',   char: 'ע', mod: '',  name: 'עַיִן',   cons: ''   },
  { id: 'pe',     char: 'פ', mod: 'ּ', name: 'פֵּא',    cons: 'p'  }, // dagesh -> p
  { id: 'tsadi',  char: 'צ', mod: '',  name: 'צָדִי',   cons: 'ts' },
  { id: 'qof',    char: 'ק', mod: '',  name: 'קוֹף',    cons: 'k'  },
  { id: 'resh',   char: 'ר', mod: '',  name: 'רֵישׁ',   cons: 'r'  },
  { id: 'shin',   char: 'ש', mod: 'ׁ', name: 'שִׁין',   cons: 'sh' }, // shin-dot -> sh
  { id: 'tav',    char: 'ת', mod: '',  name: 'תָּו',    cons: 't'  },
];

// Pointed syllable glyph: base letter + (dagesh/shin-dot) + vowel mark.
function syllableText(letter, vowel) {
  return letter.char + (letter.mod || '') + vowel.mark;
}

// Audio path for a given voice.
function audioPath(letter, vowel, voiceId) {
  return `audio/${voiceId}/${letter.id}_${vowel.id}.mp3`;
}
