// ─── AdmitIQ Intro Animation ───────────────────────────────
// Plays once on first visit. Pure CSS + JS — no dependencies.
// Mirrors the Framer Motion spec with cubic-bezier(0.22,1,0.36,1)

const Intro = {

  words: [
    { letter: 'A', rest: 'ptitude' },
    { letter: 'D', rest: 'iagnostics' },
    { letter: 'M', rest: 'astery' },
    { letter: 'I', rest: 'ntelligence' },
    { letter: 'T', rest: 'actics' },
    { letter: 'I', rest: 'nsight' },
    { letter: 'Q', rest: 'uotient' }
  ],

  played: false,

  shouldPlay() {
    // Only play once per session
    return !sessionStorage.getItem('admitiq_intro_played');
  },

  init(onComplete) {
    if (!Intro.shouldPlay()) {
      onComplete();
      return;
    }

    sessionStorage.setItem('admitiq_intro_played', '1');
    Intro.play(onComplete);
  },

  play(onComplete) {
    // Build overlay
    const overlay = document.createElement('div');
    overlay.id = 'intro-overlay';
    overlay.innerHTML = `
      <div id="intro-stage">
        <div id="intro-words-wrap">
          ${Intro.words.map((w, i) => `
            <div class="intro-word" data-index="${i}">
              <span class="intro-letter">${w.letter}</span><span class="intro-rest">${w.rest}</span>
            </div>
          `).join('')}
        </div>
        <div id="intro-brand">AdmitIQ</div>
        <div id="intro-tagline">Know how you think.</div>
      </div>
    `;
    document.body.appendChild(overlay);

    const wordEls    = overlay.querySelectorAll('.intro-word');
    const letterEls  = overlay.querySelectorAll('.intro-letter');
    const restEls    = overlay.querySelectorAll('.intro-rest');
    const wordsWrap  = overlay.querySelector('#intro-words-wrap');
    const brand      = overlay.querySelector('#intro-brand');
    const tagline    = overlay.querySelector('#intro-tagline');

    // ── Phase 1: 0.0s–3.0s — staggered word fade-in ──────
    wordEls.forEach((el, i) => {
      setTimeout(() => {
        el.classList.add('word-visible');
      }, 200 + i * 400);  // 0.2s, 0.6s, 1.0s, 1.4s, 1.8s, 2.2s, 2.6s
    });

    // ── Phase 2: 3.2s–3.8s — accent first letters, dim rest ──
    setTimeout(() => {
      letterEls.forEach(el => el.classList.add('letter-accent'));
      restEls.forEach(el => el.classList.add('rest-dim'));
    }, 3200);

    // ── Phase 3: 4.4s–4.8s — compress + form AdmitIQ ──────
    setTimeout(() => {
      wordsWrap.classList.add('words-compress');
      wordEls.forEach(el => el.classList.add('word-compress'));
    }, 4400);

    setTimeout(() => {
      wordsWrap.style.opacity = '0';
      brand.classList.add('brand-visible');
    }, 4800);

    // ── Phase 4: 5.0s–5.6s — tagline fade in ────────────
    setTimeout(() => {
      tagline.classList.add('tagline-visible');
    }, 5000);

    // ── Phase 5: 6.0s–6.4s — fade to black + complete ───
    setTimeout(() => {
      overlay.classList.add('overlay-fadeout');
    }, 6000);

    setTimeout(() => {
      overlay.remove();
      onComplete();
    }, 6500);
  }
};
