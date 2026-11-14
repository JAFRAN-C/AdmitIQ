// ─── AdmitIQ 7-Pattern DNA Diagnostic Engine ────────────────────
const DNA = {

  meta: {
    1: { 
      name: 'Slow + Correct', 
      icon: '⏱️', 
      badge: 'Memory Fade', 
      color: '#6889FF', 
      desc: 'সঠিক উত্তর দিয়েছেন কিন্তু সময় লেগেছে (>৬ সে.)। পরীক্ষার চাপে ভুলে যাওয়ার ঝুঁকি রয়েছে।' 
    },
    2: { 
      name: 'Slow + Wrong', 
      icon: '🐢', 
      badge: 'Concept Gap', 
      color: '#FFA053', 
      desc: 'অনেক সময় নিয়েও ভুল উত্তর দিয়েছেন। তাত্ত্বিক ধারণাটি গোড়া থেকেই অস্পষ্ট।' 
    },
    3: { 
      name: 'Switched + Correct', 
      icon: '🔀', 
      badge: 'Ambiguity Hesitation', 
      color: '#A06BFF', 
      desc: 'অপশন একাধিকবার পরিবর্তন করে সঠিক উত্তর দিয়েছেন। নির্দিষ্ট দুটি অপশনের মধ্যে স্পষ্ট পার্থক্যের অভাব।' 
    },
    4: { 
      name: 'Switched + Wrong', 
      icon: '🕸️', 
      badge: 'Distractor Trap', 
      color: '#FF5E85', 
      desc: 'বারবার অপশন পরিবর্তন করে ফাঁদে পা দিয়েছেন। বিভ্রান্তিকর অপশনের শিকার হয়েছেন।' 
    },
    5: { 
      name: 'Fast + Wrong', 
      icon: '⚠️', 
      badge: 'Confidently Wrong (Danger)', 
      color: '#FF3366', 
      desc: 'খুব দ্রুত আত্মবিশ্বাসের সাথে ভুল উত্তর দিয়েছেন! নেগেটিভ মার্কিংয়ের (-০.২৫) মারাত্মক কারণ।' 
    },
    6: { 
      name: 'Skip & Return', 
      icon: '⏳', 
      badge: 'Avoidance / Last-Minute', 
      color: '#E4A020', 
      desc: 'প্রশ্নটি প্রথমে এড়িয়ে গিয়ে শেষে এসে উত্তর দিয়েছেন। মূল পরীক্ষায় এটি আতঙ্কের সৃষ্টি করতে পারে।' 
    },
    7: { 
      name: 'Unattempted', 
      icon: '⭕', 
      badge: 'Uncharted Territory', 
      color: '#888899', 
      desc: 'প্রশ্নটি উত্তর দেওয়া হয়নি বা সময় শেষ হয়ে গিয়েছিল। অধ্যায়টি আবার রিভিশন দেওয়া দরকার।' 
    },
    0: { 
      name: 'Mastered', 
      icon: '⚡', 
      badge: 'Mastered Recall', 
      color: '#22C97A', 
      desc: 'দ্রুত এবং শতভাগ আত্মবিশ্বাসের সাথে সঠিক উত্তর দিয়েছেন। কনসেপ্ট পুরোপুরি আয়ত্তে!' 
    }
  },

  buildGroups(telemetryItems) {
    const groups = { 1: [], 2: [], 3: [], 4: [], 5: [], 6: [], 7: [], 0: [] };
    telemetryItems.forEach(item => {
      const p = item.patternType !== undefined ? item.patternType : (item.pattern_type || 0);
      if (groups[p]) groups[p].push(item);
    });
    return groups;
  },

  renderSummary(containerId, telemetryItems) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const groups = this.buildGroups(telemetryItems);
    const total = telemetryItems.length || 1;

    // Display prioritized patterns
    const order = [5, 4, 3, 6, 2, 1, 7, 0];
    const rows = order.map(pId => {
      const info = DNA.meta[pId];
      const items = groups[pId] || [];
      const pct = Math.round((items.length / total) * 100);

      if (items.length === 0) return '';

      return `
        <div class="pattern-row-item" style="border-left: 4px solid ${info.color};">
          <div class="pri-left">
            <span class="pri-icon">${info.icon}</span>
            <div>
              <div style="display:flex; align-items:center; gap:8px;">
                <span class="pri-name">${info.name}</span>
                <span class="pri-badge" style="color:${info.color}; border:1px solid ${info.color}33;">${info.badge}</span>
              </div>
              <p style="font-family:var(--font-bangla); font-size:0.86rem; color:var(--text-muted); margin-top:3px;">
                ${info.desc}
              </p>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="pri-count">${items.length} MCQs</span>
            <span style="display:block; font-size:0.75rem; color:var(--text-dim);">${pct}%</span>
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    container.innerHTML = rows || `
      <div style="color:var(--text-muted); padding:16px; text-align:center;">
        No specific behavioral hesitation detected. Excellent performance!
      </div>
    `;
  },

  renderQuestionBreakdown(containerId, classifiedItems) {
    const container = document.getElementById(containerId);
    if (!container || !classifiedItems) return;

    const cards = classifiedItems.map((item, idx) => {
      const pId = item.patternType !== undefined ? item.patternType : (item.pattern_type || 0);
      const pInfo = DNA.meta[pId] || DNA.meta[0];
      const isCorrect = item.isCorrect;
      
      let statusBadge = '';
      if (pId === 7) {
        statusBadge = '<span style="background:rgba(136,136,153,0.15); color:#888899; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">Skipped / Unattempted</span>';
      } else if (isCorrect) {
        statusBadge = '<span style="background:rgba(34,201,122,0.15); color:var(--accent-green); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">✓ Correct</span>';
      } else {
        statusBadge = '<span style="background:rgba(255,79,106,0.15); color:var(--accent-red); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">✕ Incorrect</span>';
      }

      let answerDetail = '';
      if (item.switchCount > 0) {
        answerDetail = `<span style="color:var(--accent-purple); font-weight:600;">Switched options (${item.clickPath ? item.clickPath.join(' → ') : item.switchCount + ' times'})</span>`;
      } else if (item.finalChoiceText) {
        answerDetail = `<span>Choice: <strong>${item.finalChoiceText}</strong></span>`;
      } else {
        answerDetail = `<span style="color:var(--text-dim);">No answer selected</span>`;
      }

      return `
        <div class="pattern-row-item" style="border-left: 4px solid ${pInfo.color}; margin-bottom: 8px; padding: 12px 16px;">
          <div class="pri-left" style="gap:14px; flex:1;">
            <div style="font-size:0.88rem; font-weight:800; color:var(--text-muted); width:32px;">
              #${idx + 1}
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                ${statusBadge}
                <span class="pri-badge" style="color:${pInfo.color}; border:1px solid ${pInfo.color}44;">
                  ${pInfo.icon} Pattern ${pId}: ${pInfo.name}
                </span>
                <span style="font-size:0.75rem; color:var(--text-dim); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px;">
                  টপিক: ${item.topic || 'জীববিজ্ঞান'}
                </span>
              </div>
              <div style="font-family:var(--font-bangla); font-weight:600; color:#fff; font-size:0.94rem; line-height:1.4; margin-bottom:6px;">
                ${item.questionText || item.topic || 'Biology Question'}
              </div>
              <div style="font-size:0.8rem; color:var(--text-muted); display:flex; gap:16px; align-items:center;">
                <span>⏱️ <strong>${item.timeTaken || 0}s</strong></span>
                ${answerDetail}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:6px; margin-top:12px;">
        ${cards}
      </div>
    `;
  },

  // ─── CUMULATIVE CHAPTER-WISE COGNITIVE DNA DASHBOARD ──────────────
  async renderChapterDnaScreen(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center; padding: 40px; color: var(--text-muted);">
        <p>Loading your Chapter-Wise Cognitive DNA Report...</p>
      </div>
    `;

    try {
      const res = await fetch('/api/dna/chapters');
      const data = await res.json();
      const chapters = data.chapters || [];

      const botanyChaps = chapters.filter(c => c.paper === '1st_paper');
      const zoologyChaps = chapters.filter(c => c.paper === '2nd_paper');

      const totalExams = chapters.reduce((a, b) => a + b.totalExams, 0);
      const totalQ = chapters.reduce((a, b) => a + b.totalQuestions, 0);
      const totalCorrect = chapters.reduce((a, b) => a + b.correctCount, 0);
      const totalNotes = chapters.reduce((a, b) => a + b.notesCount, 0);
      const overallAcc = totalQ > 0 ? Math.round((totalCorrect / totalQ) * 100) : 0;

      const renderChapterCard = (c) => {
        const pMeta = DNA.meta[c.dominantPattern] || DNA.meta[7];
        const hasData = c.totalQuestions > 0;

        return `
          <div class="chapter-dna-card" style="background:var(--bg-card); border:1px solid var(--border-light); border-top:3px solid ${hasData ? pMeta.color : 'rgba(255,255,255,0.1)'}; border-radius:var(--radius-md); padding:18px 20px; display:flex; flex-direction:column; justify-content:space-between;">
            <div>
              <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:8px;">
                <span style="font-size:0.75rem; font-weight:800; text-transform:uppercase; color:var(--text-dim); letter-spacing:0.5px;">
                  Ch ${c.chapterNo} · ${c.paper === '1st_paper' ? 'Botany' : 'Zoology'}
                </span>
                <span style="font-size:0.8rem; font-weight:800; color:${c.masteryPercent >= 75 ? 'var(--accent-green)' : c.masteryPercent >= 50 ? 'var(--accent-amber)' : 'var(--text-dim)'};">
                  ${c.masteryPercent}% Mastery
                </span>
              </div>

              <h4 style="font-family:var(--font-bangla); font-size:1.05rem; font-weight:700; color:#fff; margin-bottom:12px; line-height:1.4;">
                ${c.chapterName}
              </h4>

              <!-- Dominant Cognitive Diagnosis -->
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:6px; margin-bottom:14px;">
                <span>${hasData ? pMeta.icon : '⚪'}</span>
                <span style="font-size:0.78rem; font-weight:700; color:${hasData ? pMeta.color : 'var(--text-dim)'};">
                  ${hasData ? `Pattern ${c.dominantPattern}: ${pMeta.name}` : 'Not Tested Yet'}
                </span>
              </div>

              <!-- Metrics -->
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:0.78rem; text-align:center;">
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">Exams</div>
                  <div style="font-weight:800; color:#fff; margin-top:2px;">${c.totalExams}</div>
                </div>
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">Accuracy</div>
                  <div style="font-weight:800; color:${c.accuracy >= 70 ? 'var(--accent-green)' : 'var(--accent-amber)'}; margin-top:2px;">
                    ${hasData ? c.accuracy + '%' : '--'}
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">Saved Notes</div>
                  <div style="font-weight:800; color:var(--accent-purple); margin-top:2px;">${c.notesCount}</div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button class="btn-primary" style="flex:1; padding:7px 10px; font-size:0.8rem;" onclick="App.startChapterExam(${c.chapterId}, '${c.chapterName}', '${c.paper}')">
                Exam 🎯
              </button>
              ${c.notesCount > 0 ? `
                <button class="btn-secondary" style="flex:1; padding:7px 10px; font-size:0.8rem;" onclick="Notes.setChapterFilter(${c.chapterId}); App.showScreen('notes');">
                  Notes (${c.notesCount}) 📚
                </button>
              ` : ''}
            </div>
          </div>
        `;
      };

      container.innerHTML = `
        <!-- Cumulative Overview Banner -->
        <div style="background:linear-gradient(135deg, rgba(160, 107, 255, 0.12) 0%, rgba(104, 137, 255, 0.08) 100%); border:1px solid rgba(160, 107, 255, 0.25); border-radius:var(--radius-md); padding:20px 24px; margin-bottom:28px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <span style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:var(--accent-purple); letter-spacing:0.5px;">
                🧬 Cumulative Cognitive DNA Status
              </span>
              <h3 style="font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px;">
                Chapter-Wise Medical Admission Diagnostic Matrix
              </h3>
              <p style="font-size:0.88rem; color:var(--text-muted); margin-top:2px;">
                Track which HSC Biology chapters have active option hesitations, distractor traps, or unattempted topics:
              </p>
            </div>
            <div style="display:flex; gap:20px;">
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:#fff;">${totalExams}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">Exams Taken</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:var(--accent-green);">${overallAcc}%</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">Overall Accuracy</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:var(--accent-purple);">${totalNotes}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">Living Notes</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Biology 1st Paper (Botany) -->
        <div style="margin-bottom:32px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span style="font-size:1.2rem;">🌿</span>
            <h3 style="font-size:1.15rem; font-weight:800; color:#fff;">Biology 1st Paper (উদ্ভিদবিজ্ঞান) Chapters</h3>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
            ${botanyChaps.map(renderChapterCard).join('')}
          </div>
        </div>

        <!-- Section: Biology 2nd Paper (Zoology) -->
        <div style="margin-bottom:36px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span style="font-size:1.2rem;">🔬</span>
            <h3 style="font-size:1.15rem; font-weight:800; color:#fff;">Biology 2nd Paper (প্রাণীবিজ্ঞান) Chapters</h3>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
            ${zoologyChaps.map(renderChapterCard).join('')}
          </div>
        </div>
      `;
    } catch (e) {
      console.error('Chapter DNA render error:', e);
      container.innerHTML = `
        <div style="padding:24px; color:var(--accent-red); text-align:center;">
          Could not load Chapter-wise Cognitive DNA data.
        </div>
      `;
    }
  }
};
