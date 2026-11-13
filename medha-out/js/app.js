// ─── AdmitIQ Full-Stack Application Controller ──────────────────
const App = {
  currentScreen: 'dashboard',
  chaptersData: null,
  activeExam: null,
  examTimerInterval: null,
  currentRetakeNoteId: null,
  selectedExamLength: 10,
  lastSubmittedSession: null,

  async init() {
    this.bindNavEvents();
    await this.loadProfile();
    await this.loadChapters();
  },

  async loadProfile() {
    try {
      const res = await fetch('/api/profile');
      const data = await res.json();
      if (data.user) {
        document.querySelectorAll('.user-display-name').forEach(el => {
          el.textContent = data.user.name;
        });
      }
    } catch (e) {
      console.warn('Profile fetch error:', e);
    }
  },

  async loadChapters() {
    try {
      const res = await fetch('/api/chapters');
      const data = await res.json();
      this.chaptersData = data.chapters;
      this.renderChaptersSelector();
    } catch (e) {
      console.warn('Chapters fetch error:', e);
    }
  },

  bindNavEvents() {
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const screen = btn.dataset.screen;
        if (screen && screen !== 'chapters') {
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

    if (screenId === 'notes') {
      Notes.renderNotesPage('notesRepositoryContainer');
    }
  },

  // ─── CHAPTER & SYLLABUS SELECTOR MODAL ──────────────────────────
  openChapterSelector(defaultPaper = '1st_paper') {
    const modal = document.getElementById('chapterSelectModal');
    if (modal) {
      modal.classList.add('active');
      this.switchPaperTab(defaultPaper);
    }
  },

  closeChapterSelector() {
    const modal = document.getElementById('chapterSelectModal');
    if (modal) modal.classList.remove('active');
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

  switchPaperTab(paperKey) {
    const tabBotany = document.getElementById('tabBotany');
    const tabZoology = document.getElementById('tabZoology');
    const botanySec = document.getElementById('botanySection');
    const zoologySec = document.getElementById('zoologySection');

    if (paperKey === '1st_paper') {
      if (tabBotany) tabBotany.classList.add('active');
      if (tabZoology) tabZoology.classList.remove('active');
      if (botanySec) botanySec.style.display = 'block';
      if (zoologySec) zoologySec.style.display = 'none';
    } else {
      if (tabBotany) tabBotany.classList.remove('active');
      if (tabZoology) tabZoology.classList.add('active');
      if (botanySec) botanySec.style.display = 'none';
      if (zoologySec) zoologySec.style.display = 'block';
    }
  },

  renderChaptersSelector() {
    const botanyContainer = document.getElementById('botanyChaptersList');
    const zoologyContainer = document.getElementById('zoologyChaptersList');

    if (!this.chaptersData) return;

    if (botanyContainer) {
      botanyContainer.innerHTML = this.chaptersData.botany.map(c => `
        <div class="chapter-item-card" onclick="App.startChapterExam(${c.id}, '${c.name_bn}', '1st_paper')">
          <div class="cic-left">
            <span class="cic-no">Chapter ${c.chapter_no} · Botany</span>
            <span class="cic-name-bn">${c.name_bn}</span>
            <span class="cic-name-en">${c.name_en}</span>
          </div>
          <button class="btn-start-ch">Start →</button>
        </div>
      `).join('');
    }

    if (zoologyContainer) {
      zoologyContainer.innerHTML = this.chaptersData.zoology.map(c => `
        <div class="chapter-item-card" onclick="App.startChapterExam(${c.id}, '${c.name_bn}', '2nd_paper')">
          <div class="cic-left">
            <span class="cic-no">Chapter ${c.chapter_no} · Zoology</span>
            <span class="cic-name-bn">${c.name_bn}</span>
            <span class="cic-name-en">${c.name_en}</span>
          </div>
          <button class="btn-start-ch">Start →</button>
        </div>
      `).join('');
    }
  },

  // ─── EXAM LAUNCHERS ──────────────────────────────────────────────
  async startStandardExam(count = 10) {
    this.closeChapterSelector();
    try {
      const res = await fetch(`/api/questions?limit=${count}`);
      const data = await res.json();
      const questions = data.questions || [];
      if (questions.length === 0) {
        alert('Could not load questions from server.');
        return;
      }
      this.launchExam(questions, null, 'Biology Comprehensive Diagnostic');
    } catch (e) {
      console.error('Error starting standard exam:', e);
      alert('Network error connecting to exam server.');
    }
  },

  async startChapterExam(chapterId, chapterName, paper) {
    this.closeChapterSelector();
    const count = this.selectedExamLength || 10;
    try {
      const res = await fetch(`/api/questions?chapter_id=${chapterId}&limit=${count}`);
      const data = await res.json();
      const questions = data.questions || [];

      if (questions.length === 0) {
        alert('Insufficient questions for this chapter. Starting standard diagnostic exam...');
        return this.startStandardExam(count);
      }

      this.launchExam(questions, chapterId, `${chapterName} · Diagnostic`);
    } catch (e) {
      console.error('Error starting chapter exam:', e);
      this.startStandardExam(count);
    }
  },

  // ─── CORE EXAM ENGINE ────────────────────────────────────────────
  launchExam(questions, chapterId, examTitle) {
    // Initialize state for each question
    const itemsState = questions.map((q, idx) => ({
      question: q,
      index: idx,
      finalAnswer: null,
      clickHistory: [],
      timeSpent: 0,
      wasSkipped: false,
      answeredAtEnd: false
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
        <div class="q-bubble ${stateClass}" onclick="App.jumpToQuestion(${idx})" title="Jump to question ${idx + 1}">
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

    // Check if previously skipped and now being answered
    if (item.wasSkipped && item.finalAnswer !== null) {
      item.answeredAtEnd = true;
    }

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
    if (topicEl) topicEl.textContent = q.topicBn || q.chapterName || 'Biology';
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
        // Time expired for this question, auto-advance
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
    const previousAnswer = item.finalAnswer;

    // Record click history to track option-switching
    const elapsedSinceQStart = (Date.now() - exam.currentQuestionStartTime) / 1000;
    item.clickHistory.push({
      option: optIndex,
      time: parseFloat(elapsedSinceQStart.toFixed(1))
    });

    item.finalAnswer = optIndex;

    // If question was skipped earlier, it is now being answered
    if (item.wasSkipped) {
      item.answeredAtEnd = true;
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

  skipCurrentQuestion() {
    const exam = this.activeExam;
    if (!exam) return;

    const item = exam.items[exam.currentIndex];
    item.wasSkipped = true;

    this.renderBubblesStrip();
    this.nextQuestion();
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

      let firstChoiceText = null;
      let finalChoiceText = null;
      if (item.clickHistory.length > 0) {
        firstChoiceText = q.options[item.clickHistory[0].option];
      }
      if (item.finalAnswer !== null) {
        finalChoiceText = q.options[item.finalAnswer];
      }

      return {
        questionId: q.id,
        questionText: q.text,
        options: q.options,
        correctAnswerIndex: q.correct,
        finalAnswerIndex: item.finalAnswer,
        timeTaken: item.timeSpent > 0 ? item.timeSpent : 5.0,
        switchCount,
        clickPath,
        wasSkipped: item.wasSkipped,
        answeredAtEnd: item.answeredAtEnd,
        isCorrect,
        firstChoiceText,
        finalChoiceText,
        topic: q.topicBn || q.topic || 'General',
        chapterName: q.chapterName || exam.title
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

      // If completing an adaptive retake exam, trigger version upgrade
      if (this.currentRetakeNoteId) {
        await this.handleRetakeCompletion(result);
        return;
      }

      this.renderResultsScreen(result);
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
    if (patternTitle) patternTitle.textContent = `${pMeta.icon} ${pMeta.name} (${pMeta.badge})`;
    if (patternDesc) patternDesc.textContent = pMeta.desc;

    // Render detailed 7-Pattern Breakdown
    DNA.renderSummary('dnaBreakdownSlot', result.classifiedItems);
  },

  // ─── AI LIVING NOTE SYNTHESIS (GROQ QWEN) ────────────────────────
  async generateNotesAfterExam() {
    if (!this.lastSubmittedSession) return;

    const modal = document.getElementById('aiGeneratingModal');
    if (modal) modal.classList.add('active');

    try {
      const res = await fetch('/api/notes/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: this.lastSubmittedSession.sessionId,
          items: this.lastSubmittedSession.classifiedItems
        })
      });

      const data = await res.json();
      if (modal) modal.classList.remove('active');

      // Navigate to Living Notes Screen
      this.showScreen('notes');
    } catch (e) {
      if (modal) modal.classList.remove('active');
      console.error('Note generation failed:', e);
      alert('AI note generation timed out or encountered an error. Please try again.');
    }
  },

  // ─── ADAPTIVE RETAKE EXECUTION ──────────────────────────────────
  startAdaptiveRetakeExam(retakeData) {
    this.currentRetakeNoteId = retakeData.noteId;
    this.launchExam(retakeData.questions, null, `Targeted Retake: ${retakeData.topic}`);
  },

  async handleRetakeCompletion(result) {
    const noteId = this.currentRetakeNoteId;
    this.currentRetakeNoteId = null;

    const isPassed = result.accuracy >= 70 && result.avgTime <= 8;

    try {
      const res = await fetch(`/api/notes/${noteId}/retake/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPassedWithConfidence: isPassed })
      });
      const data = await res.json();

      alert(`🎉 Congratulations! Your living study note has upgraded to Version ${data.version}.0 with ${data.masteryPercent}% mastery!`);
      this.showScreen('notes');
    } catch (e) {
      console.error('Retake completion error:', e);
      this.showScreen('notes');
    }
  }
};

// Initialize Application on Page Load
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
