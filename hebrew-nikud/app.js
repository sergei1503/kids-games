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

  // Play a letter+vowel syllable. Returns a promise that resolves when started.
  function playSyllable(letter, vowel) {
    const path = audioPath(letter, vowel);
    const a = getAudio(path);
    a.currentTime = 0;
    const p = a.play();
    if (p && p.catch) {
      p.catch(() => speakFallback(syllableText(letter, vowel)));
    }
  }

  function preloadCurrentLetter() {
    VOWELS.forEach(v => { try { getAudio(audioPath(currentLetter, v)).load(); } catch (e) {} });
  }

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
        onPick(letter);
      });
      row.appendChild(b);
    });
  }

  // ---------- explore ----------
  function renderExplore() {
    const grid = document.getElementById('vowelGrid');
    grid.innerHTML = '';
    VOWELS.forEach(vowel => {
      const card = document.createElement('div');
      card.className = 'syll-card';
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
  let quizAnswer = null;

  function newQuizRound() {
    quizAnswer = VOWELS[Math.floor(rnd() * VOWELS.length)];
    // 3 options: the answer + 2 distractors
    const others = VOWELS.filter(v => v.id !== quizAnswer.id);
    shuffle(others);
    const opts = shuffle([quizAnswer, others[0], others[1]]);

    const box = document.getElementById('quizOptions');
    box.innerHTML = '';
    opts.forEach(vowel => {
      const c = document.createElement('button');
      c.className = 'opt-card';
      c.textContent = syllableText(currentLetter, vowel);
      c.addEventListener('click', () => onQuizPick(vowel, c));
      box.appendChild(c);
    });
    preloadCurrentLetter();
    setTimeout(() => playSyllable(currentLetter, quizAnswer), 250);
  }

  function onQuizPick(vowel, card) {
    if (card.classList.contains('correct') || card.classList.contains('wrong')) return;
    if (vowel.id === quizAnswer.id) {
      card.classList.add('correct');
      stars++; renderStars(); chimeGood(); burst(card);
      setTimeout(newQuizRound, 950);
    } else {
      card.classList.add('wrong');
      chimeMeh();
      setTimeout(() => card.classList.remove('wrong'), 450);
      setTimeout(() => playSyllable(currentLetter, quizAnswer), 200);
    }
  }

  function setupQuiz() {
    buildLetterRow('quizLetters', () => newQuizRound());
    document.getElementById('quizPlay').addEventListener('click', () => {
      if (quizAnswer) playSyllable(currentLetter, quizAnswer);
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
        if (tab.dataset.screen === 'quiz') { buildLetterRow('quizLetters', () => newQuizRound()); newQuizRound(); }
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
