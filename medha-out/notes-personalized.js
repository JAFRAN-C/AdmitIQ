// notes-personalized.js
// Behavior-adaptive study note generator for AdmitIQ.
//
// HOW TO USE (in server.js):
//   1. Delete the old "5. LIVING STUDY NOTES GENERATOR" route (app.post('/api/notes/generate', ...)).
//   2. In its place add:
//        require('./notes-personalized')(app, { db });
//   3. The frontend must send { sessionId } to POST /api/notes/generate
//      (the server now reads telemetry itself instead of trusting client-sent items).
//
// What makes notes differ between students:
//   - A behavior profile is computed from the student's telemetry (not from the AI).
//   - The student is assigned an "archetype" (impulsive, overthinker, slow recaller, ...)
//     which changes the tone, structure and habit-fix of every note.
//   - Timing is judged against the student's OWN median speed, not a fixed number.
//   - Which questions get notes depends on the student's dominant weakness + history.
//   - Past sessions / existing notes feed in, so repeat mistakes get a different angle.

const Groq = require('groq-sdk');

// ─── Pattern and archetype definitions ───────────────────────────
const PATTERN_NAMES = {
  1: 'Slow + Correct (Retrieval Hesitation)',
  2: 'Slow + Wrong (Concept Gap)',
  3: 'Switched + Correct (Borderline Ambiguity)',
  4: 'Switched + Wrong (Distractor Trap)',
  5: 'Fast + Wrong (Confidently Wrong)',
  6: 'Skip & Return (Panic Hesitation)',
  7: 'Left Blank (Avoidance)'
};

const ARCHETYPES = {
  impulsive_guesser: {
    labelBn: 'ঝটপট উত্তরদাতা',
    primaryPatterns: [5],
    tone: 'Firm, direct and slightly urgent. No fluff. Make the cost of a careless answer feel real (MAT negative marking is -0.25).',
    noteStyle: 'Very short explanation. Name the exact false assumption the student made. Give a 3-step "pause protocol" to run before locking an answer (read all four options, find the one word that decides it, check for exceptions).',
    habitFix: 'Slow down by 3 seconds on questions that feel easy.'
  },
  overthinker: {
    labelBn: 'দোদুল্যমান পরীক্ষার্থী',
    primaryPatterns: [4, 3],
    tone: 'Calm, reassuring and decisive. The student does not lack knowledge, they lack a tie-breaker.',
    noteStyle: 'Build the note around ONE decisive rule that separates the two options the student switched between. Add a "when to trust your first instinct" line that uses the switch verdict from the profile.',
    habitFix: 'Change an answer only if you can state a concrete reason in one sentence.'
  },
  shaky_recaller: {
    labelBn: 'ধীরগতির স্মরণকারী',
    primaryPatterns: [1],
    tone: 'Encouraging. They get it right, just slowly, so the goal is speed through stronger memory.',
    noteStyle: 'Mnemonic-heavy. Give a rhyme (ছন্দ) or acronym, plus 2 active-recall prompts the student can self-test on, plus a quick spaced-review schedule (today, +2 days, +7 days).',
    habitFix: 'Recite the mnemonic aloud before moving on.'
  },
  concept_gap: {
    labelBn: 'ধারণাগত ঘাটতিযুক্ত',
    primaryPatterns: [2],
    tone: 'Patient and teacherly. Assume the foundation is missing and do not rush.',
    noteStyle: 'Rebuild from first principles in small steps with a simple everyday analogy, then a tiny worked example. Keep the mnemonic secondary.',
    habitFix: 'Re-read the chapter summary before attempting more MCQs on this topic.'
  },
  panic_skipper: {
    labelBn: 'চাপে স্কিপকারী',
    primaryPatterns: [6],
    tone: 'Steady and practical, like an exam-hall coach.',
    noteStyle: 'Give a 3-second instant recognition cue for the topic, a time-box rule (e.g. 40 seconds max, then mark and move), and a triage order for the exam paper.',
    habitFix: 'Time-box every question and never skip without marking a best guess.'
  },
  avoider: {
    labelBn: 'প্রশ্ন এড়িয়ে যাওয়া শিক্ষার্থী',
    primaryPatterns: [7],
    tone: 'Low-pressure and motivating. Lower the fear of attempting.',
    noteStyle: 'Teach elimination: how to cross out two options using the concept, so that a blank becomes an educated attempt. Keep the concept section minimal and approachable.',
    habitFix: 'Always eliminate at least two options before deciding to leave a question blank.'
  },
  steady_achiever: {
    labelBn: 'স্থিতিশীল ও দক্ষ',
    primaryPatterns: [],
    tone: 'Respectful, advanced and concise. The student is doing well.',
    noteStyle: 'Skip the basics. Focus on exceptions, edge cases and the subtle wording traps that cost top scorers a mark.',
    habitFix: 'Practice exception-type questions to protect your top score.'
  }
};

