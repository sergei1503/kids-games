// app.js — Hebrew nikud game: Explore (tap to hear) + Quiz (hear, tap the match).
// Audio: pre-generated MP3s at audio/<letter>_<vowel>.mp3.
// Graceful fallback to browser speech (he-IL) when an MP3 is missing — lets the
// game be played/tested before the real voice files are generated.

(function () {
  'use strict';

  let audioUnlocked = false;
  const audioCache = {};           // path -> HTMLAudioElement
  let webAudioCtx = null;          // for success/wrong feedback chimes
  let speechVoiceHe = null;

  let currentLetter = LETTERS[0];
  let stars = 0;

  // ---------- audio plumbing ----------
  function unlockAudio() {
    if (audioUnlocked) return;
    audioUnlocked = true;
    try { webAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {}
    // Prime speech engine (loads voices on some browsers)
    if (window.speechSynthesis) {
      try { window.speechSynthesis.getVoices(); } catch (e) {}
    }
    preloadCurrentLetter();
  }

  function getAudio(path) {
    if (!audioCache[path]) {
      const a = new Audio(path);
      a.preload = 'auto';
      audioCache[path] = a;
    }
    return audioCache[path];
  }

  function pickHeVoice() {
    if (!window.speechSynthesis) return null;
    const voices = window.speechSynthesis.getVoices() || [];
    return voices.find(v => /he[-_]?IL|hebrew|עברית/i.test(v.lang + ' ' + v.name)) || null;
  }

  function speakFallback(text) {
    if (!window.speechSynthesis) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'he-IL';
      speechVoiceHe = speechVoiceHe || pickHeVoice();
      if (speechVoiceHe) u.voice = speechVoiceHe;
      u.rate = 0.8;
      window.speechSynthesis.speak(u);
    } catch (e) {}
  }

  // Play a letter+vowel syllable, choosing a random available voice.
  // Tries voices in random order; falls back to browser speech if none load.
  function playSyllable(letter, vowel) {
    const voiceIds = shuffle(VOICES.map(v => v.id));
    let idx = 0;
    (function tryNext() {
      if (idx >= voiceIds.length) { speakFallback(syllableText(letter, vowel)); return; }
      const a = new Audio(audioPath(letter, vowel, voiceIds[idx++]));
      let moved = false;
      const fail = () => { if (moved) return; moved = true; tryNext(); };
      a.onerror = fail;
      const p = a.play();
      if (p && p.catch) p.catch(fail);   // missing file / decode / autoplay -> next voice
    })();
  }

  function preloadCurrentLetter() { /* no-op: clips are tiny and load on demand */ }

  // simple feedback chimes via Web Audio (no files needed)
  function tone(freq, dur, type, vol) {
    if (!webAudioCtx) return;
    const o = webAudioCtx.createOscillator();
    const g = webAudioCtx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.value = vol == null ? 0.12 : vol;
    o.connect(g); g.connect(webAudioCtx.destination);
    o.start(); o.stop(webAudioCtx.currentTime + dur);
  }
  function chimeGood() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.18, 'sine', 0.14), i * 90)); }
  function chimeMeh()  { tone(300, 0.18, 'sine', 0.10); setTimeout(() => tone(240, 0.22, 'sine', 0.08), 110); }

  // ---------- rendering ----------
  function renderStars() {
    const el = document.getElementById('stars');
    el.textContent = stars > 0 ? '⭐'.repeat(Math.min(stars, 5)) + (stars > 5 ? ' +' + (stars - 5) : '') : '';
  }

  function buildLetterRow(containerId, onPick) {
    const row = document.getElementById(containerId);
    row.innerHTML = '';
    LETTERS.forEach(letter => {
      const b = document.createElement('button');
      b.className = 'letter-btn' + (letter.id === currentLetter.id ? ' active' : '');
      b.textContent = letter.char;
      b.setAttribute('aria-label', letter.name);
      b.addEventListener('click', () => {
        currentLetter = letter;
        document.querySelectorAll('#' + containerId + ' .letter-btn')
          .forEach(x => x.classList.remove('active'));
        b.classList.add('active');
        b.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        onPick(letter);
      });
      if (letter.id === currentLetter.id) {
        requestAnimationFrame(() => b.scrollIntoView({ inline: 'center', block: 'nearest' }));
      }
      row.appendChild(b);
    });
  }

  // ---------- explore ----------
  function renderExplore() {
    const grid = document.getElementById('vowelGrid');
    grid.innerHTML = '';
    VOWELS.forEach(vowel => {
      const card = document.createElement('div');
      card.className = 'syll-card v-' + vowel.id;
      card.innerHTML =
        '<div class="syll-glyph">' + syllableText(currentLetter, vowel) + '</div>' +
        '<div class="syll-name">' + vowel.name + '</div>' +
        '<div class="spk">🔊</div>';
      card.addEventListener('click', () => {
        document.querySelectorAll('#vowelGrid .syll-card').forEach(c => c.classList.remove('playing'));
        card.classList.add('playing');
        setTimeout(() => card.classList.remove('playing'), 450);
        playSyllable(currentLetter, vowel);
      });
      grid.appendChild(card);
    });
  }

  function setupExplore() {
    buildLetterRow('exploreLetters', () => { preloadCurrentLetter(); renderExplore(); });
    renderExplore();
  }

  // ---------- quiz ----------
  // Letter source: 'random' | 'choose' | 'smart'.  Answer style: 'same' | 'mixed'.
  let quizSrc = 'random';
  let quizAns = 'same';
  let quizTarget = null;            // { letter, vowel }
  const OPTION_COUNT = 4;           // answer + distractors (layout supports up to 5)

  // --- adaptive stats, persisted across sessions ---
  const STATS_KEY = 'nikud_stats_v1';
  let stats = loadStats();
  function loadStats() { try { return JSON.parse(localStorage.getItem(STATS_KEY)) || {}; } catch (e) { return {}; } }
  function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) {} }
  function bumpStat(id, wrong) {
    const st = stats[id] || (stats[id] = { seen: 0, wrong: 0 });
    st.seen++; if (wrong) st.wrong++;
    saveStats();
  }

  function allCombos() {
    const out = [];
    LETTERS.forEach(l => VOWELS.forEach(v => out.push({ letter: l, vowel: v })));
    return out;
  }
  function comboId(c) { return c.letter.id + '_' + c.vowel.id; }
  function comboGlyph(c) { return c.letter.char + (c.letter.mod || '') + c.vowel.mark; }

  // weighted pick favouring struggled syllables (more wrongs -> more likely)
  function pickStruggleCombo() {
    const combos = allCombos();
    const weights = combos.map(c => { const st = stats[comboId(c)]; return 1 + (st ? st.wrong * 3 : 0); });
    let r = rnd() * weights.reduce((a, b) => a + b, 0);
    for (let i = 0; i < combos.length; i++) { r -= weights[i]; if (r <= 0) return combos[i]; }
    return combos[combos.length - 1];
  }

  function chooseTarget() {
    if (quizSrc === 'choose') return { letter: currentLetter, vowel: VOWELS[Math.floor(rnd() * VOWELS.length)] };
    if (quizSrc === 'smart')  return pickStruggleCombo();
    return { letter: LETTERS[Math.floor(rnd() * LETTERS.length)], vowel: VOWELS[Math.floor(rnd() * VOWELS.length)] };
  }

  function buildOptions(target) {
    const opts = [target];
    if (quizAns === 'same') {
      const others = shuffle(VOWELS.filter(v => v.id !== target.vowel.id));
      for (let i = 0; i < OPTION_COUNT - 1 && i < others.length; i++) opts.push({ letter: target.letter, vowel: others[i] });
    } else {
      const seen = new Set([comboGlyph(target)]);
      for (const c of shuffle(allCombos())) {
        if (opts.length >= OPTION_COUNT) break;
        const g = comboGlyph(c);
        if (seen.has(g)) continue;       // distinct glyphs only
        seen.add(g); opts.push(c);
      }
    }
    return shuffle(opts);
  }

  function newQuizRound() {
    quizTarget = chooseTarget();
    currentLetter = quizTarget.letter;
    document.getElementById('quizPrompt').textContent =
      (quizAns === 'same') ? 'איזה ניקוד שמעתם?' : 'איזו הברה שמעתם?';
    const box = document.getElementById('quizOptions');
    box.innerHTML = '';
    buildOptions(quizTarget).forEach(opt => {
      const c = document.createElement('button');
      c.className = 'opt-card';
      c.textContent = syllableText(opt.letter, opt.vowel);
      c.addEventListener('click', () => onQuizPick(opt, c));
      box.appendChild(c);
    });
    setTimeout(() => playSyllable(quizTarget.letter, quizTarget.vowel), 250);
  }

  function onQuizPick(opt, card) {
    if (card.classList.contains('correct') || card.classList.contains('wrong')) return;
    const correct = opt.letter.id === quizTarget.letter.id && opt.vowel.id === quizTarget.vowel.id;
    bumpStat(comboId(quizTarget), !correct);
    if (correct) {
      card.classList.add('correct');
      stars++; renderStars(); chimeGood(); burst(card);
      setTimeout(newQuizRound, 950);
    } else {
      card.classList.add('wrong');
      chimeMeh();
      setTimeout(() => card.classList.remove('wrong'), 450);
      setTimeout(() => playSyllable(quizTarget.letter, quizTarget.vowel), 200);
    }
  }

  function onQuizLetterPick() { newQuizRound(); }

  function setupQuiz() {
    buildLetterRow('quizLetters', onQuizLetterPick);
    document.getElementById('quizLetters').style.display = 'none';
    document.querySelectorAll('#srcGroup .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#srcGroup .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        quizSrc = chip.dataset.src;
        const strip = document.getElementById('quizLetters');
        if (quizSrc === 'choose') { buildLetterRow('quizLetters', onQuizLetterPick); strip.style.display = ''; }
        else strip.style.display = 'none';
        newQuizRound();
      });
    });
    document.querySelectorAll('#ansGroup .chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#ansGroup .chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        quizAns = chip.dataset.ans;
        newQuizRound();
      });
    });
    document.getElementById('quizPlay').addEventListener('click', () => {
      if (quizTarget) playSyllable(quizTarget.letter, quizTarget.vowel);
    });
  }

  // ---------- helpers ----------
  // Math.random is fine in the browser (the no-random rule is for workflow scripts only)
  function rnd() { return Math.random(); }
  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function burst(el) {
    const r = el.getBoundingClientRect();
    const s = document.createElement('div');
    s.className = 'burst'; s.textContent = '⭐';
    s.style.left = (r.left + r.width / 2 - 20) + 'px';
    s.style.top = (r.top + r.height / 2 - 20) + 'px';
    document.body.appendChild(s);
    setTimeout(() => s.remove(), 900);
  }

  // ---------- tabs ----------
  function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
        tab.classList.add('active');
        const screen = document.getElementById(tab.dataset.screen);
        screen.classList.add('active');
        // refresh letter pickers to reflect the shared currentLetter
        if (tab.dataset.screen === 'explore') { buildLetterRow('exploreLetters', () => { preloadCurrentLetter(); renderExplore(); }); renderExplore(); }
        if (tab.dataset.screen === 'quiz') { newQuizRound(); }
      });
    });
  }

  // ---------- boot ----------
  function start() {
    unlockAudio();
    document.getElementById('startGate').style.display = 'none';
    document.getElementById('app').classList.add('ready');
    setupExplore();
    setupQuiz();
    setupTabs();
    renderStars();
  }

  document.getElementById('startGate').addEventListener('click', start, { once: true });
})();
