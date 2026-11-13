// ─── AdmitIQ 7-Pattern Behavioral Telemetry Engine ───────────────
const Tracker = {
  sessions: [],
  current: null,
  skippedQuestionIds: new Set(),
  answeredOrder: [],

  reset() {
    this.sessions = [];
    this.current = null;
    this.skippedQuestionIds.clear();
    this.answeredOrder = [];
  },

  startQuestion(question, index) {
    this.current = {
      question,
      questionId: question.id,
      questionIndex: index,
      startTime: Date.now(),
      clickHistory: [], // [{ optionIndex, timestamp }]
      finalAnswer: null,
      correctAnswer: question.correct,
      timeTaken: 0,
      wasSkipped: this.skippedQuestionIds.has(question.id)
    };
  },

  recordClick(optionIndex) {
    if (!this.current) return;
    this.current.clickHistory.push({
      option: optionIndex,
      timestamp: Date.now() - this.current.startTime
    });
    this.current.finalAnswer = optionIndex;
  },

  markSkipped() {
    if (!this.current) return;
    this.skippedQuestionIds.add(this.current.questionId);
    this.current.wasSkipped = true;
    this.current.timeTaken = parseFloat(((Date.now() - this.current.startTime) / 1000).toFixed(1));
    this.current.isCorrect = false;
    this.current.switchCount = Math.max(0, this.current.clickHistory.length - 1);
    this.current.answeredAtEnd = false;
    
    // Save partial session and advance
    this.sessions.push({ ...this.current });
    this.current = null;
  },

  endQuestion(isLastQuestion = false) {
    if (!this.current) return;
    this.current.timeTaken = parseFloat(((Date.now() - this.current.startTime) / 1000).toFixed(1));
    this.current.isCorrect = this.current.finalAnswer === this.current.correctAnswer;
    this.current.switchCount = Math.max(0, this.current.clickHistory.length - 1);
    
    const letters = ['A', 'B', 'C', 'D'];
    this.current.clickPath = this.current.clickHistory.map(c => letters[c.option]);
    
    // Check if this question was previously skipped and answered at the end
    const wasPreviouslySkipped = this.skippedQuestionIds.has(this.current.questionId);
    this.current.wasSkipped = wasPreviouslySkipped;
    this.current.answeredAtEnd = wasPreviouslySkipped && this.current.finalAnswer !== null;

    if (this.current.clickHistory.length > 0) {
      const firstOpt = this.current.clickHistory[0].option;
      this.current.firstChoiceText = this.current.question.options[firstOpt];
    }
    if (this.current.finalAnswer !== null) {
      this.current.finalChoiceText = this.current.question.options[this.current.finalAnswer];
    }

    // Classify into the 7 AdmitIQ Patterns
    this.current.patternType = this.classifyPattern(this.current);

    this.sessions.push({ ...this.current });
    this.answeredOrder.push(this.current.questionId);
    this.current = null;
  },

  classifyPattern(item) {
    if (item.finalAnswer === null || item.finalAnswer === undefined) {
      return 7; // Pattern 7: Unattempted / Timed Out
    }
    if (item.wasSkipped && item.answeredAtEnd) {
      return 6; // Pattern 6: Skip & Return at End (Panic Blank)
    }
    if (item.switchCount >= 1 && item.isCorrect) {
      return 3; // Pattern 3: Switched + Correct (Borderline Ambiguity)
    }
    if (item.switchCount >= 1 && !item.isCorrect) {
      return 4; // Pattern 4: Switched + Wrong (Distractor Trap)
    }
    if (!item.isCorrect && item.timeTaken <= 6 && item.switchCount === 0) {
      return 5; // Pattern 5: Fast + Wrong (Confidently Wrong - NEGATIVE MARKING DANGER!)
    }
    if (!item.isCorrect && item.timeTaken > 6) {
      return 2; // Pattern 2: Slow + Wrong (Foundational Concept Gap)
    }
    if (item.isCorrect && item.timeTaken > 6 && item.switchCount === 0) {
      return 1; // Pattern 1: Slow + Correct (Memory Decay / Retrieval Strain)
    }
    return 0; // Mastered (Fast & Correct with high confidence)
  },

  getAll() {
    return this.sessions;
  },

  buildPayload() {
    return this.sessions.map(s => {
      const q = s.question;
      return {
        questionId: s.questionId,
        questionText: q.text,
        options: q.options,
        correctAnswerIndex: s.correctAnswer,
        finalAnswerIndex: s.finalAnswer,
        timeTaken: s.timeTaken,
        switchCount: s.switchCount,
        clickPath: s.clickPath || [],
        wasSkipped: s.wasSkipped || false,
        answeredAtEnd: s.answeredAtEnd || false,
        isCorrect: s.isCorrect,
        patternType: s.patternType,
        firstChoiceText: s.firstChoiceText || null,
        finalChoiceText: s.finalChoiceText || null,
        topic: q.topicBn || q.topic || 'General',
        chapterName: q.chapterName || 'Biology'
      };
    });
  }
};