// ─── Small helpers ───────────────────────────────────────────────
function makeDbHelpers(db) {
  return {
    all: (sql, params = []) =>
      new Promise((resolve, reject) => db.all(sql, params, (e, r) => (e ? reject(e) : resolve(r)))),
    get: (sql, params = []) =>
      new Promise((resolve, reject) => db.get(sql, params, (e, r) => (e ? reject(e) : resolve(r)))),
    run: (sql, params = []) =>
      new Promise((resolve, reject) =>
        db.run(sql, params, function (e) {
          if (e) reject(e);
          else resolve({ lastID: this.lastID, changes: this.changes });
        })
      )
  };
}

const placeholders = arr => arr.map(() => '?').join(',');
const round1 = n => Math.round(n * 10) / 10;

function median(arr) {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

function optionText(opt) {
  if (typeof opt === 'string') return opt.trim();
  return String(opt?.text ?? opt?.bn ?? JSON.stringify(opt)).trim();
}

function safeParse(json, fallback) {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

// ─── Model call (Qwen via DashScope, or Qwen via Groq) ───────────
async function callModel(prompt, { maxTokens = 1800 } = {}) {
  const qwenKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;

  if (qwenKey) {
    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-plus';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${qwenKey}` },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.4,
        max_tokens: maxTokens,
        response_format: { type: 'json_object' }
      })
    });
    if (!response.ok) throw new Error(`Qwen API error: ${await response.text()}`);
    const data = await response.json();
    const choice = data.choices?.[0];
    if (choice?.finish_reason === 'length') throw new Error('Model output was cut off (max_tokens reached)');
    return choice?.message?.content || '';
  }

  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) throw new Error('Neither QWEN_API_KEY nor GROQ_API_KEY is configured in .env');

  const groq = new Groq({ apiKey: groqKey });
  const completion = await groq.chat.completions.create({
    model: process.env.MODEL || 'qwen/qwen3.8-27b',
    response_format: { type: 'json_object' },
    max_tokens: maxTokens,
    temperature: 0.4,
    messages: [{ role: 'user', content: prompt }]
  });
  const choice = completion.choices?.[0];
  if (choice?.finish_reason === 'length') throw new Error('Model output was cut off (max_tokens reached)');
  return choice?.message?.content || '';
}

function parseModelJson(raw) {
  let s = String(raw || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a === -1 || b === -1) throw new Error('No JSON object found in model output');
  return JSON.parse(s.slice(a, b + 1));
}

