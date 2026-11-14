// ─── AdmitIQ Student Weakness & Progress Tracker ──────────────────
const DNA = {

  meta: {
    1: { 
      name: 'ধীরগতিতে সঠিক উত্তর (>৬ সেকেন্ড)', 
      icon: '⏱️', 
      badge: 'স্মৃতি মন্থরতা (দেরিতে রিকল)', 
      color: '#6889FF', 
      desc: 'সঠিক উত্তর দিয়েছেন কিন্তু সময় লেগেছে (>৬ সেকেন্ড)। ভর্তি পরীক্ষার চাপের মুখে দ্রুত মনে রাখার জন্য ছন্দ বা শর্টকাট কৌশল অনুশীলন করা দরকার।' 
    },
    2: { 
      name: 'ধীরগতিতে ভুল উত্তর (>৬ সেকেন্ড)', 
      icon: '🐢', 
      badge: 'কনসেপ্টে অস্পষ্টতা', 
      color: '#FFA053', 
      desc: 'অনেক সময় নিয়েও ভুল উত্তর দিয়েছেন। তাত্ত্বিক বিষয়টি মূল পাঠ্যবই থেকে গোড়া থেকে ঝালাই করা প্রয়োজন।' 
    },
    3: { 
      name: 'অপশন পরিবর্তন করে সঠিক উত্তর', 
      icon: '🔀', 
      badge: 'দ্বিধা সত্ত্বেও নির্ভুল', 
      color: '#A06BFF', 
      desc: 'অপশন একাধিকবার পরিবর্তন করে অবশেষে সঠিক উত্তর দিয়েছেন। কাছাকাছি দুটি অপশনের পার্থক্য স্পষ্ট মনে রাখা প্রয়োজন।' 
    },
    4: { 
      name: 'অপশন পরিবর্তন করে ভুল উত্তর', 
      icon: '🕸️', 
      badge: 'ফাঁদে পড়ে ভুল', 
      color: '#FF5E85', 
      desc: 'বারবার অপশন পরিবর্তন করে প্রশ্নকর্তার সাজানো ফাঁদে পা দিয়েছেন। অপশন দুটির মুখোমুখি তুলনা পড়া আবশ্যক।' 
    },
    5: { 
      name: 'তাড়াহুড়ো করে ভুল (নেগেটিভ ঝুঁকি)', 
      icon: '⚠️', 
      badge: 'আত্মবিশ্বাসী অসাবধানতা', 
      color: '#FF3366', 
      desc: 'অতি দ্রুত অসাবধানতাবশত ভুল উত্তর দাগিয়েছেন! মেডিকেল ভর্তি পরীক্ষায় নেগেটিভ মার্কিংয়ের (-০.২৫) প্রধান কারণ এটি।' 
    },
    6: { 
      name: 'এড়িয়ে গিয়ে শেষে উত্তর প্রদান', 
      icon: '⏳', 
      badge: 'দেরিতে সিদ্ধান্ত গ্রহণ', 
      color: '#E4A020', 
      desc: 'প্রশ্নটি প্রথমে না পেরে এড়িয়ে গিয়ে শেষে এসে উত্তর দিয়েছেন। মূল পরীক্ষায় এটি আতঙ্কের সৃষ্টি করতে পারে।' 
    },
    7: { 
      name: 'না দাগিয়ে ছেড়ে দেওয়া প্রশ্ন', 
      icon: '⭕', 
      badge: 'বাদ পড়া টপিক', 
      color: '#888899', 
      desc: 'প্রশ্নটি উত্তর দেওয়া হয়নি। ভর্তি পরীক্ষার আগে এই টপিকটির গুরুত্বপূর্ণ তথ্য জেনে নেওয়া জরুরি।' 
    },
    0: { 
      name: 'শতভাগ আত্মবিশ্বাসী নির্ভুল উত্তর', 
      icon: '⚡', 
      badge: 'আয়ত্তকৃত বিষয়', 
      color: '#22C97A', 
      desc: 'কোনো দ্বিধা ছাড়াই দ্রুত ও শতভাগ সঠিক উত্তর দিয়েছেন। কনসেপ্ট পুরোপুরি আয়ত্তে রয়েছে!' 
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
              <p style="font-family:var(--font-bangla); font-size:0.86rem; color:var(--text-muted); margin-top:3px; line-height:1.5;">
                ${info.desc}
              </p>
            </div>
          </div>
          <div style="text-align:right;">
            <span class="pri-count">${items.length}টি প্রশ্ন</span>
            <span style="display:block; font-size:0.75rem; color:var(--text-dim);">${pct}%</span>
          </div>
        </div>
      `;
    }).filter(Boolean).join('');

    container.innerHTML = rows || `
      <div style="color:var(--text-muted); padding:16px; text-align:center;">
        কোনো ভুল বা দ্বিধাদ্বন্দ্ব পাওয়া যায়নি। চমৎকার প্রস্তুতি!
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
        statusBadge = '<span style="background:rgba(136,136,153,0.15); color:#888899; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">ছেড়ে দেওয়া প্রশ্ন</span>';
      } else if (isCorrect) {
        statusBadge = '<span style="background:rgba(34,201,122,0.15); color:var(--accent-green); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">✓ সঠিক</span>';
      } else {
        statusBadge = '<span style="background:rgba(255,79,106,0.15); color:var(--accent-red); padding:2px 8px; border-radius:4px; font-size:0.75rem; font-weight:700;">✕ ভুল (-০.২৫)</span>';
      }

      let answerDetail = '';
      if (item.switchCount > 0) {
        answerDetail = `<span style="color:var(--accent-purple); font-weight:600;">অপশন পরিবর্তন: ${item.clickPath ? item.clickPath.join(' → ') : item.switchCount + ' বার'}</span>`;
      } else if (item.finalChoiceText) {
        answerDetail = `<span>আপনার উত্তর: <strong>${item.finalChoiceText}</strong></span>`;
      } else {
        answerDetail = `<span style="color:var(--text-dim);">কোনো উত্তর দাগানো হয়নি</span>`;
      }

      return `
        <div class="pattern-row-item" style="border-left: 4px solid ${pInfo.color}; margin-bottom: 8px; padding: 14px 18px;">
          <div class="pri-left" style="gap:14px; flex:1;">
            <div style="font-size:0.88rem; font-weight:800; color:var(--text-muted); width:32px;">
              #${idx + 1}
            </div>
            <div style="flex:1;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px; flex-wrap:wrap;">
                ${statusBadge}
                <span class="pri-badge" style="color:${pInfo.color}; border:1px solid ${pInfo.color}44;">
                  ${pInfo.icon} ${pInfo.name}
                </span>
                <span style="font-size:0.75rem; color:var(--text-dim); background:rgba(255,255,255,0.05); padding:2px 8px; border-radius:4px;">
                  টপিক: ${item.topic || 'জীববিজ্ঞান'}
                </span>
              </div>
              <div style="font-family:var(--font-bangla); font-weight:600; color:#fff; font-size:0.96rem; line-height:1.5; margin-bottom:6px;">
                ${item.questionText || item.topic || 'জীববিজ্ঞান প্রশ্ন'}
              </div>
              <div style="font-size:0.82rem; color:var(--text-muted); display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
                <span>⏱️ নেওয়া সময়: <strong>${item.timeTaken || 0} সেকেন্ড</strong></span>
                ${answerDetail}
                ${item.explanation ? `<span style="color:var(--text-dim);">ব্যাখ্যা: ${item.explanation}</span>` : ''}
              </div>
            </div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:12px;">
        ${cards}
      </div>
    `;
  },

  // ─── CUMULATIVE CHAPTER-WISE PROGRESS DASHBOARD ──────────────────
  async renderChapterDnaScreen(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = `
      <div style="text-align:center; padding: 40px; color: var(--text-muted);">
        <p>অধ্যায়ভিত্তিক দুর্বলতা ও অগ্রগতির তথ্য লোড হচ্ছে...</p>
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
                  অধ্যায় ${c.chapterNo} · ${c.paper === '1st_paper' ? 'উদ্ভিদবিজ্ঞান' : 'প্রাণিবিজ্ঞান'}
                </span>
                <span style="font-size:0.8rem; font-weight:800; color:${c.masteryPercent >= 75 ? 'var(--accent-green)' : c.masteryPercent >= 50 ? 'var(--accent-amber)' : 'var(--text-dim)'};">
                  ${c.masteryPercent}% আয়ত্ত
                </span>
              </div>

              <h4 style="font-family:var(--font-bangla); font-size:1.05rem; font-weight:700; color:#fff; margin-bottom:12px; line-height:1.4;">
                ${c.chapterName}
              </h4>

              <!-- Dominant Weakness / Status -->
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,255,255,0.04); padding:4px 10px; border-radius:6px; margin-bottom:14px;">
                <span>${hasData ? pMeta.icon : '⚪'}</span>
                <span style="font-size:0.78rem; font-weight:700; color:${hasData ? pMeta.color : 'var(--text-dim)'};">
                  ${hasData ? pMeta.badge : 'এখনো পরীক্ষা দেওয়া হয়নি'}
                </span>
              </div>

              <!-- Metrics -->
              <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px; margin-bottom:16px; background:rgba(0,0,0,0.2); padding:10px; border-radius:6px; font-size:0.78rem; text-align:center;">
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">পরীক্ষা</div>
                  <div style="font-weight:800; color:#fff; margin-top:2px;">${c.totalExams}টি</div>
                </div>
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">একুরেসি</div>
                  <div style="font-weight:800; color:${c.accuracy >= 70 ? 'var(--accent-green)' : 'var(--accent-amber)'}; margin-top:2px;">
                    ${hasData ? c.accuracy + '%' : '--'}
                  </div>
                </div>
                <div>
                  <div style="color:var(--text-dim); font-size:0.7rem;">নোট</div>
                  <div style="font-weight:800; color:var(--accent-purple); margin-top:2px;">${c.notesCount > 0 ? 'তৈরি' : 'প্রাইমার'}</div>
                </div>
              </div>
            </div>

            <!-- Actions -->
            <div style="display:flex; gap:8px; margin-top:10px;">
              <button class="btn-primary" style="flex:1; padding:7px 10px; font-size:0.8rem;" onclick="App.startChapterExam(${c.chapterId}, '${c.chapterName.replace(/'/g, "\\'")}', '${c.paper}')">
                পরীক্ষা দিন 🎯
              </button>
              <button class="btn-secondary" style="flex:1; padding:7px 10px; font-size:0.8rem;" onclick="Notes.setChapterFilter(${c.chapterId}); App.showScreen('notes');">
                নোট পড়ুন 📝
              </button>
            </div>
          </div>
        `;
      };

      container.innerHTML = `
        <!-- Cumulative Overview Banner -->
        <div style="background:var(--bg-card); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:22px 26px; margin-bottom:28px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:16px;">
            <div>
              <span style="font-size:0.8rem; font-weight:800; text-transform:uppercase; color:var(--accent-purple); letter-spacing:0.5px;">
                📊 সামগ্রিক প্রস্তুতি ও দুর্বলতা ট্র্যাকিং
              </span>
              <h3 style="font-size:1.3rem; font-weight:800; color:#fff; margin-top:4px;">
                এইচএসসি জীববিজ্ঞান অধ্যায়ভিত্তিক দুর্বলতা পর্যবেক্ষণ
              </h3>
              <p style="font-size:0.88rem; color:var(--text-muted); margin-top:4px; line-height:1.5;">
                কোন কোন অধ্যায়ে অপশন পরিবর্তন করে ভুল করেছেন বা স্মৃতি মন্থরতা রয়েছে, তা সরাসরি ট্র্যাক করুন:
              </p>
            </div>
            <div style="display:flex; gap:20px;">
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:#fff;">${totalExams}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">মোট পরীক্ষা</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:var(--accent-green);">${overallAcc}%</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">গড় নির্ভুলতা</div>
              </div>
              <div style="text-align:center;">
                <div style="font-size:1.4rem; font-weight:800; color:var(--accent-purple);">${totalNotes}</div>
                <div style="font-size:0.72rem; color:var(--text-muted); font-weight:700;">অধ্যায় নোট</div>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: Biology 1st Paper (Botany) -->
        <div style="margin-bottom:32px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span style="font-size:1.2rem;">🌿</span>
            <h3 style="font-size:1.15rem; font-weight:800; color:#fff;">জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান) অধ্যায়সমূহ</h3>
          </div>
          <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(280px, 1fr)); gap:16px;">
            ${botanyChaps.map(renderChapterCard).join('')}
          </div>
        </div>

        <!-- Section: Biology 2nd Paper (Zoology) -->
        <div style="margin-bottom:36px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:14px;">
            <span style="font-size:1.2rem;">🔬</span>
            <h3 style="font-size:1.15rem; font-weight:800; color:#fff;">জীববিজ্ঞান ২য় পত্র (প্রাণিবিজ্ঞান) অধ্যায়সমূহ</h3>
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
          দুর্বলতা ট্র্যাকিং তথ্য লোড করা যায়নি।
        </div>
      `;
    }
  }
};
