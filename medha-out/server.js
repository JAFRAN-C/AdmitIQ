const express = require('express');
const cors = require('cors');
const Groq = require('groq-sdk');
require('dotenv').config();
const { db, initSchema } = require('./db/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('.')); // serves frontend

// Initialize Database on boot
initSchema().then(() => {
  console.log('AdmitIQ SQLite schema ready.');
}).catch(err => {
  console.error('Database initialization error:', err);
});

// Helper to format questions
function formatQuestions(rows) {
  return rows.map(r => ({
    id: r.id,
    chapterId: r.chapter_id,
    chapterName: r.chapter_name,
    paper: r.paper,
    topicBn: r.topic_bn,
    topicEn: r.topic_en,
    text: r.text_bn,
    options: JSON.parse(r.options_json),
    correct: r.correct_index,
    explanation: r.explanation_bn,
    trap: r.trap_hint_bn
  }));
}

// ─── HELPER: Qwen AI Calling Function ───────────────────────────
async function callQwen(prompt) {
  const qwenApiKey = process.env.QWEN_API_KEY || process.env.DASHSCOPE_API_KEY;
  if (qwenApiKey) {
    const baseUrl = process.env.QWEN_BASE_URL || 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';
    const model = process.env.QWEN_MODEL || 'qwen-plus';
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${qwenApiKey}`
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3
      })
    });
    if (!response.ok) {
      throw new Error(`Qwen API error: ${await response.text()}`);
    }
    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  }

  // Use Groq Qwen model (qwen/qwen3.8-27b)
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('Neither QWEN_API_KEY nor GROQ_API_KEY is configured in .env');
  }
  const groq = new Groq({ apiKey: groqKey });
  const model = process.env.MODEL || 'qwen/qwen3.8-27b';
  const completion = await groq.chat.completions.create({
    model,
    response_format: { type: 'json_object' },
    max_tokens: 3500,
    temperature: 0.3,
    messages: [{ role: 'user', content: prompt }]
  });
  return completion.choices?.[0]?.message?.content || '';
}

// ─── 1. PROFILE API ─────────────────────────────────────────────
app.get('/api/profile', (req, res) => {
  db.get(`SELECT id, name, email, target_exam FROM users WHERE id = 1`, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ user: row || { id: 1, name: 'Sreya', target_exam: 'Medical Admission (MAT)' } });
  });
});

app.post('/api/profile', (req, res) => {
  const { name, target_exam } = req.body;
  db.run(
    `UPDATE users SET name = COALESCE(?, name), target_exam = COALESCE(?, target_exam) WHERE id = 1`,
    [name, target_exam],
    function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, name, target_exam });
    }
  );
});

// ─── 2. CHAPTERS API (HSC Biology 1st & 2nd Paper) ───────────────
app.get('/api/chapters', (req, res) => {
  db.all(`SELECT id, paper, chapter_no, name_bn, name_en, total_mcqs FROM chapters ORDER BY paper, chapter_no`, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const botany = rows.filter(r => r.paper === '1st_paper');
    const zoology = rows.filter(r => r.paper === '2nd_paper');

    res.json({
      chapters: {
        botany,
        zoology
      }
    });
  });
});

// ─── 3. QUESTIONS API (Default 10 MCQs) ──────────────────────────
app.get('/api/questions', (req, res) => {
  const { chapter_id, paper, limit = 10 } = req.query;
  const count = parseInt(limit) || 10;

  if (chapter_id) {
    db.all(`
      SELECT q.id, q.chapter_id, q.topic_bn, q.topic_en, q.text_bn, q.options_json,
             q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name, c.paper
      FROM questions q
      JOIN chapters c ON q.chapter_id = c.id
      WHERE q.chapter_id = ?
      ORDER BY RANDOM() LIMIT ?
    `, [chapter_id, count], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });

      // If chapter has fewer than requested count, fill remaining from same paper so student always gets 10 questions
      if (rows.length < count) {
        const remaining = count - rows.length;
        const existingIds = rows.map(r => r.id);
        const placeholders = existingIds.length ? `AND q.id NOT IN (${existingIds.join(',')})` : '';
        
        db.all(`
          SELECT q.id, q.chapter_id, q.topic_bn, q.topic_en, q.text_bn, q.options_json,
                 q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name, c.paper
          FROM questions q
          JOIN chapters c ON q.chapter_id = c.id
          WHERE c.paper = (SELECT paper FROM chapters WHERE id = ?) ${placeholders}
          ORDER BY RANDOM() LIMIT ?
        `, [chapter_id, remaining], (err2, moreRows) => {
          const combined = [...rows, ...(moreRows || [])];
          return res.json({ questions: formatQuestions(combined) });
        });
      } else {
        return res.json({ questions: formatQuestions(rows) });
      }
    });
  } else {
    // General diagnostic exam (10 questions)
    let sql = `
      SELECT q.id, q.chapter_id, q.topic_bn, q.topic_en, q.text_bn, q.options_json,
             q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name, c.paper
      FROM questions q
      JOIN chapters c ON q.chapter_id = c.id
    `;
    const params = [];
    if (paper) {
      sql += ` WHERE c.paper = ? `;
      params.push(paper);
    }
    sql += ` ORDER BY RANDOM() LIMIT ? `;
    params.push(count);

    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ questions: formatQuestions(rows) });
    });
  }
});

// ─── 4. EXAM SUBMISSION & 7-PATTERN TELEMETRY ────────────────────
app.post('/api/exams/submit', (req, res) => {
  const { chapterId, telemetry } = req.body;

  if (!telemetry || !Array.isArray(telemetry) || telemetry.length === 0) {
    return res.status(400).json({ error: 'telemetry array is required' });
  }

  const totalQuestions = telemetry.length;
  let correctCount = 0;
  let totalTime = 0;
  const patternCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 0: 0 };

  const classifiedItems = telemetry.map(t => {
    totalTime += (t.timeTaken || 0);
    if (t.isCorrect) correctCount++;

    let pattern = 0;

    if (t.finalAnswerIndex === null || t.finalAnswerIndex === undefined) {
      pattern = 7; // Unattempted / Left Blank
    } else if (t.wasSkipped && t.answeredAtEnd) {
      pattern = 6; // Skip & Return at the End (Panic Hesitation)
    } else if (t.switchCount >= 1 && t.isCorrect) {
      pattern = 3; // Switched + Correct (Borderline Ambiguity)
    } else if (t.switchCount >= 1 && !t.isCorrect) {
      pattern = 4; // Switched + Wrong (Distractor Trap)
    } else if (!t.isCorrect && t.timeTaken <= 6 && t.switchCount === 0) {
      pattern = 5; // Fast + Wrong (Confidently Wrong - NEGATIVE MARKING DANGER!)
    } else if (!t.isCorrect && t.timeTaken > 6) {
      pattern = 2; // Slow + Wrong (Foundational Concept Gap)
    } else if (t.isCorrect && t.timeTaken > 6 && t.switchCount === 0) {
      pattern = 1; // Slow + Correct (Memory Decay / Retrieval Hesitation)
    } else {
      pattern = 0; // Mastered (Fast & Correct)
    }

    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    return { ...t, patternType: pattern };
  });

  const accuracy = parseFloat(((correctCount / totalQuestions) * 100).toFixed(1));
  const avgTime = parseFloat((totalTime / totalQuestions).toFixed(1));

  let dominantPattern = 0;
  let maxCount = -1;
  for (let p = 1; p <= 7; p++) {
    if (patternCounts[p] > maxCount && patternCounts[p] > 0) {
      maxCount = patternCounts[p];
      dominantPattern = p;
    }
  }

  db.run(`
    INSERT INTO exam_sessions (user_id, chapter_id, total_questions, score, accuracy, avg_time, dominant_pattern)
    VALUES (1, ?, ?, ?, ?, ?, ?)
  `, [chapterId || null, totalQuestions, correctCount, accuracy, avgTime, dominantPattern], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    const sessionId = this.lastID;

    const insertLog = db.prepare(`
      INSERT INTO telemetry_logs (
        session_id, question_id, time_taken, switch_count, click_path_json,
        was_skipped, answered_at_end, is_correct, pattern_type, first_choice, final_choice
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    classifiedItems.forEach(item => {
      insertLog.run(
        sessionId,
        item.questionId,
        item.timeTaken || 0,
        item.switchCount || 0,
        JSON.stringify(item.clickPath || []),
        item.wasSkipped ? 1 : 0,
        item.answeredAtEnd ? 1 : 0,
        item.isCorrect ? 1 : 0,
        item.patternType,
        item.firstChoiceText || null,
        item.finalChoiceText || null
      );
    });
    insertLog.finalize();

    res.json({
      sessionId,
      totalQuestions,
      correctCount,
      accuracy,
      avgTime,
      dominantPattern,
      patternCounts,
      classifiedItems
    });
  });
});