// ─── Step 1: build the student's behavior profile ────────────────
function buildStudentProfile(rows, prevSessions) {
  const n = rows.length;
  const medianTime = median(rows.map(r => r.time_taken || 0)) || 1;
  const counts = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };

  let correct = 0;
  let totalTime = 0;
  let totalSwitches = 0;
  let changedRightToWrong = 0;
  let changedWrongToRight = 0;

  const items = rows.map(r => {
    const options = safeParse(r.options_json, []);
    const correctText = options[r.correct_index] !== undefined ? optionText(options[r.correct_index]) : null;
    const first = (r.first_choice || '').trim();
    const final = (r.final_choice || '').trim();

    counts[r.pattern_type] = (counts[r.pattern_type] || 0) + 1;
    if (r.is_correct) correct++;
    totalTime += r.time_taken || 0;
    totalSwitches += r.switch_count || 0;

    if (correctText !== null && first && final && first !== final) {
      const firstWasCorrect = first === correctText;
      if (firstWasCorrect && !r.is_correct) changedRightToWrong++;
      if (!firstWasCorrect && r.is_correct) changedWrongToRight++;
    }

    return {
      questionId: r.question_id,
      topic: r.topic_bn || r.chapter_name || `প্রশ্ন #${r.question_id}`,
      chapterName: r.chapter_name || null,
      questionText: r.text_bn || null,
      options: options.map(optionText),
      correctAnswer: correctText,
      studentFirstChoice: first || null,
      studentFinalChoice: final || null,
      isCorrect: !!r.is_correct,
      timeSeconds: r.time_taken || 0,
      timeVsOwnMedian: round1((r.time_taken || 0) / medianTime),
      switchCount: r.switch_count || 0,
      clickPath: safeParse(r.click_path_json, []).slice(0, 12),
      skippedAndReturned: !!(r.was_skipped && r.answered_at_end),
      pattern: r.pattern_type,
      patternName: PATTERN_NAMES[r.pattern_type] || 'Mastered',
      officialExplanation: r.explanation_bn || null,
      examTrapHint: r.trap_hint_bn || null
    };
  });

  const rate = p => (counts[p] || 0) / n;
  const scores = {
    impulsive_guesser: rate(5) * 1.6,
    overthinker: rate(3) + rate(4) + (totalSwitches / n) * 0.1,
    shaky_recaller: rate(1),
    concept_gap: rate(2) * 1.2,
    panic_skipper: rate(6) * 1.3,
    avoider: rate(7) * 1.2
  };
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const accuracy = round1((correct / n) * 100);

  let archetype = ranked[0][0];
  if (ranked[0][1] < 0.15 && accuracy >= 80) archetype = 'steady_achiever';
  const secondary = ranked[1][1] >= 0.15 && ranked[1][0] !== archetype ? ranked[1][0] : null;

  let switchVerdict = 'not_enough_data';
  if (changedRightToWrong + changedWrongToRight > 0) {
    if (changedRightToWrong > changedWrongToRight) switchVerdict = 'second_guessing_hurts';
    else if (changedWrongToRight > changedRightToWrong) switchVerdict = 'changes_usually_help';
    else switchVerdict = 'neutral';
  }

  const prev = prevSessions || [];
  const trend = prev.length ? round1(accuracy - prev[0].accuracy) : null;

  // Most frequent dominant pattern across earlier sessions (chronic habit)
  const domCounts = {};
  prev.forEach(s => {
    if (s.dominant_pattern > 0) domCounts[s.dominant_pattern] = (domCounts[s.dominant_pattern] || 0) + 1;
  });
  const chronicPattern = Object.entries(domCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    items,
    profile: {
      questionsAnswered: n,
      accuracy,
      avgTimeSeconds: round1(totalTime / n),
      medianTimeSeconds: round1(medianTime),
      patternCounts: counts,
      archetype,
      archetypeLabelBn: ARCHETYPES[archetype].labelBn,
      secondaryArchetype: secondary,
      switchVerdict,
      changedRightToWrong,
      changedWrongToRight,
      accuracyTrendVsLastExam: trend,
      chronicPattern: chronicPattern ? Number(chronicPattern) : null
    }
  };
}

