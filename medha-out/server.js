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

// ─── 5. LIVING STUDY NOTES GENERATOR (personalized) ──────────────
require('./notes-personalized')(app, { db });


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