// ─── 5. LIVING STUDY NOTES GENERATOR (Qwen AI) ───────────────────
app.post('/api/notes/generate', async (req, res) => {
  const { sessionId, items } = req.body;

  let targetItems = items ? items.filter(it => (it.patternType !== undefined ? it.patternType : it.pattern_type) > 0) : null;
  if (!targetItems && sessionId) {
    targetItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, q.text_bn, q.options_json, q.explanation_bn, q.trap_hint_bn, q.topic_bn, q.chapter_id, c.name_bn as chapter_name
        FROM telemetry_logs t
        LEFT JOIN questions q ON t.question_id = q.id
        LEFT JOIN chapters c ON q.chapter_id = c.id
        WHERE t.session_id = ? AND t.pattern_type > 0
      `, [sessionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  if (!targetItems || targetItems.length === 0) {
    return res.json({ message: 'All questions mastered with zero hesitation!', notes: [] });
  }

  // Prioritize patterns needing most urgent intervention (Pattern 5, 4, 3, 6, 2, 1)
  const prioritized = [...targetItems].sort((a, b) => {
    const weights = { 5: 10, 4: 9, 3: 8, 6: 7, 2: 6, 1: 5, 7: 4 };
    return (weights[b.pattern_type || b.patternType] || 0) - (weights[a.pattern_type || a.patternType] || 0);
  }).slice(0, 3);

  const prompt = `You are AdmitIQ's cognitive study note generator for Bangladesh Medical Admission Test (MAT) Biology students.
You analyze student answering behavior and generate structured, living study notes in Bangla.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON. Do not wrap in markdown or backticks.
2. If patternType is 3 or 4 (Switched Options), you MUST generate a "comparisonBox" specifically contrasting the 2 exact options the student hesitated between!
3. If patternType is 5 (Confidently Wrong), issue a strict Negative Marking Alert (-0.25 MAT penalty) explaining why their false assumption was deadly wrong.
4. If patternType is 6 (Skip & Return), provide a 3-second instant recognition cue so their brain doesn't freeze in the exam hall.
5. Write all note content in clear, natural, high-yield Bangla with medical admission mnemonics (মনে রাখার ছন্দ).

SCHEMA:
{
  "notes": [
    {
      "topicName": "string",
      "patternType": 1 to 7,
      "patternName": "string",
      "diagnosis": "string (Why the student hesitated/erred based on telemetry)",
      "coreConcept": "string (Scientific principle in Bangla)",
      "comparisonBox": {
        "option1": { "name": "string", "definition": "string" },
        "option2": { "name": "string", "definition": "string" },
        "keyDifference": "string"
      },
      "memoryTrick": "string (Mnemonic / ছন্দ to lock this in memory)",
      "medicalTrapAlert": "string (How admission exam papers trick students with this)",
      "adaptiveQuestionIdea": "string"
    }
  ]
}

BEHAVIORAL TELEMETRY DATA:
${JSON.stringify(prioritized)}`;

  try {
    const rawOutput = await callQwen(prompt);
    let cleaned = rawOutput.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
    }

    const parsed = JSON.parse(cleaned);
    const generatedNotes = parsed.notes || [];

    const savedNotes = [];
    for (const note of generatedNotes) {
      await new Promise((resolve, reject) => {
        db.run(`
          INSERT INTO study_notes (
            user_id, topic_name, pattern_type, confused_options_json, note_content_json, version, exams_count, mastery_percent
          ) VALUES (1, ?, ?, ?, ?, 1, 1, 45.0)
        `, [
          note.topicName,
          note.patternType,
          JSON.stringify([note.comparisonBox?.option1?.name, note.comparisonBox?.option2?.name].filter(Boolean)),
          JSON.stringify(note)
        ], function(err) {
          if (err) reject(err);
          else {
            savedNotes.push({ id: this.lastID, ...note, version: 1, examsCount: 1, masteryPercent: 45.0 });
            resolve();
          }
        });
      });
    }

    res.json({ success: true, notes: savedNotes });
  } catch (err) {
    console.error('Note generation failed:', err);
    res.status(500).json({ error: 'AI note generation failed', details: err.message });
  }
});

// ─── 6. GET ALL LIVING NOTES WITH EVOLUTION HISTORY ──────────────
app.get('/api/notes', (req, res) => {
  db.all(`
    SELECT id, topic_name, pattern_type, confused_options_json, note_content_json,
           version, exams_count, mastery_percent, is_resolved, updated_at
    FROM study_notes
    ORDER BY updated_at DESC
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const notes = rows.map(r => ({
      id: r.id,
      topicName: r.topic_name,
      patternType: r.pattern_type,
      confusedOptions: JSON.parse(r.confused_options_json || '[]'),
      content: JSON.parse(r.note_content_json || '{}'),
      version: r.version,
      examsCount: r.exams_count,
      masteryPercent: r.mastery_percent,
      isResolved: r.is_resolved === 1,
      updatedAt: r.updated_at
    }));

    res.json({ notes });
  });
});