function buildInsightsBn(p) {
  const out = [];
  const c = p.patternCounts;
  if (c[5]) out.push(`${c[5]}টি প্রশ্নে তুমি খুব দ্রুত ভুল উত্তর দিয়েছো, নেগেটিভ মার্কিংয়ের ঝুঁকি এখানেই।`);
  if (c[4] + c[3]) out.push(`${c[4] + c[3]}টি প্রশ্নে তুমি অপশন বদলেছো।`);
  if (p.switchVerdict === 'second_guessing_hurts')
    out.push(`অপশন বদলে তুমি ${p.changedRightToWrong}বার সঠিক উত্তর থেকে ভুলে গেছো, প্রথম ধারণাকে আরও বিশ্বাস করো।`);
  if (p.switchVerdict === 'changes_usually_help')
    out.push(`অপশন বদলে তুমি ${p.changedWrongToRight}বার ভুল থেকে সঠিক উত্তরে গেছো, ভেবে বদলানো তোমার জন্য কাজ করছে।`);
  if (c[2]) out.push(`${c[2]}টি প্রশ্নে ধারণাগত ঘাটতি দেখা গেছে।`);
  if (c[1]) out.push(`${c[1]}টি প্রশ্নে উত্তর ঠিক ছিল কিন্তু মনে করতে বেশি সময় লেগেছে।`);
  if (c[6]) out.push(`${c[6]}টি প্রশ্ন স্কিপ করে পরে ফিরেছো।`);
  if (c[7]) out.push(`${c[7]}টি প্রশ্ন ফাঁকা রেখেছো।`);
  if (p.accuracyTrendVsLastExam !== null)
    out.push(
      p.accuracyTrendVsLastExam >= 0
        ? `গত পরীক্ষার চেয়ে নির্ভুলতা ${p.accuracyTrendVsLastExam}% বেড়েছে।`
        : `গত পরীক্ষার চেয়ে নির্ভুলতা ${Math.abs(p.accuracyTrendVsLastExam)}% কমেছে।`
    );
  return out;
}

// ─── Step 2: choose which questions deserve notes for THIS student ─
function prioritizeItems(items, profile, topicHistory) {
  const base = { 5: 10, 4: 9, 3: 8, 6: 7, 2: 6, 1: 5, 7: 4 };
  const primary = ARCHETYPES[profile.archetype].primaryPatterns;
  const secondaryPrimary = profile.secondaryArchetype ? ARCHETYPES[profile.secondaryArchetype].primaryPatterns : [];

  const scored = items
    .filter(it => it.pattern > 0)
    .map(it => {
      let score = base[it.pattern] || 0;
      if (primary.includes(it.pattern)) score += 4;
      if (secondaryPrimary.includes(it.pattern)) score += 2;
      if (profile.chronicPattern === it.pattern) score += 1.5;
      const h = topicHistory[it.topic];
      if (h && h.flagged > 0) score += Math.min(h.flagged, 3) * 1.5; // repeat trouble topics rise
      score += Math.min(it.timeVsOwnMedian, 3); // slower than their own norm
      return { ...it, score };
    })
    .sort((a, b) => b.score - a.score);

  const seen = new Set();
  const picked = [];
  for (const it of scored) {
    if (seen.has(it.topic)) continue;
    seen.add(it.topic);
    picked.push(it);
    if (picked.length === 3) break;
  }
  return picked;
}

