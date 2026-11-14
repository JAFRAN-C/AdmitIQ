// ─── AdmitIQ Full-Stack Application Controller ──────────────────
const App = {
  currentScreen: 'dashboard',
  chaptersData: null,
  chaptersList: [],
  activeNotesMeta: {},
  currentUser: null,

  homeActivePaper: '1st_paper',
  homeSearchQuery: '',
  allActivePaper: '1st_paper',
  allSearchQuery: '',

  activeExam: null,
  examTimerInterval: null,
  currentRetakeNoteId: null,
  selectedExamLength: 10,
  lastSubmittedSession: null,

  async init() {
    this.bindNavEvents();
    await this.loadUser();
    await this.loadChapters();
  },

  // ─── USER & AUTHENTICATION ──────────────────────────────────────
  async loadUser() {
    // 1. Try local storage cache
    try {
      const cached = localStorage.getItem('admitiq_user');
      if (cached) {
        this.currentUser = JSON.parse(cached);
        this.updateUserUI();
      }
    } catch (e) {
      console.warn('Local user parse error:', e);
    }

    // 2. Fetch fresh user state from backend
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (data && data.user) {
        this.currentUser = data.user;
        localStorage.setItem('admitiq_user', JSON.stringify(data.user));
        this.updateUserUI();
      }
    } catch (e) {
      console.warn('Auth check error:', e);
    }
  },

  updateUserUI() {
    const user = this.currentUser || {
      name: 'Sreya',
      email: 'sreya@admitiq.edu.bd',
      target_college: 'Dhaka Medical College (DMC)',
      target_exam: 'Medical Admission Test 2026',
      hsc_batch: 'HSC 2026'
    };

    document.querySelectorAll('.user-display-name').forEach(el => {
      el.textContent = user.name || 'Sreya';
    });

    const initial = (user.name || 'S').trim().charAt(0).toUpperCase();
    document.querySelectorAll('.user-avatar-letter').forEach(el => {
      el.textContent = initial || 'S';
    });

    const targetEl = document.getElementById('userProfileTargetExam');
    if (targetEl) {
      targetEl.textContent = `Target: ${user.target_exam || 'Medical Admission'} · ${user.target_college || 'Dhaka Medical College (DMC)'} · ${user.hsc_batch || 'HSC 2026'}`;
    }
  },

  openLoginModal() {
    const modal = document.getElementById('loginModal');
    if (!modal) return;

    const user = this.currentUser || {
      name: 'Sreya',
      email: 'sreya@admitiq.edu.bd',
      target_college: 'Dhaka Medical College (DMC)',
      hsc_batch: 'HSC 2026'
    };

    const nameInp = document.getElementById('loginInputName');
    const emailInp = document.getElementById('loginInputEmail');
    const colInp = document.getElementById('loginInputCollege');
    const batchInp = document.getElementById('loginInputBatch');

    if (nameInp) nameInp.value = user.name || '';
    if (emailInp) emailInp.value = user.email || '';
    if (colInp) colInp.value = user.target_college || 'Dhaka Medical College (DMC)';
    if (batchInp) batchInp.value = user.hsc_batch || 'HSC 2026';

    modal.classList.add('active');
  },

  closeLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) modal.classList.remove('active');
  },

  async handleLoginSubmit(e) {
    if (e) e.preventDefault();

    const nameInp = document.getElementById('loginInputName');
    const emailInp = document.getElementById('loginInputEmail');
    const colInp = document.getElementById('loginInputCollege');
    const batchInp = document.getElementById('loginInputBatch');

    const name = nameInp ? nameInp.value.trim() : 'Sreya';
    const email = emailInp ? emailInp.value.trim() : 'sreya@admitiq.edu.bd';
    const target_college = colInp ? colInp.value : 'Dhaka Medical College (DMC)';
    const hsc_batch = batchInp ? batchInp.value : 'HSC 2026';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          target_college,
          hsc_batch,
          target_exam: 'Medical Admission Test 2026'
        })
      });

      const data = await res.json();
      if (data && data.user) {
        this.currentUser = data.user;
        localStorage.setItem('admitiq_user', JSON.stringify(data.user));
        this.updateUserUI();
        this.closeLoginModal();

        if (this.currentScreen === 'profile') {
          this.renderProfileScreen();
        }
      }
    } catch (err) {
      console.error('Login submit error:', err);
      alert('Could not update profile on server.');
    }
  },

  async loginAsDemo() {
    const nameInp = document.getElementById('loginInputName');
    const emailInp = document.getElementById('loginInputEmail');
    const colInp = document.getElementById('loginInputCollege');
    const batchInp = document.getElementById('loginInputBatch');

    if (nameInp) nameInp.value = 'Sreya';
    if (emailInp) emailInp.value = 'sreya.aspirant@dmc.ac.bd';
    if (colInp) colInp.value = 'Dhaka Medical College (DMC)';
    if (batchInp) batchInp.value = 'HSC 2026';

    await this.handleLoginSubmit();
  },

  // ─── CHAPTERS & SYLLABUS DATA LOADER ─────────────────────────────
  async loadChapters() {
    try {
      const res = await fetch('/api/chapters');
      const data = await res.json();
      this.chaptersData = data.chapters;
      this.chaptersList = data.all || [
        ...(data.chapters?.botany || []),
        ...(data.chapters?.zoology || [])
      ];

      // Fetch living notes metadata to know which chapters are tested
      try {
        const notesRes = await fetch('/api/notes/living');
        const notesData = await notesRes.json();
        const livingList = notesData.livingNotes || [];
        this.activeNotesMeta = {};
        livingList.forEach(ln => {
          if (ln.chapterId) {
            this.activeNotesMeta[ln.chapterId] = ln;
          }
        });

        const testedCount = Object.keys(this.activeNotesMeta).length;
        const countEl = document.getElementById('dashChaptersTestedCount');
        if (countEl) countEl.textContent = `${testedCount} / 18`;
      } catch (ne) {
        console.warn('Living notes count fetch error:', ne);
      }

      this.renderHomeChaptersGrid();
      this.renderAllChaptersGrid();
    } catch (e) {
      console.warn('Chapters fetch error:', e);
    }
  },

  // ─── SYLLABUS HUB: DIRECT-ON-PAGE CHAPTERS RENDERING ────────────
  createChapterCardHTML(c) {
    const note = this.activeNotesMeta[c.id];
    const hasNote = Boolean(note && note.version);
    const noteVersion = note ? note.version : 1;
    const paperName = c.paper === '1st_paper' ? '🌿 Botany' : '🔬 Zoology';

    return `
      <div class="chapter-interactive-card" id="chapterCard-${c.id}">
        <div class="cic-top">
          <div class="cic-header-row">
            <span class="cic-chapter-pill">Chapter ${c.chapter_no}</span>
            <span class="cic-mcqs-count">${c.total_mcqs || 3} Questions</span>
          </div>
          <h4 class="cic-title-bn">${c.name_bn}</h4>
          <div class="cic-title-en">${c.name_en || ''}</div>
          <div style="margin-top:10px; display:flex; align-items:center; justify-content:space-between;">
            <span style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">${paperName}</span>
            ${hasNote ? `
              <span style="background:rgba(16,185,129,0.15); color:var(--accent-green); border:1px solid rgba(16,185,129,0.3); font-size:0.72rem; font-weight:800; padding:2px 8px; border-radius:10px;">
                Note v${noteVersion}.0 ✨
              </span>
            ` : `
              <span style="background:rgba(255,255,255,0.06); color:var(--text-dim); font-size:0.72rem; font-weight:700; padding:2px 8px; border-radius:10px;">
                Prime Ready 📘
              </span>
            `}
          </div>
        </div>

        <div class="cic-actions-row">
          <button class="btn-primary" onclick="App.startChapterExam(${c.id}, '${c.name_bn.replace(/'/g, "\\'")}', '${c.paper}')">
            🎯 Start Exam
          </button>
          <button class="btn-secondary" onclick="App.viewChapterLivingNote(${c.id})">
            📄 Study Note
          </button>
        </div>
      </div>
    `;
  },

  renderHomeChaptersGrid() {
    const container = document.getElementById('homeChaptersGrid');
    if (!container || !this.chaptersList) return;

    let filtered = this.chaptersList.filter(c => c.paper === this.homeActivePaper);

    if (this.homeSearchQuery) {
      filtered = filtered.filter(c => 
        (c.name_bn && c.name_bn.toLowerCase().includes(this.homeSearchQuery)) ||
        (c.name_en && c.name_en.toLowerCase().includes(this.homeSearchQuery))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md);">
          No chapters matched your search query "${this.homeSearchQuery}".
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => this.createChapterCardHTML(c)).join('');
  },

  renderAllChaptersGrid() {
    const container = document.getElementById('allChaptersGrid');
    if (!container || !this.chaptersList) return;

    let filtered = this.chaptersList.filter(c => c.paper === this.allActivePaper);

    if (this.allSearchQuery) {
      filtered = filtered.filter(c => 
        (c.name_bn && c.name_bn.toLowerCase().includes(this.allSearchQuery)) ||
        (c.name_en && c.name_en.toLowerCase().includes(this.allSearchQuery))
      );
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div style="grid-column: 1 / -1; padding: 32px; text-align: center; color: var(--text-muted); background: rgba(255,255,255,0.02); border-radius: var(--radius-md);">
          No chapters matched your search query "${this.allSearchQuery}".
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(c => this.createChapterCardHTML(c)).join('');
  },

  switchHomePaper(paperKey) {
    this.homeActivePaper = paperKey;
    const tabBotany = document.getElementById('homeTabBotany');
    const tabZoology = document.getElementById('homeTabZoology');

    if (paperKey === '1st_paper') {
      if (tabBotany) tabBotany.classList.add('active');
      if (tabZoology) tabZoology.classList.remove('active');
    } else {
      if (tabBotany) tabBotany.classList.remove('active');
      if (tabZoology) tabZoology.classList.add('active');
    }
    this.renderHomeChaptersGrid();
  },

  switchAllChaptersPaper(paperKey) {
    this.allActivePaper = paperKey;
    const tabBotany = document.getElementById('allTabBotany');
    const tabZoology = document.getElementById('allTabZoology');

    if (paperKey === '1st_paper') {
      if (tabBotany) tabBotany.classList.add('active');
      if (tabZoology) tabZoology.classList.remove('active');
    } else {
      if (tabBotany) tabBotany.classList.remove('active');
      if (tabZoology) tabZoology.classList.add('active');
    }
    this.renderAllChaptersGrid();
  },

  filterHomeChapters(query) {
    this.homeSearchQuery = (query || '').toLowerCase().trim();
    this.renderHomeChaptersGrid();
  },

  filterAllChapters(query) {
    this.allSearchQuery = (query || '').toLowerCase().trim();
    this.renderAllChaptersGrid();
  },

  // ─── NAVIGATION & ROUTING ────────────────────────────────────────
  bindNavEvents() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen) {
          this.showScreen(screen);
        }
      });
    });
  },

  showScreen(screenId) {
    this.currentScreen = screenId;

    // Update active nav button
    document.querySelectorAll('.nav-tab-btn').forEach(b => {
      if (b.dataset.screen === screenId) b.classList.add('active');
      else b.classList.remove('active');
    });

    // Toggle screen container visibility
    document.querySelectorAll('.screen-view').forEach(s => s.classList.remove('active'));
    const target = document.getElementById('screen-' + screenId);
    if (target) {
      target.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    if (screenId === 'chapters') {
      this.renderAllChaptersGrid();
    }

    if (screenId === 'notes') {
      Notes.renderNotesPage('notesRepositoryContainer');
    }

    if (screenId === 'dna') {
      DNA.renderChapterDnaScreen('chapterDnaContainer');
    }

    if (screenId === 'profile') {
      this.renderProfileScreen();
    }
  },

  viewAllLivingNotes() {
    this.showScreen('notes');
  },

  viewChapterLivingNote(chapterId) {
    Notes.currentFilters.chapterId = chapterId ? parseInt(chapterId) : null;
    this.showScreen('notes');
    setTimeout(() => {
      const docEl = document.getElementById(`chapterDoc-${chapterId}`);
      if (docEl) docEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 350);
  },

  setExamLength(length) {
    this.selectedExamLength = parseInt(length) || 10;
    document.querySelectorAll('.mlp-pill-btn').forEach(btn => {
      if (parseInt(btn.dataset.count) === this.selectedExamLength) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  },

  // ─── START EXAM MODES ────────────────────────────────────────────
  async startStandardExam(count = 10) {
    try {
      const res = await fetch(`/api/questions?limit=${count}`);
      const data = await res.json();
      const questions = data.questions || [];

      if (questions.length === 0) {
        alert('Could not fetch questions from server. Please verify backend is running.');
        return;
      }

      this.launchExam(questions, null, 'HSC Biology Comprehensive Diagnostic');
    } catch (e) {
      console.error('Error starting diagnostic exam:', e);
      alert('Network error loading diagnostic exam.');
    }
  },

  async startChapterExam(chapterId, chapterName, paper) {
    const count = this.selectedExamLength || 10;
    try {
      const res = await fetch(`/api/questions?chapter_id=${chapterId}&limit=${count}`);
      const data = await res.json();
      const questions = data.questions || [];

      if (questions.length === 0) {
        alert('Insufficient questions for this chapter. Starting standard diagnostic exam...');
        return this.startStandardExam(count);
      }

      this.launchExam(questions, chapterId, `${chapterName} · Diagnostic Exam`);
    } catch (e) {
      console.error('Error starting chapter exam:', e);
      this.startStandardExam(count);
    }
  },

  async startChapterAdaptiveRetake(chapterId, chapterName) {
    try {
      const res = await fetch(`/api/chapters/${chapterId}/retake`);
      const data = await res.json();
      const questions = data.questions || [];

      if (questions.length === 0) {
        alert('Could not generate adaptive questions for this chapter.');
        return;
      }

      const retakeTitle = `${chapterName || 'Chapter'} · Adaptive Retake (অ্যাডাপ্টিভ রিটেক পরীক্ষা)`;
      this.launchExam(questions, chapterId, retakeTitle);
    } catch (e) {
      console.error('Error starting adaptive retake:', e);
      alert('Failed to launch adaptive retake exam.');
    }
  },

  // ─── CORE EXAM ENGINE ────────────────────────────────────────────
  launchExam(questions, chapterId, examTitle) {
    // Initialize telemetry state for each question
    const itemsState = questions.map((q, idx) => ({
      question: q,
      index: idx,
      finalAnswer: null,
      clickHistory: [],
      timeSpent: 0,
      wasSkipped: false,
      answeredAfterSkip: false,
      firstChoiceText: null,
      finalChoiceText: null
    }));

    this.activeExam = {
      chapterId,
      title: examTitle,
      items: itemsState,
      currentIndex: 0,
      totalCount: itemsState.length,
      currentQuestionStartTime: Date.now(),
      timerRemaining: 30
    };

    this.showScreen('exam');
    this.renderBubblesStrip();
    this.loadQuestion(0);
  },

  renderBubblesStrip() {
    const strip = document.getElementById('examBubblesStrip');
    if (!strip || !this.activeExam) return;

    strip.innerHTML = this.activeExam.items.map((item, idx) => {
      let stateClass = '';
      if (idx === this.activeExam.currentIndex) {
        stateClass = 'current';
      } else if (item.finalAnswer !== null) {
        stateClass = 'answered';
      } else if (item.wasSkipped) {
        stateClass = 'skipped';
      }

      return `
        <div class="q-bubble ${stateClass}" onclick="App.jumpToQuestion(${idx})" title="Question ${idx + 1} (${item.wasSkipped ? 'Skipped' : item.finalAnswer !== null ? 'Answered' : 'Unanswered'})">
          ${idx + 1}
        </div>
      `;
    }).join('');
  },

  recordActiveTime() {
    const exam = this.activeExam;
    if (!exam) return;
    const currentItem = exam.items[exam.currentIndex];
    if (currentItem && exam.currentQuestionStartTime) {
      const elapsed = (Date.now() - exam.currentQuestionStartTime) / 1000;
      currentItem.timeSpent = parseFloat((currentItem.timeSpent + elapsed).toFixed(1));
    }
  },

  jumpToQuestion(index) {
    const exam = this.activeExam;
    if (!exam || index === exam.currentIndex || index < 0 || index >= exam.totalCount) return;

    this.recordActiveTime();
    this.loadQuestion(index);
  },

  loadQuestion(index) {
    const exam = this.activeExam;
    if (!exam || index < 0 || index >= exam.totalCount) return;

    exam.currentIndex = index;
    exam.currentQuestionStartTime = Date.now();
    exam.timerRemaining = 30;

    const item = exam.items[index];
    const q = item.question;

    // Update Question Meta
    const titleEl = document.getElementById('examActiveTitle');
    const numEl = document.getElementById('examCurrentNum');
    const totalEl = document.getElementById('examTotalCount');
    const topicEl = document.getElementById('examTopicTag');
    const textEl = document.getElementById('examQuestionText');
    const optionsContainer = document.getElementById('examOptionsStack');

    if (titleEl) titleEl.textContent = exam.title;
    if (numEl) numEl.textContent = (index + 1).toString().padStart(2, '0');
    if (totalEl) totalEl.textContent = exam.totalCount.toString().padStart(2, '0');
    if (topicEl) topicEl.textContent = q.topicBn || q.chapterName || 'HSC Biology';
    if (textEl) textEl.textContent = q.text;

    // Render Options Stack (A, B, C, D)
    const letters = ['A', 'B', 'C', 'D'];
    if (optionsContainer) {
      optionsContainer.innerHTML = q.options.map((opt, i) => {
        const isSelected = item.finalAnswer === i;
        return `
          <button class="mcq-option-card ${isSelected ? 'selected' : ''}" onclick="App.chooseOption(${i})">
            <span class="opt-letter-badge">${letters[i]}</span>
            <span class="opt-text-bangla">${opt}</span>
            <span class="opt-check-indicator">${isSelected ? '✓' : ''}</span>
          </button>
        `;
      }).join('');
    }

    // Update Navigation Buttons
    const btnPrev = document.getElementById('btnPrevQuestion');
    const btnNext = document.getElementById('btnNextQuestion');
    const btnSubmit = document.getElementById('btnSubmitExam');

    if (btnPrev) {
      btnPrev.disabled = index === 0;
      btnPrev.style.opacity = index === 0 ? '0.4' : '1';
      btnPrev.style.cursor = index === 0 ? 'not-allowed' : 'pointer';
    }

    const isLast = index === exam.totalCount - 1;
    if (btnNext) {
      btnNext.style.display = isLast ? 'none' : 'inline-flex';
    }
    if (btnSubmit) {
      btnSubmit.style.display = isLast ? 'inline-flex' : 'none';
    }

    this.renderBubblesStrip();
    this.startCountdown();
  },

  startCountdown() {
    clearInterval(this.examTimerInterval);
    const timerDisplay = document.getElementById('examTimerDisplay');
    const timerPill = document.getElementById('examTimerPill');

    const tick = () => {
      if (!this.activeExam) return;

      if (timerDisplay) {
        timerDisplay.textContent = `00:${this.activeExam.timerRemaining.toString().padStart(2, '0')}`;
      }

      if (this.activeExam.timerRemaining <= 5) {
        if (timerPill) timerPill.classList.add('timer-alert');
      } else {
        if (timerPill) timerPill.classList.remove('timer-alert');
      }

      if (this.activeExam.timerRemaining <= 0) {
        clearInterval(this.examTimerInterval);
        this.nextQuestion();
        return;
      }

      this.activeExam.timerRemaining--;
    };

    tick();
    this.examTimerInterval = setInterval(tick, 1000);
  },

  chooseOption(optIndex) {
    const exam = this.activeExam;
    if (!exam) return;

    const item = exam.items[exam.currentIndex];
    const q = item.question;

    // Record click history to track option-switching
    const elapsedSinceQStart = (Date.now() - exam.currentQuestionStartTime) / 1000;
    item.clickHistory.push({
      option: optIndex,
      time: parseFloat(elapsedSinceQStart.toFixed(1))
    });

    item.finalAnswer = optIndex;
    if (item.firstChoiceText === null) {
      item.firstChoiceText = q.options[optIndex];
    }
    item.finalChoiceText = q.options[optIndex];

    // If question was previously passed/skipped, student has now answered it!
    if (item.wasSkipped) {
      item.answeredAfterSkip = true;
    }

    // Update UI Cards
    const cards = document.querySelectorAll('.mcq-option-card');
    cards.forEach((card, idx) => {
      if (idx === optIndex) {
        card.classList.add('selected');
        const check = card.querySelector('.opt-check-indicator');
        if (check) check.textContent = '✓';
      } else {
        card.classList.remove('selected');
        const check = card.querySelector('.opt-check-indicator');
        if (check) check.textContent = '';
      }
    });

    this.renderBubblesStrip();
  },

  prevQuestion() {
    const exam = this.activeExam;
    if (!exam || exam.currentIndex <= 0) return;

    this.recordActiveTime();
    this.loadQuestion(exam.currentIndex - 1);
  },

  nextQuestion() {
    const exam = this.activeExam;
    if (!exam) return;

    this.recordActiveTime();

    const currentItem = exam.items[exam.currentIndex];
    // If student clicks Next without selecting an answer, it counts as skipped
    if (currentItem && currentItem.finalAnswer === null) {
      currentItem.wasSkipped = true;
      currentItem.answeredAfterSkip = false;
    }

    if (exam.currentIndex < exam.totalCount - 1) {
      this.loadQuestion(exam.currentIndex + 1);
    } else {
      this.finishExam();
    }
  },

  // ─── EXAM SUBMISSION & 7-PATTERN PAYLOAD GENERATION ──────────────
  async finishExam() {
    clearInterval(this.examTimerInterval);
    this.recordActiveTime();

    const exam = this.activeExam;
    if (!exam) return;

    const letters = ['A', 'B', 'C', 'D'];

    // Construct telemetry payload for all questions
    const telemetry = exam.items.map(item => {
      const q = item.question;
      const switchCount = Math.max(0, item.clickHistory.length - 1);
      const isCorrect = item.finalAnswer !== null && item.finalAnswer === q.correct;
      const clickPath = item.clickHistory.map(c => letters[c.option]);
      const timeTaken = item.timeSpent > 0 ? parseFloat(item.timeSpent.toFixed(1)) : 2.5;

      const wasSkipped = Boolean(item.wasSkipped || item.finalAnswer === null);
      const answeredAfterSkip = Boolean(item.answeredAfterSkip && item.finalAnswer !== null);

      return {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        correctAnswerIndex: q.correct,
        finalAnswerIndex: item.finalAnswer,
        timeTaken,
        switchCount,
        clickPath,
        wasSkipped,
        answeredAfterSkip,
        answeredAtEnd: answeredAfterSkip,
        isCorrect,
        firstChoiceText: item.firstChoiceText,
        finalChoiceText: item.finalChoiceText,
        topic: q.topicBn || q.topic || 'General',
        chapterName: q.chapterName || exam.title,
        explanation: q.explanation || '',
        trap: q.trap || ''
      };
    });

    try {
      const res = await fetch('/api/exams/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: exam.chapterId,
          telemetry
        })
      });

      const result = await res.json();
      this.lastSubmittedSession = result;

      this.renderResultsScreen(result);

      // Synthesize AI living notes and update chapter document
      this.autoGenerateSessionNotes(result);

      // Refresh chapters & tested counts in background
      this.loadChapters();
    } catch (e) {
      console.error('Failed to submit exam:', e);
      alert('Error submitting exam telemetry to server.');
    }
  },

  // ─── RESULTS PRESENTATION ────────────────────────────────────────
  renderResultsScreen(result) {
    this.showScreen('results');

    const scoreEl = document.getElementById('resScoreNum');
    const accEl = document.getElementById('resAccuracyPercent');
    const timeEl = document.getElementById('resAvgTimeTaken');
    const totalQEl = document.getElementById('resTotalQNum');
    const patternTitle = document.getElementById('resDominantPatternName');
    const patternDesc = document.getElementById('resDominantPatternDesc');

    if (scoreEl) scoreEl.textContent = `${result.correctCount} / ${result.totalQuestions}`;
    if (accEl) accEl.textContent = `${result.accuracy}%`;
    if (timeEl) timeEl.textContent = `${result.avgTime}s`;
    if (totalQEl) totalQEl.textContent = result.totalQuestions;

    const pMeta = DNA.meta[result.dominantPattern] || DNA.meta[0];
    if (patternTitle) patternTitle.textContent = `${pMeta.icon} Pattern ${result.dominantPattern}: ${pMeta.name} (${pMeta.badge})`;
    if (patternDesc) patternDesc.textContent = pMeta.desc;

    // Render detailed 7-Pattern Breakdown
    DNA.renderSummary('dnaBreakdownSlot', result.classifiedItems);

    // Render Question-by-Question Telemetry Breakdown
    DNA.renderQuestionBreakdown('examQuestionsBreakdownSlot', result.classifiedItems);

    // Initial placeholder for session notes
    const sessionNotesContainer = document.getElementById('examSessionNotesContainer');
    const sessionNotesStatus = document.getElementById('examSessionNotesStatus');

    if (result.chapterLivingNote) {
      if (sessionNotesStatus) sessionNotesStatus.textContent = `Living Document v${result.chapterLivingNote.version}.0 Synchronized ✨`;
      Notes.renderNotesToElement(result.chapterLivingNote, sessionNotesContainer);
    } else {
      if (sessionNotesStatus) sessionNotesStatus.textContent = 'Synthesizing living notes... 🧠';
      if (sessionNotesContainer) {
        sessionNotesContainer.innerHTML = `
          <div style="background:var(--bg-subtle); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:24px; text-align:center;">
            <div style="font-size:1.8rem; margin-bottom:8px;">✨🧠✨</div>
            <p style="color:var(--text-muted); font-size:0.92rem;">
              Analyzing answering telemetry to synthesize unified chapter study notes...
            </p>
          </div>
        `;
      }
    }
  },

  // ─── AUTOMATIC AI NOTE SYNTHESIS FOR CURRENT EXAM SESSION ─────────
  async autoGenerateSessionNotes(result) {
    const sessionNotesContainer = document.getElementById('examSessionNotesContainer');
    const sessionNotesStatus = document.getElementById('examSessionNotesStatus');

    try {
      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: result.sessionId,
          items: result.classifiedItems
        })
      });

      const data = await res.json();
      const livingDoc = data.chapterLivingNote || result.chapterLivingNote;

      if (sessionNotesStatus) {
        sessionNotesStatus.textContent = livingDoc ? `Chapter Living Document v${livingDoc.version}.0 Ready ✨` : 'Study notes synthesized ✨';
      }

      if (sessionNotesContainer) {
        if (livingDoc) {
          Notes.renderNotesToElement(livingDoc, sessionNotesContainer);
        } else {
          Notes.renderNotesToElement(data.notes || [], sessionNotesContainer);
        }
      }
    } catch (e) {
      console.error('Auto note generation error:', e);
      if (sessionNotesStatus) sessionNotesStatus.textContent = 'Note generation error';
    }
  },

  // ─── PROFILE & HISTORY SCREEN RENDERER ───────────────────────────
  async renderProfileScreen() {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();

      // 1. Update Profile Banner
      if (data.user) {
        this.currentUser = data.user;
        this.updateUserUI();
      }

      // 2. Update Stats
      const stats = data.stats || {};
      const elTotalExams = document.getElementById('profTotalExams');
      const elChaptersTested = document.getElementById('profChaptersTested');
      const elOverallAcc = document.getElementById('profOverallAccuracy');
      const elAvgSpeed = document.getElementById('profAvgSpeed');

      if (elTotalExams) elTotalExams.textContent = stats.totalExams || 0;
      if (elChaptersTested) elChaptersTested.textContent = `${stats.chaptersTested || 0} / 18`;
      if (elOverallAcc) elOverallAcc.textContent = `${stats.overallAccuracy || 0}%`;
      if (elAvgSpeed) elAvgSpeed.textContent = `${stats.avgSpeed || 0}s`;

      // 3. Render Chapter Living Notes & Mastery Progress Table
      const chapterContainer = document.getElementById('profChapterProgressContainer');
      const chapterProgress = data.chapterProgress || [];

      if (chapterContainer) {
        if (chapterProgress.length === 0) {
          chapterContainer.innerHTML = `
            <div style="padding:20px; color:var(--text-muted); text-align:center;">
              No chapters data found.
            </div>
          `;
        } else {
          chapterContainer.innerHTML = `
            <table class="custom-profile-table">
              <thead>
                <tr>
                  <th style="width:22%;">Paper & Chapter</th>
                  <th style="width:26%;">Chapter Title</th>
                  <th style="width:14%;">Living Note</th>
                  <th style="width:12%;">Exams Count</th>
                  <th style="width:14%;">Mastery</th>
                  <th style="width:12%; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${chapterProgress.map(c => {
                  const hasNote = Boolean(c.version);
                  const paperLbl = c.paper === '1st_paper' ? '🌿 1st Paper (Botany)' : '🔬 2nd Paper (Zoology)';
                  const mastery = c.mastery_percent || 0;
                  return `
                    <tr>
                      <td style="font-size:0.82rem; color:var(--text-dim);">
                        ${paperLbl}<br>
                        <strong style="color:var(--text-muted);">Chapter ${c.chapter_no}</strong>
                      </td>
                      <td>
                        <strong style="font-family:var(--font-bangla); color:#fff; font-size:0.95rem;">
                          ${c.chapter_name}
                        </strong>
                      </td>
                      <td>
                        ${hasNote ? `
                          <span class="doc-version-pill" style="font-size:0.75rem;">
                            v${c.version}.0
                          </span>
                        ` : `
                          <span style="color:var(--text-dim); font-size:0.78rem;">Not started</span>
                        `}
                      </td>
                      <td>
                        <strong style="color:#fff;">${c.exams_count || 0}</strong>
                        <span style="color:var(--text-dim); font-size:0.75rem;"> exams</span>
                      </td>
                      <td>
                        <div style="display:flex; align-items:center; gap:8px;">
                          <div style="flex:1; height:6px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                            <div style="width:${mastery}%; height:100%; background:${mastery >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)'};"></div>
                          </div>
                          <span style="font-size:0.78rem; font-weight:700; color:${mastery >= 75 ? 'var(--accent-green)' : 'var(--accent-amber)'};">
                            ${mastery}%
                          </span>
                        </div>
                      </td>
                      <td style="text-align:right; white-space:nowrap;">
                        <button class="btn-secondary" style="padding:4px 10px; font-size:0.76rem; margin-right:4px;" onclick="App.viewChapterLivingNote(${c.chapter_id})">
                          Note 📄
                        </button>
                        <button class="btn-primary" style="padding:4px 10px; font-size:0.76rem;" onclick="App.startChapterAdaptiveRetake(${c.chapter_id}, '${c.chapter_name.replace(/'/g, "\\'")}')">
                          Retake 🎯
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `;
        }
      }

      // 4. Render Full Exam Session History Table
      const historyContainer = document.getElementById('profExamHistoryContainer');
      const history = data.history || [];

      if (historyContainer) {
        if (history.length === 0) {
          historyContainer.innerHTML = `
            <div style="background:rgba(255,255,255,0.02); border-radius:var(--radius-sm); padding:24px; text-align:center; color:var(--text-muted); font-size:0.9rem;">
              No past exam sessions recorded yet. Practice a diagnostic exam or chapter exam to begin your cognitive tracking!
            </div>
          `;
        } else {
          historyContainer.innerHTML = `
            <table class="custom-profile-table">
              <thead>
                <tr>
                  <th style="width:14%;">Session / Date</th>
                  <th style="width:26%;">Chapter / Exam</th>
                  <th style="width:14%;">Score</th>
                  <th style="width:14%;">Accuracy</th>
                  <th style="width:20%;">Dominant Pattern</th>
                  <th style="width:12%; text-align:right;">Actions</th>
                </tr>
              </thead>
              <tbody>
                ${history.map(h => {
                  const pMeta = DNA.meta[h.dominant_pattern] || DNA.meta[0];
                  const examDate = h.created_at ? new Date(h.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recent';
                  const title = h.chapter_name ? `${h.paper === '1st_paper' ? '1st' : '2nd'} · Ch ${h.chapter_no}: ${h.chapter_name}` : 'Comprehensive Diagnostic';

                  return `
                    <tr>
                      <td style="font-size:0.8rem; color:var(--text-dim);">
                        <strong style="color:var(--text-muted);">#${h.session_id}</strong><br>
                        ${examDate}
                      </td>
                      <td>
                        <strong style="color:#fff; font-size:0.9rem; font-family:var(--font-bangla);">
                          ${title}
                        </strong>
                        <div style="color:var(--text-dim); font-size:0.75rem;">Speed: ${h.avg_time}s / question</div>
                      </td>
                      <td>
                        <strong style="color:#fff; font-size:0.95rem;">${h.score}</strong>
                        <span style="color:var(--text-dim); font-size:0.8rem;"> / ${h.total_questions}</span>
                      </td>
                      <td>
                        <span style="font-weight:800; font-size:0.88rem; color:${h.accuracy >= 75 ? 'var(--accent-green)' : h.accuracy >= 50 ? 'var(--accent-amber)' : 'var(--accent-red)'};">
                          ${h.accuracy}%
                        </span>
                      </td>
                      <td>
                        <span style="display:inline-flex; align-items:center; gap:4px; font-size:0.78rem; color:${pMeta.color}; font-weight:700;">
                          <span>${pMeta.icon}</span>
                          <span>${pMeta.name}</span>
                        </span>
                      </td>
                      <td style="text-align:right; white-space:nowrap;">
                        ${h.chapter_id ? `
                          <button class="btn-secondary" style="padding:4px 10px; font-size:0.76rem;" onclick="App.viewChapterLivingNote(${h.chapter_id})">
                            View Note 📄
                          </button>
                        ` : ''}
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          `;
        }
      }
    } catch (e) {
      console.error('Error rendering profile screen:', e);
    }
  }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
