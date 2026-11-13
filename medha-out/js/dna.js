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
  }
};