// ─── Step 3: build one prompt per note, tailored to the student ───
function buildNotePrompt(profile, item, history, previousNote) {
  const coaching = ARCHETYPES[profile.archetype];
  const secondary = profile.secondaryArchetype ? ARCHETYPES[profile.secondaryArchetype] : null;
  const wantsComparison = [2, 3, 4, 5].includes(item.pattern);

  const evidence = {
    topic: item.topic,
    chapter: item.chapterName,
    question: item.questionText,
    options: item.options,
    correctAnswer: item.correctAnswer,
    studentFirstChoice: item.studentFirstChoice,
    studentFinalChoice: item.studentFinalChoice,
    answeredCorrectly: item.isCorrect,
    timeSeconds: item.timeSeconds,
    timeComparedToTheirOwnMedian: `${item.timeVsOwnMedian}x`,
    optionSwitches: item.switchCount,
    clickPath: item.clickPath,
    skippedThenReturned: item.skippedAndReturned,
    patternType: item.pattern,
    patternName: item.patternName,
    referenceExplanation: item.officialExplanation,
    referenceTrapHint: item.examTrapHint
  };

  const topicHistory = history
    ? `Earlier exams on this topic: ${history.attempts} attempts, ${history.correct} correct, ${history.flagged} showed hesitation or errors.`
    : 'No earlier attempts on this topic.';

  const previous = previousNote
    ? `This topic already has note version ${previousNote.version}. The student is STILL struggling, so the old approach did not stick. Use a different explanation angle and a different mnemonic than before. Previous memory trick (do not reuse): ${previousNote.memoryTrick || 'n/a'}`
    : 'This is the first note for this topic.';

  return `You are AdmitIQ's personal study coach for a Bangladesh Medical Admission Test (MAT) Biology student.
You are writing ONE study note for ONE specific student, based on exactly how they behaved while answering.
Two students who got the same question wrong must receive different notes, so use the evidence below.

STUDENT BEHAVIOR PROFILE (computed from their telemetry):
${JSON.stringify(profile)}

COACHING STYLE FOR THIS STUDENT (archetype: ${profile.archetype}):
- Tone: ${coaching.tone}
- Note structure: ${coaching.noteStyle}
- Habit to build: ${coaching.habitFix}
${secondary ? `- Secondary tendency (${profile.secondaryArchetype}): ${secondary.habitFix}` : ''}

THIS QUESTION'S EVIDENCE:
${JSON.stringify(evidence)}

HISTORY:
${topicHistory}
${previous}

RULES:
1. Respond ONLY with valid JSON. No markdown, no backticks.
2. Write all content in clear, natural Bangla. Use the tone above. Address the student as "তুমি".
3. "diagnosis" MUST cite real evidence: the actual seconds taken, the option they changed from and to, or the pattern. Never write a generic diagnosis.
4. If the profile switchVerdict is "second_guessing_hurts", tell them their first instinct is usually better. If it is "changes_usually_help", tell them that rechecking works for them. Apply this only if relevant to this question.
5. Pattern 5: include a negative marking warning (-0.25). Pattern 6: include a 3-second recognition cue. Pattern 7: include an elimination method.
6. ${wantsComparison ? 'Include "comparisonBox" contrasting the option the student chose (or hesitated between) with the correct option.' : 'Set "comparisonBox" to null.'}
7. Keep it tight: coreConcept maximum 4 sentences, every other text field maximum 2 sentences.

SCHEMA:
{
  "diagnosis": "string",
  "coreConcept": "string",
  "comparisonBox": { "option1": { "name": "string", "definition": "string" }, "option2": { "name": "string", "definition": "string" }, "keyDifference": "string" } or null,
  "memoryTrick": "string (mnemonic or ছন্দ, fitted to this student's style)",
  "medicalTrapAlert": "string",
  "personalStrategy": "string (the habit fix for THIS student, tied to this question)",
  "adaptiveQuestionIdea": "string"
}`;
}

