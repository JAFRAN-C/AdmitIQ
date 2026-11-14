// ─── AdmitIQ Unified Chapter Living Study Documents Engine ─────────────────
const Notes = {
  currentFilters: {
    paper: 'all',
    chapterId: null
  },
  cachedChapters: [],
  cachedLivingDocs: [],

  // Comprehensive Medical Admission High-Yield Syllabus Guide (DGHS MAT)
  chapterSyllabusPrimer: {
    // Botany (1st Paper)
    1: {
      topics: 'সাইটোপ্লাজমীয় অঙ্গাণুর কার্যাবলি (মাইটোকন্ড্রিয়া, ক্লোরোপ্লাস্ট, রাইবোজোম), ফ্লুইড মোজাইক মডেল, ডিএনএ-এর ডাবল হেলিক্স গঠন, জেনেটিক কোড ও প্রোটিন সংশ্লেষণ।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'ক্লোরোপ্লাস্টের গ্রানা বনাম স্ট্রোমা এবং মাইটোকন্ড্রিয়ার ক্রিস্টির এনজাইম নিয়ে প্রশ্নকর্তারা বিভ্রান্তিকর অপশন সেট করেন।'
    },
    2: {
      topics: 'মাইটোটিক মেটাফেজ ও অ্যানাফেজ পর্যায়, মিয়োসিস-১ প্রফেজ-১ এর উপপর্যায় (লেপ্টোটিন, জাইগোটিন, প্যাকাইটিন - ক্রসিং ওভার, ডিপ্লোটিন, ডায়াকাইনেসিস)।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'সিন্যাপসিস (জাইগোটিন) ও কায়াজমা/ক্রসিং ওভার (প্যাকাইটিন)-এর সময়কাল নিয়ে সবচেয়ে বেশি নেগেটিভ মার্কিং হয়।'
    },
    3: {
      topics: 'মনোস্যাকারাইড ও পলিস্যাকারাইড, অ্যামিনো অ্যাসিডের শ্রেণিবিভাগ, এনজাইমের লক অ্যান্ড কি মডেল, কো-এনজাইম ও ভিটামিন।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'অপরিহার্য অ্যামিনো অ্যাসিডের সংখ্যা ও নাম এবং বিজারণশীল শর্করার বৈশিষ্ট্যে দ্রুত ভুল হয়।'
    },
    4: {
      topics: 'ভাইরাসের গঠন ও প্রজনন (লাইটিক ও লাইসোজেনিক চক্র), ব্যাকটেরিয়ার গঠন ও অর্থনৈতিক গুরুত্ব, ম্যালেরিয়া পরজীবীর জীবনচক্র (হেপাটিক ও এরিথ্রোসাইটিক সাইজোগনি)।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'ম্যালেরিয়ার সুপ্তাবস্থা (Schuffner dots vs Ziemann granules) এবং ডিএনএ বনাম আরএনএ ভাইরাসের তালিকায় ছাত্রছাত্রীরা বিভ্রান্ত হয়।'
    },
    7: {
      topics: 'সাইকাসের বৈশিষ্ট্য ও কোরালয়েড মূল, মালভেসি ও পোয়েসি গোত্রের শনাক্তকারী বৈশিষ্ট্য ও পুষ্পপ্রতীক।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'মালভেসি (একগুচ্ছ পুংকেশর, বৃক্কাকার পরাগধানী) ও পোয়েসি (ভার্সেটাইল পরাগধানী, পালকের মতো গর্ভমুণ্ড)-এর মুখোমুখি তুলনা থেকে প্রশ্ন থাকে।'
    },
    8: {
      topics: 'ভাজক টিস্যুর শ্রেণিবিভাগ, জাইলেম ও ফ্লোয়েমের উপাদান, ভাস্কুলার বান্ডলের প্রকারভেদ (মুক্ত সমপার্শ্বীয়, অরীয়, কেন্দ্রিক)।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'একবীজপত্রী কাণ্ডে ভাস্কুলার বান্ডল বদ্ধ সমপার্শ্বীয় কিন্তু মূলে অরীয় — কাণ্ড ও মূলের প্যাটার্ন গুলিয়ে ফেলা সবচেয়ে বড় ফাঁদ।'
    },
    9: {
      topics: 'প্রস্বেদন ও পত্ররন্ধ্র খোলার প্রক্রিয়া, সি-৩ ও সি-৪ চক্রের পার্থক্য, গ্লাইকোলাইসিস ও ক্রেবস চক্রে এটিপি উৎপাদন।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'সি-৪ উদ্ভিদের প্রথম স্থায়ী পদার্থ অক্সালোঅ্যাসিটিক এসিড বনাম সি-৩ এর ৩-ফসফোগ্লিসারিক এসিড এবং ক্রাঞ্জ অ্যানাটমি।'
    },
    10: {
      topics: 'পরাগরেণুর উৎপত্তি ও পুং-গ্যামেটোফাইটের বিকাশ, ডিম্বকের প্রকারভেদ ও দ্বিনিষেক প্রক্রিয়া, অ্যাপোমিক্সিস ও পার্থেনোজেনেসিস।',
      weightage: 'প্রতি বছর ১টি প্রশ্ন আসে',
      dghsTrap: 'অধমুখী বনাম ঊর্ধ্বমুখী ডিম্বক এবং ট্রিপ্লয়েড এন্ডোস্পার্ম বা শস্যের ক্রোমোজোম সংখ্যা (3n)।'
    },
    11: {
      topics: 'টিস্যু কালচার প্রযুক্তির ধাপসমূহ, রিকম্বিনেন্ট ডিএনএ প্রযুক্তি ও রেস্ট্রিকশন এনজাইম, জিএমও ও প্লাজমিড ভেক্টর।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'রেস্ট্রিকশন এনজাইম (আণবিক কাঁচি) বনাম লাইগেজ (আণবিক আঠা) এবং প্লাজমিডের স্বপ্রজননশীলতা।'
    },

    // Zoology (2nd Paper)
    101: {
      topics: 'সিলম ও প্রতিসাম্যতার ভিত্তি, প্রধান ৯টি পর্বের (পোরিফেরা থেকে কর্ডাটা) শনাক্তকারী বৈশিষ্ট্য ও বৈজ্ঞানিক উদাহরণ।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'সিউডোসিলোমেট পর্ব (নেমাটোডা) বনাম অ্যাসিলোমেট (প্লাটিহেলমিনথেস) এবং শিখা কোষের উপস্থিতি।'
    },
    102: {
      topics: 'হাইড্রা (চলন, নেমাটোসিস্টের প্রকারভেদ, মিথোজীবিতা), ঘাসফড়িং (মুখোপাঙ্গ, ওমাটিডিয়াম ও রূপান্তর), রুই মাছ (রক্ত সংবহন, আঁইশ ও পটকা)।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'স্টিনোটিল (বৃহত্তম নেমাটোসিস্ট) বনাম ভলভেন্ট এবং সুপারপজিশন বনাম অ্যাপোজিশন দৃষ্টির শর্ত।'
    },
    103: {
      topics: 'মুখগহ্বর ও পাকস্থলীতে খাদ্য পরিপাক, যকৃতের সঞ্চয়ী ও বিপাকীয় কাজ, অগ্ন্যাশয় রস ও পিত্তলবণ, ক্ষুদ্রান্ত্রে পরিপাক।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'পেপসিন ও ট্রিপসিনের সক্রিয়তার পিএইচ (অম্লীয় বনাম ক্ষারীয়) এবং যকৃতের গ্লাইকোজেনেসিস বনাম গ্লাইকোজেনোলাইসিস।'
    },
    104: {
      topics: 'রক্তকণিকার প্রকারভেদ ও কাজ, রক্ত তঞ্চনের ১৩টি ফ্যাক্টর, কার্ডিয়াক চক্র ও জাংশনাল টিস্যু (এসএ নোড, পেসমেকার), ইসিজি ও হৃৎপিণ্ডের রোগ।',
      weightage: 'প্রতি বছর ৩-৪টি প্রশ্ন আসে (সর্বোচ্চ গুরুত্বপূর্ণ)',
      dghsTrap: 'রক্ত তঞ্চনের প্রধান ৪টি ফ্যাক্টর (ফুল পড়ে টুপ করে) এবং করোনারি থ্রম্বোসিস বনাম অ্যানজাইনা পেকটোরিস।'
    },
    105: {
      topics: 'প্রশ্বাস ও নিঃশ্বাস মেকানিজম, অ্যালভিওলাসের সারফ্যাকট্যান্ট, গ্যাসীয় পরিবহন (অক্সিজেন ও কার্বন ডাই-অক্সাইড পরিবহন), ক্লোরাইড শিফট।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'বাইকার্বনেট আয়ন রূপে কার্বন ডাই-অক্সাইড পরিবহনের শতকরা হার এবং বোর প্রভাব।'
    },
    107: {
      topics: 'অস্থি ও তরুণাস্থির পার্থক্য, কঙ্কালতন্ত্র (অক্ষীয় ও উপাঙ্গীয় কঙ্কাল), পেশির গঠন ও পেশি সংকোচন কৌশল (স্লাইডিং ফিলামেন্ট থিওরি)।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'হ্যাভারসিয়ান তন্ত্রের নালী বনাম ভকম্যানস নালী এবং হায়ালিন তরুণাস্থির উদাহরণ।'
    },
    108: {
      topics: 'মস্তিষ্কের বিভিন্ন অংশের কাজ (সেরিব্রাম, সেরিবেলাম, মেডুলা), ১২ জোড়া করোটিক স্নায়ুর প্রকৃতি ও কাজ, চোখের রড ও কোন কোষ, অন্ত:ক্ষরা গ্রন্থি।',
      weightage: 'প্রতি বছর ৩টি প্রশ্ন আসে',
      dghsTrap: 'করোটিক স্নায়ু ৩, ৪, ৬ (অক্ষিগোলকের সঞ্চালন) বনাম স্নায়ু ৮ (শ্রবণ ও ভারসাম্য) এবং ইনসুলিন বনাম গ্লুকাগন।'
    },
    109: {
      topics: 'স্পার্মাটোজেনেসিস ও উওজেনেসিস, অমরা ও তার হরমোনসমূহ (HCG, প্রজেস্টেরন), টেস্টটিউব বেবি ও বন্ধ্যাত্ব।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'পোলার বডি তৈরির ধাপ এবং গ্রাফিয়ান ফলিকল থেকে ওভুলেশনে এলএইচ (LH) হরমোনের ভূমিকা।'
    },
    111: {
      topics: 'মেন্ডেলের ১ম ও ২য় সূত্রের অনুপাত ও ব্যতিক্রম (অসম্পূর্ণ প্রকটতা ১:২:১, পরিপূরক জিন ৯:৭, এপিস্ট্যাসিস), সেক্স-লিঙ্কড ডিসঅর্ডার (হিমোফিলিয়া, বর্ণান্ধতা), রক্তের Rh ফ্যাক্টর।',
      weightage: 'প্রতি বছর ২-৩টি প্রশ্ন আসে',
      dghsTrap: 'দ্বৈত প্রচ্ছন্ন এপিস্ট্যাসিস (৯:৭) বনাম প্রকট এপিস্ট্যাসিস (১৩:৩) এবং এরিথ্রোব্লাস্টোসিস ফিটালিসের শর্ত।'
    }
  },

  async fetchAllLivingNotes(filters = {}) {
    try {
      const params = new URLSearchParams();
      if (filters.chapterId) params.append('chapter_id', filters.chapterId);
      if (filters.paper && filters.paper !== 'all') params.append('paper', filters.paper);

      const qs = params.toString() ? `?${params.toString()}` : '';
      const res = await fetch(`/api/notes/living${qs}`);
      const data = await res.json();
      this.cachedLivingDocs = data.livingNotes || [];
      return this.cachedLivingDocs;
    } catch (e) {
      console.error('Failed to fetch chapter living notes:', e);
      return [];
    }
  },

  async loadChaptersIfNeeded() {
    if (!this.cachedChapters || this.cachedChapters.length === 0) {
      try {
        const cRes = await fetch('/api/chapters');
        const cData = await cRes.json();
        this.cachedChapters = cData.all || [
          ...(cData.chapters?.botany || []),
          ...(cData.chapters?.zoology || [])
        ];
      } catch (e) {
        console.warn('Chapters cache load error:', e);
        this.cachedChapters = [];
      }
    }
  },

  async renderNotesPage(containerId = 'notesRepositoryContainer', overrideFilters = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (overrideFilters) {
      this.currentFilters = { ...this.currentFilters, ...overrideFilters };
    }

    // 1. Update Paper Filter Pill Buttons
    const activePaper = this.currentFilters.paper || 'all';
    const btnAll = document.getElementById('notesPaperAll');
    const btnBotany = document.getElementById('notesPaperBotany');
    const btnZoology = document.getElementById('notesPaperZoology');

    if (btnAll) btnAll.classList.toggle('active', activePaper === 'all');
    if (btnBotany) btnBotany.classList.toggle('active', activePaper === '1st_paper');
    if (btnZoology) btnZoology.classList.toggle('active', activePaper === '2nd_paper');

    // 2. Load Chapters and Living Docs
    await this.loadChaptersIfNeeded();
    await this.fetchAllLivingNotes(this.currentFilters);

    // 3. Populate Chapter Quick Select Strip (#notesChapterSelectStrip)
    this.renderChapterSelectorStrip();

    // 4. Main Notes Viewport Logic
    const selectedChapterId = this.currentFilters.chapterId;

    if (selectedChapterId) {
      // User picked a specific chapter
      const targetChapter = this.cachedChapters.find(c => c.id === selectedChapterId);
      const livingDoc = this.cachedLivingDocs.find(d => (d.chapterId === selectedChapterId || d.id === selectedChapterId));

      if (livingDoc) {
        // Render Unified Living Document with all 5 sections
        container.innerHTML = this.renderChapterDocument(livingDoc);
      } else if (targetChapter) {
        // Chapter has NOT been attempted yet: Render High-Yield Syllabus Primer
        container.innerHTML = this.renderChapterPrimerCard(targetChapter);
      } else {
        container.innerHTML = `
          <div style="background:var(--bg-card); border:1px solid var(--border-light); border-radius:var(--radius-md); padding:40px; text-align:center; color:var(--text-muted);">
            অধ্যায়টি খুঁজে পাওয়া যায়নি। উপরের তালিকা থেকে একটি অধ্যায় নির্বাচন করুন।
          </div>
        `;
      }
      return;
    }

    // User selected "All Chapters" (or no specific chapter filter)
    let visibleDocs = this.cachedLivingDocs;
    if (activePaper !== 'all') {
      visibleDocs = visibleDocs.filter(d => d.paper === activePaper);
    }

    if (visibleDocs.length > 0) {
      // Render all generated living documents
      container.innerHTML = visibleDocs.map(doc => this.renderChapterDocument(doc)).join('');
    } else {
      // No living documents yet across all selected chapters: Render High-Yield Syllabus Primer Hub!
      container.innerHTML = this.renderSyllabusPrimerHub(activePaper);
    }
  },

  renderChapterSelectorStrip() {
    const strip = document.getElementById('notesChapterSelectStrip');
    if (!strip || !this.cachedChapters) return;

    const activePaper = this.currentFilters.paper || 'all';
    let chapters = this.cachedChapters;
    if (activePaper !== 'all') {
      chapters = chapters.filter(c => c.paper === activePaper);
    }

    const isAllActive = !this.currentFilters.chapterId;

    let stripHTML = `
      <div class="notes-chapter-pill ${isAllActive ? 'active' : ''}" onclick="Notes.setChapterFilter(null)">
        <span>📚 সকল অধ্যায়</span>
        <span class="pill-badge ${isAllActive ? 'active-doc' : 'prime-doc'}">${this.cachedLivingDocs.length}টি তৈরি নোট</span>
      </div>
    `;

    stripHTML += chapters.map(c => {
      const doc = this.cachedLivingDocs.find(d => (d.chapterId === c.id || d.id === c.id));
      const isSelected = this.currentFilters.chapterId === c.id;
      const paperIcon = c.paper === '1st_paper' ? '🌿' : '🔬';

      return `
        <div class="notes-chapter-pill ${isSelected ? 'active' : ''}" onclick="Notes.setChapterFilter(${c.id})">
          <span>${paperIcon} অধ্যায় ${c.chapter_no}: ${c.name_bn}</span>
          ${doc ? `
            <span class="pill-badge active-doc">v${doc.version || 1}.0 নোট</span>
          ` : `
            <span class="pill-badge prime-doc">প্রাইমার 📘</span>
          `}
        </div>
      `;
    }).join('');

    strip.innerHTML = stripHTML;
  },

  setPaperFilter(paperKey) {
    this.currentFilters.paper = paperKey;
    this.currentFilters.chapterId = null;
    this.renderNotesPage('notesRepositoryContainer');
  },

  setChapterFilter(chapterId) {
    this.currentFilters.chapterId = chapterId ? parseInt(chapterId) : null;
    this.renderNotesPage('notesRepositoryContainer');
  },

  // ─── HIGH-YIELD ADMISSION PRIMER CARD (ZERO-EMPTY STATE) ─────────
  renderChapterPrimerCard(chapter) {
    const primer = this.chapterSyllabusPrimer[chapter.chapter_no] || {
      topics: 'মেডিকেল ভর্তি পরীক্ষার জন্য এই অধ্যায়ের প্রতিটি অনুচ্ছেদ, বৈজ্ঞানিক নাম, উদাহরণ এবং পার্থক্যসমূহ অত্যন্ত সতর্কতার সাথে আত্মস্থ করতে হবে।',
      weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে',
      dghsTrap: 'বিভ্রান্তিকর অপশন এবং দ্রুত ভুল করার ফাঁদ এড়াতে তাত্ত্বিক ধারণা স্পষ্ট রাখা প্রয়োজন।'
    };

    const paperName = chapter.paper === '1st_paper' ? 'HSC জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)' : 'HSC জীববিজ্ঞান ২য় পত্র (প্রাণিবিজ্ঞান)';

    return `
      <article class="chapter-primer-unlocked-card" id="chapterPrimer-${chapter.id}">
        <!-- Primer Header -->
        <div class="doc-sheet-header">
          <div class="doc-header-top-row">
            <div>
              <span class="doc-paper-tag">${paperName} · অধ্যায় ${chapter.chapter_no}</span>
              <h2 class="doc-chapter-title">${chapter.name_bn}</h2>
              <div style="color:var(--text-muted); font-size:0.92rem; margin-top:2px;">
                ${chapter.name_en || ''}
              </div>
              <div class="doc-badges-row" style="margin-top:10px;">
                <span class="doc-version-pill" style="background:rgba(99,102,241,0.15); color:var(--accent-purple); border-color:rgba(99,102,241,0.3);">
                  ভর্তি প্রস্তুতি প্রাইমার 📘
                </span>
                <span class="doc-exams-count-pill" style="background:rgba(255,255,255,0.06); color:var(--text-dim); border-color:var(--border-light);">
                  🎯 পরীক্ষা এখনো দেওয়া হয়নি
                </span>
              </div>
            </div>

            <!-- Header Action -->
            <div class="doc-header-actions">
              <button class="btn-primary" style="padding:12px 24px; font-size:0.95rem;" onclick="App.startChapterExam(${chapter.id}, '${chapter.name_bn.replace(/'/g, "\\'")}', '${chapter.paper}')">
                🎯 এই অধ্যায়ের ওপর পরীক্ষা দিন (Start Exam)
              </button>
            </div>
          </div>
        </div>

        <!-- Admission Importance & Weightage Box -->
        <div style="background:rgba(99,102,241,0.08); border-left:4px solid var(--accent-purple); border-radius:var(--radius-sm); padding:18px 22px; margin-bottom:24px;">
          <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
            <strong style="color:#fff; font-size:1.02rem;">মেডিকেল ভর্তি গুরুত্ব ও প্রশ্নপ্রবণতা:</strong>
            <span style="background:rgba(99,102,241,0.25); color:#fff; font-size:0.8rem; font-weight:800; padding:3px 10px; border-radius:12px;">
              ${primer.weightage}
            </span>
          </div>
          <p style="color:var(--text-muted); font-size:0.9rem; margin:8px 0 0 0; line-height:1.6;">
            মেডিকেল ভর্তি পরীক্ষায় সাফল্য নির্ধারণে এই অধ্যায়টি অত্যন্ত গুরুত্বপূর্ণ। নিচে প্রদত্ত বিষয়গুলো থেকে সরাসরি প্রশ্ন আসে:
          </p>
        </div>

        <!-- Section: High Yield Topics -->
        <section style="margin-bottom:24px;">
          <h3 class="doc-section-header">
            <span>📚</span>
            <span>অধ্যায়ের আবশ্যকীয় গুরুত্বপূর্ণ বিষয়সমূহ (Must-Know Topics)</span>
          </h3>
          <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:18px 20px; line-height:1.75; font-family:var(--font-bangla); font-size:1rem; color:#fff;">
            ${primer.topics}
          </div>
        </section>

        <!-- Section: DGHS Admission Trap Warning -->
        <section style="margin-bottom:28px;">
          <h3 class="doc-section-header danger-header">
            <span>⚠️</span>
            <span>ভর্তি পরীক্ষার বিভ্রান্তিকর অপশন ও নেগেটিভ মার্কিং সতর্কতা</span>
          </h3>
          <div style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.25); border-radius:var(--radius-sm); padding:16px 20px; color:#fff; line-height:1.65; font-size:0.94rem;">
            <strong>পরীক্ষকদের প্রিয় ফাঁদ:</strong> ${primer.dghsTrap}
          </div>
        </section>

        <!-- How Living Notes Work Explanation -->
        <div style="background:rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:var(--radius-sm); padding:20px 24px; margin-bottom:28px;">
          <div style="display:flex; align-items:center; gap:10px; margin-bottom:8px;">
            <span style="font-size:1.4rem;">📝</span>
            <strong style="color:var(--accent-green); font-size:1rem;">স্বয়ংক্রিয় স্টাডি নোট কীভাবে তৈরি হবে?</strong>
          </div>
          <p style="color:var(--text-muted); font-size:0.9rem; line-height:1.65; margin:0;">
            এই অধ্যায়ের ওপর পরীক্ষা দিলে আপনার উত্তর দেওয়ার গতি, দ্বিধাগ্রস্ত অপশন ও ভুলের ধরন স্বয়ংক্রিয়ভাবে রেকর্ড হবে। সাথে সাথেই এই প্রাইমার পৃষ্ঠাটি <strong>তুলনামূলক পার্থক্যের ছক, নেগেটিভ মার্কিং সতর্কতা এবং সহজে মনে রাখার ছন্দে</strong> সমন্বিত একটি সাজানো স্টাডি নোটে রূপান্তরিত হবে!
          </p>
        </div>

        <!-- Prominent Launch CTA -->
        <div style="text-align:center; padding:16px 0;">
          <button class="btn-primary" style="padding:14px 32px; font-size:1.05rem;" onclick="App.startChapterExam(${chapter.id}, '${chapter.name_bn.replace(/'/g, "\\'")}', '${chapter.paper}')">
            🎯 এই অধ্যায়ের ওপর ১০টি এমসিকিউ পরীক্ষা দিন →
          </button>
        </div>
      </article>
    `;
  },

  // ─── SYLLABUS PRIMER HUB (WHEN NO EXAMS TAKEN YET ACROSS ALL CHAPTERS) ─
  renderSyllabusPrimerHub(activePaper) {
    let chapters = this.cachedChapters;
    if (activePaper !== 'all') {
      chapters = chapters.filter(c => c.paper === activePaper);
    }

    return `
      <div style="margin-bottom:32px;">
        <!-- Hub Intro Banner -->
        <div style="background:var(--bg-card); border:1px solid var(--border-light); border-radius:var(--radius-lg); padding:28px 32px; margin-bottom:28px;">
          <div style="display:flex; align-items:center; gap:14px; margin-bottom:12px;">
            <div style="font-size:2rem;">📚🩺</div>
            <div>
              <h2 style="font-size:1.4rem; font-weight:800; color:#fff; margin:0;">
                এইচএসসি জীববিজ্ঞান মেডিকেল ভর্তি স্টাডি নোট লাইব্রেরি
              </h2>
              <p style="color:var(--text-muted); font-size:0.9rem; margin:4px 0 0 0;">
                ১৮টি অধ্যায়ের গুরুত্বপূর্ণ পাঠ্য তথ্য, নেগেটিভ মার্কিং ফাঁদ এবং রিভিশন কেন্দ্র
              </p>
            </div>
          </div>
          <p style="color:var(--text-muted); font-size:0.92rem; line-height:1.65; max-width:840px; margin:0 0 16px 0;">
            যেকোনো অধ্যায়ের ওপর পরীক্ষা দিলে আপনার ভুলের ধরন ও দ্বিধাগ্রস্ত অপশন অনুযায়ী ৫টি ক্যাটাগরিতে সাজানো স্টাডি নোট এখানে যুক্ত হবে। অনুশীলন শুরু করতে নিচের যেকোনো অধ্যায় বেছে নিন:
          </p>
          <div style="display:flex; gap:12px; flex-wrap:wrap;">
            <button class="btn-primary" onclick="App.startStandardExam(10)">
              ⚡ ১০টি এমসিকিউ মডেল টেস্ট দিন
            </button>
            <button class="btn-secondary" onclick="App.showScreen('chapters')">
              📚 সকল অধ্যায় দেখুন →
            </button>
          </div>
        </div>

        <!-- Grid of All Chapter Primers -->
        <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(360px, 1fr)); gap:18px;">
          ${chapters.map(c => {
            const primer = this.chapterSyllabusPrimer[c.chapter_no] || {
              topics: 'মেডিকেল ভর্তি পরীক্ষার জন্য এই অধ্যায়ের প্রতিটি বিষয় সতর্কতার সাথে পড়া প্রয়োজন।',
              weightage: 'প্রতি বছর ১-২টি প্রশ্ন আসে'
            };
            const paperName = c.paper === '1st_paper' ? '🌿 ১ম পত্র (উদ্ভিদবিজ্ঞান)' : '🔬 ২য় পত্র (প্রাণিবিজ্ঞান)';

            return `
              <div class="chapter-interactive-card" style="padding:22px;">
                <div class="cic-top">
                  <div class="cic-header-row">
                    <span class="cic-chapter-pill">অধ্যায় ${c.chapter_no}</span>
                    <span style="font-size:0.75rem; color:var(--accent-purple); font-weight:700;">${primer.weightage}</span>
                  </div>
                  <h4 class="cic-title-bn" style="font-size:1.15rem;">${c.name_bn}</h4>
                  <div class="cic-title-en" style="margin-bottom:12px;">${c.name_en || ''}</div>
                  <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.05); border-radius:6px; padding:10px 12px; font-size:0.86rem; color:var(--text-muted); line-height:1.55; margin-bottom:12px;">
                    <strong style="color:var(--text-dim); display:block; font-size:0.75rem; text-transform:uppercase; margin-bottom:2px;">গুরুত্বপূর্ণ বিষয়:</strong>
                    ${primer.topics.length > 95 ? primer.topics.substring(0, 95) + '...' : primer.topics}
                  </div>
                  <div style="display:flex; justify-content:space-between; align-items:center;">
                    <span style="font-size:0.75rem; color:var(--text-dim); font-weight:700;">${paperName}</span>
                    <span style="font-size:0.75rem; color:var(--text-muted);">${c.total_mcqs || 3}টি প্রশ্ন প্রস্তুত</span>
                  </div>
                </div>

                <div class="cic-actions-row">
                  <button class="btn-primary" onclick="App.startChapterExam(${c.id}, '${c.name_bn.replace(/'/g, "\\'")}', '${c.paper}')">
                    🎯 পরীক্ষা দিন
                  </button>
                  <button class="btn-secondary" onclick="Notes.setChapterFilter(${c.id})">
                    📘 প্রাইমার পড়ুন
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  },

  // ─── UNIFIED CHAPTER LIVING DOCUMENT RENDERER (5 CONSOLIDATED BOXES) ───
  renderChapterDocument(doc) {
    if (!doc) return '';

    const paperName = doc.paper === '1st_paper' ? 'HSC জীববিজ্ঞান ১ম পত্র (উদ্ভিদবিজ্ঞান)' : 'HSC জীববিজ্ঞান ২য় পত্র (প্রাণিবিজ্ঞান)';
    const chapterTitle = doc.titleBn || doc.chapterName || `অধ্যায় ${doc.chapterNo || ''}`;
    const examsCount = doc.examsCount || 1;
    const version = doc.version || 1;
    const masteryPercent = Math.min(100, Math.max(20, Math.round(doc.masteryPercent || 50)));

    const compTable = doc.comparisonTable || [];
    const dangerTraps = doc.dangerTraps || [];
    const memoryTricks = doc.memoryTricks || [];
    const unchartedPrimers = doc.unchartedPrimers || [];
    const masteredConcepts = doc.masteredConcepts || [];

    // ─── BOX 1: OPTION CONFUSION COMPARISON TABLE (Pattern 3 & 4) ───
    let compTableHTML = '';
    if (compTable.length > 0) {
      compTableHTML = `
        <div class="unified-comparison-table-wrap">
          <table class="unified-comp-table">
            <thead>
              <tr>
                <th style="width:20%;">টপিক / বিষয়</th>
                <th style="width:25%;">দ্বিধাগ্রস্ত ২টি অপশন (Confusion)</th>
                <th style="width:25%;">প্রকৃত সঠিক তথ্য ও উত্তর</th>
                <th style="width:20%;">মনে রাখার নিশ্চিত কৌশল</th>
                <th style="width:10%;">বর্তমান অবস্থা</th>
              </tr>
            </thead>
            <tbody>
              ${compTable.map(row => `
                <tr>
                  <td><strong>${row.topic || 'টপিক'}</strong></td>
                  <td>
                    <span style="color:var(--accent-red); font-weight:700;">${row.option1 || 'অপশন ১'}</span>
                    <span style="color:var(--text-muted); font-size:0.8rem; margin:0 4px;">বনাম</span>
                    <span style="color:var(--accent-purple); font-weight:700;">${row.option2 || 'অপশন ২'}</span>
                  </td>
                  <td>
                    <span style="color:var(--accent-green); font-weight:700;">${row.correctOption || row.option2 || 'সঠিক উত্তর'}</span>
                  </td>
                  <td style="font-size:0.86rem; color:var(--text-muted); line-height:1.5;">
                    ${row.keyDiff || 'উভয় অপশনের মাঝে মূল কার্যকরী পার্থক্যটি মনে রাখুন।'}
                  </td>
                  <td>
                    ${row.isResolved
                      ? '<span style="background:rgba(34,201,122,0.15); color:var(--accent-green); padding:3px 8px; border-radius:10px; font-size:0.75rem; font-weight:800; white-space:nowrap;">আয়ত্ত হয়েছে ✅</span>'
                      : '<span style="background:rgba(255,170,64,0.15); color:var(--accent-amber); padding:3px 8px; border-radius:10px; font-size:0.75rem; font-weight:800; white-space:nowrap;">দ্বিধা সক্রিয় ⚠️</span>'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      compTableHTML = `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:16px 20px; color:var(--text-muted); font-size:0.9rem;">
          ✨ কোনো অপশন পরিবর্তন বা দ্বিধাদ্বন্দ্ব পরিলক্ষিত হয়নি। চমৎকার মানসিক স্থিরতা!
        </div>
      `;
    }

    // ─── BOX 2: FAST CARELESS MISTAKES & REPEAT DANGER TRAPS (Pattern 5, 4, 2) ───
    let dangerTrapsHTML = '';
    if (dangerTraps.length > 0) {
      dangerTrapsHTML = dangerTraps.map(trap => {
        const isRepeat = Boolean(trap.isRepeat || (trap.repeatCount && trap.repeatCount >= 2));
        const repeatCount = trap.repeatCount || 2;

        return `
          <div class="danger-trap-alert-card ${isRepeat ? 'repeat-danger-trap' : ''}">
            ${isRepeat ? `
              <div class="repeat-danger-badge">
                <span>🚨 REPEAT DANGER TRAP (মারাত্মক পুনরাবৃত্তিমূলক ভুল — ${repeatCount} বার একই ভুল!)</span>
              </div>
              <div style="color:var(--accent-red); font-size:0.9rem; font-weight:700; margin-bottom:10px;">
                ⚠️ সতর্কবার্তা: আপনি বিগত ${repeatCount}টি পরীক্ষায় ক্রমাগত একই ভুল করছেন! ভর্তি পরীক্ষায় এই ভুলের জন্য -০.২৫ নেগেটিভ মার্কসহ ১.২৫ নম্বর কাটা যাবে। পাঠ্যবই থেকে এই তথ্যটি এখনই ঝালাই করে নিন।
              </div>
            ` : `
              <div style="display:inline-flex; align-items:center; gap:6px; background:rgba(255,51,102,0.15); color:var(--accent-red); font-size:0.76rem; font-weight:800; padding:2px 8px; border-radius:6px; margin-bottom:8px;">
                <span>⚠️ তাড়াহুড়োয় ভুল / নেগেটিভ মার্কিং ফাঁদ (-০.২৫ ঝুঁকি)</span>
              </div>
            `}

            <div style="font-family:var(--font-bangla); color:#fff; font-size:0.98rem; font-weight:700; margin-bottom:8px; line-height:1.5;">
              ${trap.stem ? `প্রশ্ন: "${trap.stem}"` : trap.topic}
            </div>

            <div style="display:flex; flex-wrap:wrap; gap:16px; margin:8px 0; font-size:0.88rem;">
              <div>
                <span style="color:var(--text-dim);">আপনার ভুল পছন্দ:</span>
                <span style="color:var(--accent-red); font-weight:700; margin-left:4px;">${trap.choice || 'ভুল অপশন'}</span>
              </div>
              <div>
                <span style="color:var(--text-dim);">প্রকৃত সঠিক উত্তর:</span>
                <span style="color:var(--accent-green); font-weight:700; margin-left:4px;">${trap.correctChoice || 'সঠিক উত্তর'}</span>
              </div>
              ${trap.speedSec ? `
                <div>
                  <span style="color:var(--text-dim);">নেওয়া সময়:</span>
                  <span style="color:#fff; font-weight:700; margin-left:4px;">${trap.speedSec} সেকেন্ড</span>
                </div>
              ` : ''}
            </div>

            <p style="color:var(--text-muted); font-size:0.88rem; line-height:1.55; margin:8px 0 0 0;">
              <strong>কেন ভুল হলো:</strong> ${trap.trap || 'প্রশ্নকর্তার বিভ্রান্তিকর অপশনের ফাঁদে পড়ে ভুল হয়েছে।'}
            </p>
          </div>
        `;
      }).join('');
    } else {
      dangerTrapsHTML = `
        <div style="background:rgba(34,201,122,0.04); border:1px solid rgba(34,201,122,0.2); border-radius:var(--radius-sm); padding:16px 20px; color:var(--accent-green); font-size:0.9rem;">
          ✓ চমৎকার! কোনো তাড়াহুড়োয় করা ভুল বা সক্রিয় নেগেটিভ মার্কিং ফাঁদ নেই।
        </div>
      `;
    }

    // ─── BOX 3: MEMORY MNEMONICS FOR LATENCY > 6S (Pattern 1 & 2) ───
    let memoryTricksHTML = '';
    if (memoryTricks.length > 0) {
      memoryTricksHTML = memoryTricks.map(m => `
        <div class="mnemonic-item-card">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
            <strong style="color:#6889FF; font-size:0.95rem;">${m.topic}</strong>
            ${m.latencySec ? `<span style="font-size:0.78rem; color:var(--text-dim);">${m.latencySec} সেকেন্ড সময় লেগেছিল</span>` : ''}
          </div>
          <p style="color:#fff; font-size:0.92rem; line-height:1.55; margin:4px 0 6px 0;">
            ${m.mnemonic}
          </p>
          ${m.speedTrigger ? `
            <div style="font-size:0.84rem; color:var(--text-muted);">
              ${m.speedTrigger}
            </div>
          ` : ''}
        </div>
      `).join('');
    } else {
      memoryTricksHTML = `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:16px 20px; color:var(--text-muted); font-size:0.9rem;">
          ✓ দারুণ! স্মৃতি মন্থরতার কোনো রেকর্ড নেই। সকল প্রশ্নের তথ্য ৬ সেকেন্ডের মধ্যে সফলভাবে মনে পড়েছে।
        </div>
      `;
    }

    // ─── BOX 4: SKIPPED QUESTIONS STUDY GUIDE (Pattern 7 & 6) ───
    let primersHTML = '';
    if (unchartedPrimers.length > 0) {
      primersHTML = unchartedPrimers.map(u => `
        <div class="primer-item-card">
          <strong style="color:var(--accent-amber); font-size:0.95rem; display:block; margin-bottom:4px;">
            ${u.topic || 'বাদ দেওয়া টপিক'}
          </strong>
          <p style="color:#fff; font-size:0.92rem; line-height:1.55; margin:0 0 6px 0;">
            ${u.primerText}
          </p>
          ${u.keyFacts ? `
            <div style="font-size:0.84rem; color:var(--text-muted); line-height:1.5;">
              <strong>ভর্তি তথ্য:</strong> ${u.keyFacts}
            </div>
          ` : ''}
        </div>
      `).join('');
    } else {
      primersHTML = `
        <div style="background:rgba(255,255,255,0.02); border:1px solid var(--border-light); border-radius:var(--radius-sm); padding:16px 20px; color:var(--text-muted); font-size:0.9rem;">
          ✓ দুর্দান্ত! কোনো প্রশ্ন না দাগিয়ে ছেড়ে দেওয়া হয়নি (Zero Skipped Questions)।
        </div>
      `;
    }

    // ─── BOX 5: MASTERED CONCEPTS & RESOLVED MISTAKES (Pattern 0) ───
    let masteredHTML = '';
    if (masteredConcepts.length > 0) {
      masteredHTML = `
        <div style="margin-top:10px;">
          ${masteredConcepts.map(mc => `
            <div class="mastered-item-row">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="color:var(--accent-green); font-size:1.1rem;">✓</span>
                <span style="font-weight:700; color:#fff;">${mc.topic}</span>
                ${mc.resolvedFrom ? `
                  <span style="background:rgba(34,201,122,0.2); color:var(--accent-green); font-size:0.75rem; font-weight:800; padding:2px 8px; border-radius:8px;">
                    ${mc.resolvedFrom} সমাধানকৃত ✅
                  </span>
                ` : ''}
              </div>
              <div style="font-size:0.82rem; color:var(--text-muted);">
                ${mc.resolutionNote || '৬ সেকেন্ডের মধ্যে কোনো দ্বিধা ছাড়া শতভাগ নির্ভুল উত্তর'}
              </div>
            </div>
          `).join('')}
        </div>
      `;
    } else {
      masteredHTML = `
        <div style="color:var(--text-dim); font-size:0.88rem; padding:8px 0;">
          রিটেক পরীক্ষা সম্পন্ন করে আরও বিষয় আয়ত্ত তালিকায় যুক্ত করুন।
        </div>
      `;
    }

    return `
      <article class="chapter-document-sheet" id="chapterDoc-${doc.chapterId || doc.id || 'session'}">
        <!-- Document Sheet Header -->
        <div class="doc-sheet-header">
          <div class="doc-header-top-row">
            <div>
              <span class="doc-paper-tag">${paperName}</span>
              <h2 class="doc-chapter-title">${chapterTitle}</h2>
              <div class="doc-badges-row">
                <span class="doc-version-pill">স্মার্ট স্টাডি নোট v${version}.0</span>
                <span class="doc-exams-count-pill">🔄 ${examsCount}টি পরীক্ষা সম্পন্ন</span>
              </div>
            </div>

            <!-- Prominent Chapter Actions -->
            <div class="doc-header-actions">
              ${doc.chapterId ? `
                <button class="btn-primary" style="padding:10px 20px; font-size:0.88rem;" onclick="App.startChapterAdaptiveRetake(${doc.chapterId}, '${chapterTitle.replace(/'/g, "\\'")}')">
                  🎯 চ্যাপ্টার অ্যাডাপ্টিভ রিটেক পরীক্ষা দিন
                </button>
              ` : ''}
              <button class="btn-secondary" style="padding:10px 18px; font-size:0.88rem;" onclick="Notes.printChapterDocument(${doc.chapterId || 0})">
                🖨️ প্রিন্ট / PDF ডাউনলোড
              </button>
            </div>
          </div>

          <!-- Mastery Bar -->
          <div class="doc-mastery-bar-wrap">
            <span style="font-size:0.84rem; color:var(--text-muted); font-weight:700; min-width:120px;">
              প্রস্তুতি ও একুরেসি:
            </span>
            <div class="doc-mastery-track">
              <div class="doc-mastery-fill" style="width:${masteryPercent}%;"></div>
            </div>
            <span style="font-size:0.92rem; font-weight:800; color:${masteryPercent >= 70 ? 'var(--accent-green)' : 'var(--accent-amber)'}; min-width:48px; text-align:right;">
              ${masteryPercent}%
            </span>
          </div>
        </div>

        <!-- Box 1: Option Confusion Table -->
        <section style="margin-bottom:28px;">
          <h3 class="doc-section-header">
            <span>🔀</span>
            <span>১. অপশন পরিবর্তন ও দ্বিধাদ্বন্দ্ব দূর করার ছক (Option Confusion Comparison Matrix)</span>
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:-6px; margin-bottom:12px; line-height:1.5;">
            যেসব প্রশ্নে অপশন একাধিকবার পরিবর্তন করে দ্বিধায় পড়েছিলেন, তাদের মুখোমুখি তফাত ও মনে রাখার নিশ্চিত কৌশল:
          </p>
          ${compTableHTML}
        </section>

        <!-- Box 2: Fast Careless Mistakes & Repeat Danger Traps -->
        <section style="margin-bottom:28px;">
          <h3 class="doc-section-header danger-header">
            <span>⚠️</span>
            <span>২. তাড়াহুড়োয় ভুল ও নেগেটিভ মার্কিং ফাঁদ (Fast Careless Mistakes & Traps)</span>
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:-6px; margin-bottom:12px; line-height:1.5;">
            দ্রুত সিদ্ধান্ত নিয়ে ভুল করা প্রশ্ন এবং পুনরাবৃত্তিমূলক নেগেটিভ মার্কিং ফাঁদসমূহ (-০.২৫ ঝুঁকি):
          </p>
          ${dangerTrapsHTML}
        </section>

        <!-- Box 3: Memory Mnemonics -->
        <section style="margin-bottom:28px;">
          <h3 class="doc-section-header mnemonic-header">
            <span>⏱️</span>
            <span>৩. স্মৃতি মন্থরতা ও দ্রুত মনে রাখার সহজ ছন্দ (Memory Mnemonics for Latency > 6s)</span>
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:-6px; margin-bottom:12px; line-height:1.5;">
            যেসব প্রশ্নের উত্তর মনে করতে ৬ সেকেন্ডের বেশি সময় লেগেছে, সেগুলোর ৫-সেকেন্ড ইনস্ট্যান্ট রিকল কৌশল:
          </p>
          ${memoryTricksHTML}
        </section>

        <!-- Box 4: Skipped Questions Primer -->
        <section style="margin-bottom:28px;">
          <h3 class="doc-section-header primer-header">
            <span>📖</span>
            <span>৪. না দাগিয়ে ছেড়ে দেওয়া প্রশ্নের সারসংক্ষেপ (Skipped Topics Study Guide)</span>
          </h3>
          <p style="color:var(--text-muted); font-size:0.88rem; margin-top:-6px; margin-bottom:12px; line-height:1.5;">
            যেসব প্রশ্ন স্পর্শ না করে ছেড়ে গেছেন, সেগুলোর আবশ্যকীয় ভর্তি তথ্য:
          </p>
          ${primersHTML}
        </section>

        <!-- Box 5: Mastered & Resolved Concepts -->
        <section style="margin-bottom:16px;">
          <h3 class="doc-section-header mastered-header">
            <span>⚡</span>
            <span>৫. শতভাগ আয়ত্তকৃত বিষয় ও সমাধানকৃত ভুল (Mastered & Resolved Concepts)</span>
          </h3>
          ${masteredHTML}
        </section>
      </article>
    `;
  },

  // Helper to render into element (e.g. results screen after exam)
  renderNotesToElement(docOrNotes, container) {
    if (!container) return;
    if (!docOrNotes) {
      container.innerHTML = `
        <div style="background:var(--bg-subtle); border-radius:var(--radius-sm); padding:20px; text-align:center; color:var(--text-muted);">
          সকল প্রশ্নের উত্তর শতভাগ নির্ভুলভাবে দেওয়া হয়েছে!
        </div>
      `;
      return;
    }

    // If passed a chapterLivingNote or sessionNotes object
    if (docOrNotes.comparisonTable || docOrNotes.dangerTraps || docOrNotes.titleBn) {
      container.innerHTML = this.renderChapterDocument(docOrNotes);
      return;
    }

    // If passed an array of living notes
    if (Array.isArray(docOrNotes) && docOrNotes.length > 0) {
      if (docOrNotes[0].comparisonTable || docOrNotes[0].dangerTraps) {
        container.innerHTML = docOrNotes.map(d => this.renderChapterDocument(d)).join('');
        return;
      }
    }

    container.innerHTML = `
      <div style="background:var(--bg-subtle); border-radius:var(--radius-sm); padding:20px; text-align:center; color:var(--text-muted);">
        আপনার পরীক্ষার স্টাডি নোট সংরক্ষিত হয়েছে!
      </div>
    `;
  },

  printChapterDocument(chapterId) {
    window.print();
  }
};