// ─── 7. ADAPTIVE RETAKE GENERATOR & MASTERY UPDATE ───────────────
app.post('/api/notes/:id/retake', (req, res) => {
  const noteId = req.params.id;

  db.get(`SELECT * FROM study_notes WHERE id = ?`, [noteId], (err, noteRow) => {
    if (err || !noteRow) return res.status(404).json({ error: 'Note not found' });

    const content = JSON.parse(noteRow.note_content_json || '{}');
    const confusedOpts = JSON.parse(noteRow.confused_options_json || '[]');

    db.all(`
      SELECT q.*, c.name_bn as chapter_name
      FROM questions q
      JOIN chapters c ON q.chapter_id = c.id
      ORDER BY RANDOM() LIMIT 5
    `, (err, qRows) => {
      if (err) return res.status(500).json({ error: err.message });

      const retakeQuestions = qRows.map(r => ({
        id: r.id,
        text: r.text_bn,
        options: JSON.parse(r.options_json),
        correct: r.correct_index,
        explanation: r.explanation_bn,
        targetNoteId: noteId,
        isAdaptiveRetake: true
      }));

      res.json({
        noteId,
        topic: noteRow.topic_name,
        version: noteRow.version,
        confusedOptions: confusedOpts,
        questions: retakeQuestions
      });
    });
  });
});

app.post('/api/notes/:id/retake/complete', (req, res) => {
  const noteId = req.params.id;
  const { isPassedWithConfidence } = req.body;

  db.get(`SELECT * FROM study_notes WHERE id = ?`, [noteId], (err, note) => {
    if (err || !note) return res.status(404).json({ error: 'Note not found' });

    const newVersion = note.version + 1;
    const newExamsCount = note.exams_count + 1;
    const newMastery = isPassedWithConfidence ? Math.min(100, note.mastery_percent + 25) : note.mastery_percent;
    const isResolved = newMastery >= 80 ? 1 : 0;

    db.run(`
      UPDATE study_notes
      SET version = ?, exams_count = ?, mastery_percent = ?, is_resolved = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [newVersion, newExamsCount, newMastery, isResolved, noteId], function(err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        success: true,
        noteId,
        version: newVersion,
        examsCount: newExamsCount,
        masteryPercent: newMastery,
        isResolved: isResolved === 1
      });
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`AdmitIQ Medical Admission Platform running on port ${PORT}`);
});
