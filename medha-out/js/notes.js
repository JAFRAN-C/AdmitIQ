// ─── AdmitIQ Dynamic Living Notes Engine ────────────────────────
const Notes = {

  async fetchAllNotes() {
    try {
      const res = await fetch('/api/notes');
      const data = await res.json();
      return data.notes || [];
    } catch (e) {
      console.error('Failed to fetch notes:', e);
      return [];
    }
  },

  async renderNotesPage(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center; padding: 40px; color: var(--text-muted);">
        <p>Loading your living study notes...</p>
      </div>
    `;

    const notes = await this.fetchAllNotes();

    if (notes.length === 0) {
      container.innerHTML = `
        <div class="notes-empty-state">
          <div class="nes-icon">📑</div>
          <h3 class="nes-title">No Living Study Notes Generated Yet</h3>
          <p class="nes-desc">
            পরীক্ষা দিন—আপনার অপশন পরিবর্তন, সিদ্ধান্তহীনতা এবং ভুলের প্যাটার্ন বিশ্লেষণ করে AdmitIQ স্বয়ংক্রিয়ভাবে জীবন্ত স্টাডি নোট তৈরি করবে।
          </p>
          <button class="btn-primary" onclick="App.startStandardExam(10)">
            Start 10-Question Diagnostic Exam →
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="living-notes-grid">
        ${notes.map(n => this.buildNoteCard(n)).join('')}
      </div>
    `;
  },

  buildNoteCard(note) {
    const c = note.content || {};
    const patternMeta = DNA.meta[note.patternType] || { name: 'Behavioral Pattern', icon: '📝', badge: 'Cognitive', color: '#7c6fff' };

    // Format side-by-side comparison box if present (for Pattern 3 & 4)
    let compHTML = '';
    const comp = c.comparisonBox;
    if (comp && (comp.option1 || comp.optionA)) {
      const opt1 = comp.option1 || comp.optionA;
      const opt2 = comp.option2 || comp.optionB;
      const diffKey = comp.keyDifference || comp.distinctionKey;

      compHTML = `
        <div class="side-comparison-box">
          <div class="scb-title">
            <span>⚖️ দ্বিধাগ্রস্ত অপশন দুটির তুলনামূলক বিশ্লেষণ (Comparison):</span>
          </div>
          <div class="scb-grid">
            <div class="scb-col">
              <h5>${opt1.name || 'Option A'}</h5>
              <p>${opt1.definition || opt1.role || ''}</p>
            </div>
            <div class="scb-col">
              <h5>${opt2.name || 'Option B'}</h5>
              <p>${opt2.definition || opt2.role || ''}</p>
            </div>
          </div>
          ${diffKey ? `<div class="scb-key-diff"><strong>পার্থক্যের মূল চাবিকাঠি:</strong> ${diffKey}</div>` : ''}
        </div>
      `;
    }

    const examPlural = note.examsCount > 1 ? 'exams' : 'exam';

    return `
      <div class="living-note-card" style="border-top: 3px solid ${patternMeta.color};">
        <!-- Top Metadata Row -->
        <div class="lnc-header">
          <div class="lnc-badges-group">
            <span class="lnc-version">v${note.version}.0</span>
            <span class="lnc-update-info">🔄 Updated after ${note.examsCount} ${examPlural}</span>
          </div>
          <div style="display:flex; align-items:center; gap:6px;">
            <span style="font-size:0.8rem; color:var(--text-muted); font-weight:700;">Mastery:</span>
            <span style="font-size:0.92rem; font-weight:800; color:${note.masteryPercent >= 80 ? 'var(--accent-green)' : 'var(--accent-amber)'};">
              ${note.masteryPercent}%
            </span>
          </div>
        </div>

        <!-- Pattern Identification Badge -->
        <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:6px; margin-bottom:12px;">
          <span>${patternMeta.icon}</span>
          <span style="font-size:0.8rem; font-weight:700; color:${patternMeta.color};">${patternMeta.name}</span>
          <span style="font-size:0.72rem; color:var(--text-dim); border-left:1px solid rgba(255,255,255,0.1); padding-left:6px;">${patternMeta.badge}</span>
        </div>

        <!-- Topic Title (Bangla) -->
        <h3 class="lnc-topic-title">${note.topicName}</h3>

        <!-- Cognitive Diagnosis (Bangla) -->
        ${c.diagnosis ? `<p class="lnc-diagnosis-text">🧠 <em>${c.diagnosis}</em></p>` : ''}

        <!-- Core Concept Box (Bangla) -->
        <div class="lnc-concept-card">
          <div class="lbl">সঠিক বৈজ্ঞানিক তত্ত্ব (Core Principle):</div>
          <p>${c.coreConcept || c.explanation || 'মূল ধারণাটি গুরুত্ব সহকারে লক্ষ্য করুন।'}</p>
        </div>

        <!-- Dynamic Side-by-Side Comparison Box -->
        ${compHTML}

        <!-- Mnemonic Trick (Bangla) -->
        ${c.memoryTrick ? `
          <div class="mnemonic-banner">
            <span style="font-size:1.3rem;">💡</span>
            <div>
              <strong>মনে রাখার ছন্দ (Mnemonic Trick):</strong>
              <p style="margin-top:2px;">${c.memoryTrick}</p>
            </div>
          </div>
        ` : ''}

        <!-- Negative Marking Warning (Bangla) -->
        ${c.medicalTrapAlert ? `
          <div class="trap-alert-banner">
            <span style="font-size:1.3rem;">⚠️</span>
            <div>
              <strong>মেডিকেল অ্যাডমিশন ফাঁদ (Negative Marking Alert):</strong>
              <p style="margin-top:2px;">${c.medicalTrapAlert}</p>
            </div>
          </div>
        ` : ''}

        <!-- Footer Actions -->
        <div class="lnc-footer-row">
          <div>
            ${note.isResolved
              ? '<span style="color:var(--accent-green); font-size:0.82rem; font-weight:700;">✓ Concept Mastered</span>'
              : '<span style="color:var(--accent-amber); font-size:0.82rem; font-weight:700;">⚡ Active Recall Needed</span>'}
          </div>
          <button class="btn-primary" style="padding:8px 18px; font-size:0.84rem;" onclick="Notes.startAdaptiveRetake(${note.id})">
            Take Targeted Retake 🎯
          </button>
        </div>
      </div>
    `;
  },

  async startAdaptiveRetake(noteId) {
    try {
      const res = await fetch(`/api/notes/${noteId}/retake`, { method: 'POST' });
      const data = await res.json();
      if (data.questions && data.questions.length > 0) {
        App.startAdaptiveRetakeExam(data);
      } else {
        alert('Could not generate adaptive retake questions for this note.');
      }
    } catch (e) {
      console.error('Error starting adaptive retake:', e);
      alert('Error connecting to adaptive retake engine.');
    }
  }
};