// ─── Route registration ──────────────────────────────────────────
module.exports = function registerPersonalizedNotes(app, { db }) {
  const q = makeDbHelpers(db);

  app.post('/api/notes/generate', async (req, res) => {
    try {
      const sessionId = parseInt(req.body.sessionId, 10);
      if (!sessionId) return res.status(400).json({ error: 'sessionId is required' });

      const session = await q.get(`SELECT * FROM exam_sessions WHERE id = ? AND user_id = 1`, [sessionId]);
      if (!session) return res.status(404).json({ error: 'Exam session not found' });

      // Full telemetry for the session, joined with question data (server-side, not client-trusted)
      const rows = await q.all(
        `SELECT t.*, q.text_bn, q.options_json, q.correct_index, q.explanation_bn, q.trap_hint_bn,
                q.topic_bn, c.name_bn AS chapter_name
         FROM telemetry_logs t
         LEFT JOIN questions q ON t.question_id = q.id
         LEFT JOIN chapters c ON q.chapter_id = c.id
         WHERE t.session_id = ?`,
        [sessionId]
      );
      if (!rows.length) return res.status(404).json({ error: 'No telemetry found for this session' });

      const prevSessions = await q.all(
        `SELECT accuracy, avg_time, dominant_pattern FROM exam_sessions
         WHERE user_id = 1 AND id < ? ORDER BY id DESC LIMIT 5`,
        [sessionId]
      );

      const { items, profile } = buildStudentProfile(rows, prevSessions);
      const insightsBn = buildInsightsBn(profile);

      const flagged = items.filter(it => it.pattern > 0);
      if (!flagged.length) {
        return res.json({
          success: true,
          message: 'All questions mastered with zero hesitation!',
          profile: { ...profile, insightsBn },
          notes: []
        });
      }

      // Per-topic history from earlier exams
      const topics = [...new Set(flagged.map(it => it.topic))];
      const historyRows = await q.all(
        `SELECT q.topic_bn AS topic, COUNT(*) AS attempts, SUM(t.is_correct) AS correct,
                SUM(CASE WHEN t.pattern_type > 0 THEN 1 ELSE 0 END) AS flagged
         FROM telemetry_logs t
         JOIN exam_sessions s ON t.session_id = s.id
         JOIN questions q ON t.question_id = q.id
         WHERE s.user_id = 1 AND s.id < ? AND q.topic_bn IN (${placeholders(topics)})
         GROUP BY q.topic_bn`,
        [sessionId, ...topics]
      );
      const topicHistory = {};
      historyRows.forEach(h => (topicHistory[h.topic] = h));

      // Existing notes, so repeated struggles evolve the note instead of duplicating it
      const existingRows = await q.all(
        `SELECT id, topic_name, version, exams_count, mastery_percent, note_content_json
         FROM study_notes WHERE user_id = 1 AND topic_name IN (${placeholders(topics)}) ORDER BY id ASC`,
        topics
      );
      const existingByTopic = {};
      existingRows.forEach(r => (existingByTopic[r.topic_name] = r));

      const targets = prioritizeItems(items, profile, topicHistory);

      // One focused model call per note, in parallel (avoids one giant output getting cut off)
      const settled = await Promise.allSettled(
        targets.map(async item => {
          const existing = existingByTopic[item.topic];
          const previousNote = existing ? safeParse(existing.note_content_json, {}) : null;
          if (previousNote) previousNote.version = existing.version;

          const prompt = buildNotePrompt(profile, item, topicHistory[item.topic], previousNote);
          const parsed = parseModelJson(await callModel(prompt, { maxTokens: 1800 }));

          // Server-owned fields override anything the model returns
          return {
            item,
            note: {
              ...parsed,
              topicName: item.topic,
              patternType: item.pattern,
              patternName: item.patternName,
              archetype: profile.archetype,
              archetypeLabelBn: profile.archetypeLabelBn
            }
          };
        })
      );

      const generated = settled.filter(s => s.status === 'fulfilled').map(s => s.value);
      settled.filter(s => s.status === 'rejected').forEach(s => console.error('Note generation failed:', s.reason));
      if (!generated.length) {
        return res.status(500).json({ error: 'AI note generation failed for all items' });
      }

      const savedNotes = [];
      for (const { item, note } of generated) {
        const confused = JSON.stringify(
          [note.comparisonBox?.option1?.name, note.comparisonBox?.option2?.name].filter(Boolean)
        );
        const existing = existingByTopic[item.topic];

        if (existing) {
          const version = existing.version + 1;
          const examsCount = existing.exams_count + 1;
          await q.run(
            `UPDATE study_notes
             SET pattern_type = ?, confused_options_json = ?, note_content_json = ?,
                 version = ?, exams_count = ?, is_resolved = 0, updated_at = CURRENT_TIMESTAMP
             WHERE id = ?`,
            [note.patternType, confused, JSON.stringify(note), version, examsCount, existing.id]
          );
          savedNotes.push({ id: existing.id, ...note, version, examsCount, masteryPercent: existing.mastery_percent });
        } else {
          // Starting mastery reflects this student's past results on the topic
          const h = topicHistory[item.topic];
          const startMastery = h && h.attempts ? Math.max(20, Math.min(60, Math.round((h.correct / h.attempts) * 60))) : 45;
          const { lastID } = await q.run(
            `INSERT INTO study_notes
               (user_id, topic_name, pattern_type, confused_options_json, note_content_json, version, exams_count, mastery_percent)
             VALUES (1, ?, ?, ?, ?, 1, 1, ?)`,
            [note.topicName, note.patternType, confused, JSON.stringify(note), startMastery]
          );
          savedNotes.push({ id: lastID, ...note, version: 1, examsCount: 1, masteryPercent: startMastery });
        }
      }

      res.json({
        success: true,
        profile: { ...profile, insightsBn },
        notes: savedNotes
      });
    } catch (err) {
      console.error('Personalized note generation failed:', err);
      res.status(500).json({ error: 'AI note generation failed', details: err.message });
    }
  });
};