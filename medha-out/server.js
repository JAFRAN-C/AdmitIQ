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

  // Use Groq Qwen model (qwen/qwen3.8-27b) with robust fallback
  const groqKey = process.env.GROQ_API_KEY;
  if (!groqKey) {
    throw new Error('Neither QWEN_API_KEY nor GROQ_API_KEY is configured in .env');
  }
  const groq = new Groq({ apiKey: groqKey });
  const model = process.env.MODEL || 'qwen/qwen3.8-27b';

  try {
    const completion = await groq.chat.completions.create({
      model,
      response_format: { type: 'json_object' },
      max_tokens: 950,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });
    return completion.choices?.[0]?.message?.content || '';
  } catch (err) {
    console.warn(`Primary model (${model}) call failed, attempting fallback to openai/gpt-oss-20b:`, err.message);
    const fallbackCompletion = await groq.chat.completions.create({
      model: 'openai/gpt-oss-20b',
      response_format: { type: 'json_object' },
      max_tokens: 900,
      temperature: 0.3,
      messages: [{ role: 'user', content: prompt }]
    });
    return fallbackCompletion.choices?.[0]?.message?.content || '';
  }
}

// ─── 1. AUTHENTICATION & STUDENT PROFILE API ─────────────────────────────
app.post('/api/auth/login', (req, res) => {
  const { name, email, target_college, target_exam, hsc_batch } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });

  const studentName = name.trim();
  const studentEmail = email ? email.trim() : `${studentName.toLowerCase().replace(/\s+/g, '')}@admitiq.edu.bd`;
  const targetCol = target_college || 'Dhaka Medical College (DMC)';
  const targetEx = target_exam || 'Medical Admission Test 2026';
  const batch = hsc_batch || 'HSC 2026';

  db.get(`SELECT * FROM users WHERE id = 1 OR email = ?`, [studentEmail], (err, existing) => {
    if (existing) {
      db.run(`
        UPDATE users
        SET name = ?, email = ?, target_exam = ?, target_college = ?, hsc_batch = ?
        WHERE id = ?
      `, [studentName, studentEmail, targetEx, targetCol, batch, existing.id], function (uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        res.json({
          success: true,
          user: {
            id: existing.id,
            name: studentName,
            email: studentEmail,
            target_exam: targetEx,
            target_college: targetCol,
            hsc_batch: batch
          }
        });
      });
    } else {
      db.run(`
        INSERT INTO users (name, email, target_exam, target_college, hsc_batch)
        VALUES (?, ?, ?, ?, ?)
      `, [studentName, studentEmail, targetEx, targetCol, batch], function (iErr) {
        if (iErr) return res.status(500).json({ error: iErr.message });
        res.json({
          success: true,
          user: {
            id: this.lastID,
            name: studentName,
            email: studentEmail,
            target_exam: targetEx,
            target_college: targetCol,
            hsc_batch: batch
          }
        });
      });
    }
  });
});

app.get('/api/auth/me', (req, res) => {
  db.get(`SELECT id, name, email, target_exam, target_college, hsc_batch FROM users WHERE id = 1`, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({
      user: user || {
        id: 1,
        name: 'Sreya',
        email: 'sreya@admitiq.edu.bd',
        target_exam: 'Medical Admission Test 2026',
        target_college: 'Dhaka Medical College (DMC)',
        hsc_batch: 'HSC 2026'
      }
    });
  });
});

app.get('/api/profile', (req, res) => {
  db.get(`SELECT id, name, email, target_exam, target_college, hsc_batch FROM users WHERE id = 1`, (err, user) => {
    if (err) return res.status(500).json({ error: err.message });
    const currentUser = user || {
      id: 1,
      name: 'Sreya',
      email: 'sreya@admitiq.edu.bd',
      target_exam: 'Medical Admission Test 2026',
      target_college: 'Dhaka Medical College (DMC)',
      hsc_batch: 'HSC 2026'
    };

    // Aggregate statistics across all exam sessions
    db.get(`
      SELECT 
        COUNT(id) as total_exams,
        COALESCE(SUM(total_questions), 0) as total_questions,
        COALESCE(SUM(score), 0) as total_score,
        COALESCE(AVG(accuracy), 0) as avg_accuracy,
        COALESCE(AVG(avg_time), 0) as avg_speed,
        COUNT(DISTINCT chapter_id) as chapters_tested
      FROM exam_sessions
      WHERE user_id = 1
    `, (sErr, stats) => {
      // Fetch full past exams history with chapter names
      db.all(`
        SELECT e.id as session_id, e.chapter_id, e.total_questions, e.score, e.accuracy, e.avg_time,
               e.dominant_pattern, e.created_at,
               c.name_bn as chapter_name, c.paper, c.chapter_no
        FROM exam_sessions e
        LEFT JOIN chapters c ON e.chapter_id = c.id
        WHERE e.user_id = 1
        ORDER BY e.id DESC
      `, (hErr, historyRows) => {
        // Fetch chapter-wise living notes progress
        db.all(`
          SELECT c.id as chapter_id, c.paper, c.chapter_no, c.name_bn as chapter_name,
                 ln.id as note_id, ln.version, ln.exams_count, ln.mastery_percent, ln.updated_at
          FROM chapters c
          LEFT JOIN chapter_living_notes ln ON c.id = ln.chapter_id
          ORDER BY c.paper, c.chapter_no
        `, (pErr, progressRows) => {
          const totalExams = stats?.total_exams || 0;
          const totalQ = stats?.total_questions || 0;
          const totalScore = stats?.total_score || 0;
          const overallAccuracy = totalQ > 0 ? parseFloat(((totalScore / totalQ) * 100).toFixed(1)) : 0;
          const avgSpeed = stats?.avg_speed ? parseFloat(stats.avg_speed.toFixed(1)) : 0;

          res.json({
            user: currentUser,
            stats: {
              totalExams,
              totalQuestions: totalQ,
              totalScore,
              overallAccuracy,
              avgSpeed,
              chaptersTested: stats?.chapters_tested || 0
            },
            history: historyRows || [],
            chapterProgress: progressRows || []
          });
        });
      });
    });
  });
});

app.post('/api/profile', (req, res) => {
  const { name, target_exam, target_college, hsc_batch } = req.body;
  db.run(
    `UPDATE users SET name = COALESCE(?, name), target_exam = COALESCE(?, target_exam), target_college = COALESCE(?, target_college), hsc_batch = COALESCE(?, hsc_batch) WHERE id = 1`,
    [name, target_exam, target_college, hsc_batch],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ success: true, name, target_exam, target_college, hsc_batch });
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
      },
      all: rows
    });
  });
});

// ─── 2.5 CHAPTER-WISE COGNITIVE DNA API ───────────────────────────
app.get('/api/dna/chapters', (req, res) => {
  db.all(`
    SELECT c.id as chapter_id, c.paper, c.chapter_no, c.name_bn as chapter_name, c.total_mcqs,
           COUNT(DISTINCT e.id) as total_exams,
           COUNT(t.id) as total_questions,
           SUM(CASE WHEN t.is_correct = 1 THEN 1 ELSE 0 END) as correct_count,
           SUM(CASE WHEN t.pattern_type = 1 THEN 1 ELSE 0 END) as p1_count,
           SUM(CASE WHEN t.pattern_type = 2 THEN 1 ELSE 0 END) as p2_count,
           SUM(CASE WHEN t.pattern_type = 3 THEN 1 ELSE 0 END) as p3_count,
           SUM(CASE WHEN t.pattern_type = 4 THEN 1 ELSE 0 END) as p4_count,
           SUM(CASE WHEN t.pattern_type = 5 THEN 1 ELSE 0 END) as p5_count,
           SUM(CASE WHEN t.pattern_type = 6 THEN 1 ELSE 0 END) as p6_count,
           SUM(CASE WHEN t.pattern_type = 7 THEN 1 ELSE 0 END) as p7_count,
           SUM(CASE WHEN t.pattern_type = 0 THEN 1 ELSE 0 END) as p0_count,
           (SELECT COUNT(*) FROM study_notes sn WHERE sn.chapter_id = c.id) as notes_count,
           (SELECT AVG(sn.mastery_percent) FROM study_notes sn WHERE sn.chapter_id = c.id) as avg_mastery
    FROM chapters c
    LEFT JOIN questions q ON q.chapter_id = c.id
    LEFT JOIN telemetry_logs t ON t.question_id = q.id
    LEFT JOIN exam_sessions e ON t.session_id = e.id
    GROUP BY c.id
    ORDER BY c.paper, c.chapter_no
  `, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const chapterReports = rows.map(r => {
      const totalQ = r.total_questions || 0;
      const correctQ = r.correct_count || 0;
      const accuracy = totalQ > 0 ? parseFloat(((correctQ / totalQ) * 100).toFixed(1)) : 0;
      
      const patternCounts = {
        1: r.p1_count || 0,
        2: r.p2_count || 0,
        3: r.p3_count || 0,
        4: r.p4_count || 0,
        5: r.p5_count || 0,
        6: r.p6_count || 0,
        7: r.p7_count || 0,
        0: r.p0_count || 0
      };

      let dominantPattern = 0;
      let maxCount = 0;
      for (let p = 1; p <= 7; p++) {
        if (patternCounts[p] > maxCount) {
          maxCount = patternCounts[p];
          dominantPattern = p;
        }
      }
      if (maxCount === 0 && patternCounts[0] > 0) dominantPattern = 0;

      const mastery = r.avg_mastery !== null && r.avg_mastery !== undefined 
        ? parseFloat(r.avg_mastery.toFixed(1)) 
        : (totalQ > 0 ? accuracy : 0);

      return {
        chapterId: r.chapter_id,
        paper: r.paper,
        chapterNo: r.chapter_no,
        chapterName: r.chapter_name,
        totalMcqs: r.total_mcqs || 0,
        totalExams: r.total_exams || 0,
        totalQuestions: totalQ,
        correctCount: correctQ,
        accuracy,
        dominantPattern,
        patternCounts,
        notesCount: r.notes_count || 0,
        masteryPercent: mastery
      };
    });

    res.json({ chapters: chapterReports });
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

// ─── COMPILE CHAPTER LIVING STUDY DOCUMENT (MULTI-EXAM COGNITIVE ENGINE) ───
async function compileChapterLivingNote(targetChapterId, items, sessionId, aiMap = null) {
  if (!targetChapterId) return null;

  return new Promise((resolve) => {
    // 1. Fetch chapter info
    db.get(`SELECT id, paper, chapter_no, name_bn, name_en FROM chapters WHERE id = ?`, [targetChapterId], (cErr, chapter) => {
      if (cErr || !chapter) {
        console.warn('Could not find chapter for ID:', targetChapterId);
        return resolve(null);
      }

      // 2. Fetch existing living note for this chapter
      db.get(`SELECT * FROM chapter_living_notes WHERE chapter_id = ?`, [targetChapterId], (nErr, existingRow) => {
        let prevDoc = {
          version: 0,
          exams_count: 0,
          mastery_percent: 40,
          comparison_table: [],
          danger_traps: [],
          memory_tricks: [],
          uncharted_primers: [],
          mastered_concepts: []
        };

        let isSameSession = false;
        if (existingRow) {
          try {
            prevDoc = {
              version: existingRow.version || 0,
              exams_count: existingRow.exams_count || 0,
              mastery_percent: existingRow.mastery_percent || 40,
              comparison_table: JSON.parse(existingRow.comparison_table_json || '[]'),
              danger_traps: JSON.parse(existingRow.danger_traps_json || '[]'),
              memory_tricks: JSON.parse(existingRow.memory_tricks_json || '[]'),
              uncharted_primers: JSON.parse(existingRow.uncharted_primers_json || '[]'),
              mastered_concepts: JSON.parse(existingRow.mastered_concepts_json || '[]')
            };
            if (existingRow.last_exam_session_id === sessionId) {
              isSameSession = true;
            }
          } catch (e) {
            console.error('Error parsing existing living note JSON:', e);
          }
        }

        const newVersion = isSameSession ? (prevDoc.version || 1) : (prevDoc.version + 1);
        const newExamsCount = isSameSession ? (prevDoc.exams_count || 1) : (prevDoc.exams_count + 1);

        let updatedComparisonTable = [...prevDoc.comparison_table];
        let updatedDangerTraps = [...prevDoc.danger_traps];
        let updatedMemoryTricks = [...prevDoc.memory_tricks];
        let updatedUnchartedPrimers = [...prevDoc.uncharted_primers];
        let updatedMasteredConcepts = [...prevDoc.mastered_concepts];

        items.forEach(item => {
          const qId = item.questionId || item.id;
          const p = item.patternType !== undefined ? item.patternType : item.pattern_type;
          const topic = item.topic || item.topic_bn || chapter.name_bn;
          const qStem = item.questionText || item.text_bn || 'মেডিকেল জীববিজ্ঞান প্রশ্ন';
          const options = item.options || (item.options_json ? JSON.parse(item.options_json) : []);
          const correctAns = (options && item.correctAnswerIndex !== undefined && options[item.correctAnswerIndex])
            ? options[item.correctAnswerIndex]
            : (item.correctAnswerText || 'সঠিক উত্তর');
          const finalChoice = item.finalChoiceText || (item.finalAnswerIndex !== null && options && options[item.finalAnswerIndex]) || 'কোনো অপশন নয়';
          const firstChoice = item.firstChoiceText || '';
          const explanation = item.explanation || item.explanation_bn || `${correctAns} হলো সঠিক বৈজ্ঞানিক তথ্য।`;
          const trapHint = item.trap || item.trap_hint_bn || '';

          // Look for AI enhanced note if available
          const aiNote = aiMap ? aiMap.get(qId) : null;

          // A. RESOLUTION OR REPEAT ESCALATION FOR MISTAKES
          const existingTrapIdx = updatedDangerTraps.findIndex(t => t.questionId === qId || t.stem === qStem);
          if (existingTrapIdx !== -1) {
            if (item.isCorrect && !isSameSession) {
              // RESOLVED IN THIS EXAM! Remove from danger traps and add to mastered concepts
              const resolvedTrap = updatedDangerTraps[existingTrapIdx];
              updatedDangerTraps.splice(existingTrapIdx, 1);
              updatedMasteredConcepts.unshift({
                topic: resolvedTrap.topic || topic,
                stem: qStem,
                resolvedFrom: `Exam ${prevDoc.exams_count || 1} Mistake`,
                resolutionNote: `পূর্ববর্তী পরীক্ষায় ভুল হয়েছিল, তবে অধ্যায় রিটেকে (${newExamsCount}ম পরীক্ষা) শতভাগ সঠিক ও দ্রুত উত্তর দিয়ে আয়ত্ত করা হয়েছে!`,
                speedSec: item.timeTaken || 3.0,
                resolvedAtExam: newExamsCount
              });
            } else if (!item.isCorrect) {
              // REPEATED MISTAKE!
              const trapObj = updatedDangerTraps[existingTrapIdx];
              if (!isSameSession) {
                trapObj.repeatCount = (trapObj.repeatCount || 1) + 1;
                trapObj.isRepeat = true;
              }
              trapObj.lastChoice = finalChoice;
              trapObj.alertLevel = 'DANGER_REPEAT';
              trapObj.lastSessionId = sessionId;
              if (aiNote && aiNote.medicalTrapAlert) trapObj.trap = aiNote.medicalTrapAlert;
            }
          } else if (!item.isCorrect && (p === 5 || p === 4 || p === 2 || p === 7)) {
            // New Danger Trap
            updatedDangerTraps.push({
              questionId: qId,
              topic,
              stem: qStem,
              choice: finalChoice,
              correctChoice: correctAns,
              trap: (aiNote && aiNote.medicalTrapAlert) || trapHint || explanation,
              isRepeat: false,
              repeatCount: 1,
              patternType: p,
              speedSec: item.timeTaken,
              alertLevel: p === 5 ? 'CONFIDENT_ERROR' : 'TRAP_ERROR',
              lastSessionId: sessionId
            });
          }

          // B. UNIFIED COMPARISON TABLE (Pattern 3 & 4: Option Switches)
          if (p === 3 || p === 4) {
            const compIdx = updatedComparisonTable.findIndex(c => c.questionId === qId || c.topic === topic);
            const compItem = {
              questionId: qId,
              topic,
              option1: (aiNote && aiNote.comparisonBox?.option2?.name) || firstChoice || 'বিভ্রান্তিকর অপশন',
              option2: (aiNote && aiNote.comparisonBox?.option1?.name) || finalChoice || correctAns,
              correctOption: correctAns,
              keyDiff: (aiNote && aiNote.comparisonBox?.keyDifference) || trapHint || `${correctAns} সঠিক কারণ এটি সরাসরি ${topic}-এর কার্যপ্রণালীর সাথে জড়িত।`,
              isResolved: p === 3,
              status: p === 3 ? 'দ্বিধাগ্রস্ত নির্ভুল (Resolved)' : 'ফাঁদে বিভ্রান্তি (Active Confusion)',
              lastExam: newExamsCount
            };
            if (compIdx !== -1) {
              updatedComparisonTable[compIdx] = compItem;
            } else {
              updatedComparisonTable.push(compItem);
            }
          } else if (item.isCorrect && item.switchCount === 0) {
            const compIdx = updatedComparisonTable.findIndex(c => c.questionId === qId);
            if (compIdx !== -1) {
              updatedComparisonTable[compIdx].isResolved = true;
              updatedComparisonTable[compIdx].status = 'রিটেকে সফলভাবে স্পষ্টকৃত ✅';
            }
          }

          // C. MEMORY MNEMONICS (Patterns 1 & 2: Latency > 6s)
          if (p === 1 || p === 2) {
            const memIdx = updatedMemoryTricks.findIndex(m => m.topic === topic);
            const memObj = {
              topic,
              latencySec: item.timeTaken,
              mnemonic: (aiNote && aiNote.memoryTrick) || trapHint || `💡 দ্রুত স্মৃতির ছন্দ: "${topic}" মনে রাখতে "${correctAns}"-এর মূল কি-ওয়ার্ড মনে রাখুন।`,
              speedTrigger: `⚡ ৩-সেকেন্ড ইনস্ট্যান্ট হুক: "${topic}" দেখলেই সরাসরি "${correctAns}" রিকল করুন।`
            };
            if (memIdx !== -1) {
              updatedMemoryTricks[memIdx] = memObj;
            } else {
              updatedMemoryTricks.push(memObj);
            }
          }

          // D. UNCHARTED PRIMERS (Pattern 7: Unattempted)
          if (p === 7) {
            const unIdx = updatedUnchartedPrimers.findIndex(u => u.questionId === qId || u.topic === topic);
            const unObj = {
              questionId: qId,
              topic,
              stem: qStem,
              primerText: `📖 অ্যাডমিশন মাস্ট-নো প্রাইমার: "${qStem}"—এর সঠিক উত্তর হলো "${correctAns}"।`,
              keyFacts: (aiNote && aiNote.coreConcept) || explanation
            };
            if (unIdx === -1) {
              updatedUnchartedPrimers.push(unObj);
            }
          } else {
            const unIdx = updatedUnchartedPrimers.findIndex(u => u.questionId === qId);
            if (unIdx !== -1) {
              updatedUnchartedPrimers.splice(unIdx, 1);
            }
          }

          // E. MASTERED CONCEPTS (Pattern 0)
          if (p === 0 && item.isCorrect) {
            const hasMastered = updatedMasteredConcepts.some(m => m.topic === topic);
            if (!hasMastered) {
              updatedMasteredConcepts.push({
                topic,
                stem: qStem,
                speedSec: item.timeTaken,
                resolvedFrom: 'First-Attempt Instant Recall',
                resolutionNote: '৬ সেকেন্ডের মধ্যে কোনো দ্বিধা ছাড়া নির্ভুল উত্তর।'
              });
            }
          }
        });

        // Calculate Mastery Percentage
        const totalTracked = updatedComparisonTable.length + updatedDangerTraps.length + updatedMasteredConcepts.length;
        const resolvedTracked = updatedMasteredConcepts.length + updatedComparisonTable.filter(c => c.isResolved).length;
        let calculatedMastery = 45;
        if (totalTracked > 0) {
          calculatedMastery = Math.min(100, Math.max(30, Math.round((resolvedTracked / totalTracked) * 100)));
        }

        db.run(`
          INSERT INTO chapter_living_notes (
            user_id, chapter_id, paper, chapter_no, title_bn, version, exams_count, mastery_percent,
            comparison_table_json, danger_traps_json, memory_tricks_json, uncharted_primers_json,
            mastered_concepts_json, last_exam_session_id, updated_at
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(chapter_id) DO UPDATE SET
            version = excluded.version,
            exams_count = excluded.exams_count,
            mastery_percent = excluded.mastery_percent,
            comparison_table_json = excluded.comparison_table_json,
            danger_traps_json = excluded.danger_traps_json,
            memory_tricks_json = excluded.memory_tricks_json,
            uncharted_primers_json = excluded.uncharted_primers_json,
            mastered_concepts_json = excluded.mastered_concepts_json,
            last_exam_session_id = excluded.last_exam_session_id,
            updated_at = CURRENT_TIMESTAMP
        `, [
          targetChapterId,
          chapter.paper,
          chapter.chapter_no,
          chapter.name_bn,
          newVersion,
          newExamsCount,
          calculatedMastery,
          JSON.stringify(updatedComparisonTable),
          JSON.stringify(updatedDangerTraps),
          JSON.stringify(updatedMemoryTricks),
          JSON.stringify(updatedUnchartedPrimers),
          JSON.stringify(updatedMasteredConcepts),
          sessionId
        ], function (insErr) {
          if (insErr) {
            console.error('Error updating chapter_living_notes:', insErr);
            return resolve(null);
          }

          resolve({
            id: this.lastID || (existingRow ? existingRow.id : null),
            chapterId: targetChapterId,
            paper: chapter.paper,
            chapterNo: chapter.chapter_no,
            titleBn: chapter.name_bn,
            version: newVersion,
            examsCount: newExamsCount,
            masteryPercent: calculatedMastery,
            comparisonTable: updatedComparisonTable,
            dangerTraps: updatedDangerTraps,
            memoryTricks: updatedMemoryTricks,
            unchartedPrimers: updatedUnchartedPrimers,
            masteredConcepts: updatedMasteredConcepts,
            lastExamSessionId: sessionId
          });
        });
      });
    });
  });
}

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
    const hasAnswer = t.finalAnswerIndex !== null && t.finalAnswerIndex !== undefined;
    const wasSkipped = Boolean(t.wasSkipped);
    const answeredAtEnd = Boolean(t.answeredAtEnd || t.answeredAfterSkip);

    // Pattern 7: Unattempted / Missed Topic (Left blank, timed out, or skipped and never answered/confirmed)
    if (!hasAnswer || (wasSkipped && !answeredAtEnd)) {
      pattern = 7;
    }
    // Pattern 6: Skipped initially, but came back and answered at the end
    else if (wasSkipped && answeredAtEnd) {
      pattern = 6;
    }
    // Pattern 3: Switched options and got it right
    else if (t.switchCount >= 1 && t.isCorrect) {
      pattern = 3;
    }
    // Pattern 4: Switched options and got it wrong
    else if (t.switchCount >= 1 && !t.isCorrect) {
      pattern = 4;
    }
    // Pattern 5: Confidently Wrong (<=6s, 0 switches, was NEVER skipped, and wrong!)
    else if (!t.isCorrect && t.timeTaken <= 6 && t.switchCount === 0 && !wasSkipped) {
      pattern = 5;
    }
    // Pattern 2: Slow + Wrong (>6s, 0 switches, wrong)
    else if (!t.isCorrect && t.timeTaken > 6 && t.switchCount === 0) {
      pattern = 2;
    }
    // Pattern 1: Slow + Correct (>6s, 0 switches, right)
    else if (t.isCorrect && t.timeTaken > 6 && t.switchCount === 0) {
      pattern = 1;
    }
    // Pattern 0: Mastered (<=6s, 0 switches, right, never skipped)
    else {
      pattern = 0;
    }

    patternCounts[pattern] = (patternCounts[pattern] || 0) + 1;
    return { ...t, patternType: pattern };
  });

  const accuracy = parseFloat(((correctCount / totalQuestions) * 100).toFixed(1));
  const avgTime = parseFloat((totalTime / totalQuestions).toFixed(1));

  let dominantPattern = 0;
  let maxCount = 0;
  for (let p = 1; p <= 7; p++) {
    if (patternCounts[p] > maxCount) {
      maxCount = patternCounts[p];
      dominantPattern = p;
    }
  }
  if (maxCount === 0 && patternCounts[0] > 0) {
    dominantPattern = 0; // All mastered
  }

  db.run(`
    INSERT INTO exam_sessions (user_id, chapter_id, total_questions, score, accuracy, avg_time, dominant_pattern)
    VALUES (1, ?, ?, ?, ?, ?, ?)
  `, [chapterId || null, totalQuestions, correctCount, accuracy, avgTime, dominantPattern], function (err) {
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
        (item.answeredAtEnd || item.answeredAfterSkip) ? 1 : 0,
        item.isCorrect ? 1 : 0,
        item.patternType,
        item.firstChoiceText || null,
        item.finalChoiceText || null
      );
    });
    insertLog.finalize();

    // ─── BUILD 5-BOX STRUCTURED STUDY NOTES FROM SESSION TELEMETRY ───
    const compTable = [];
    const dangerTraps = [];
    const memoryTricks = [];
    const unchartedPrimers = [];
    const masteredConcepts = [];

    classifiedItems.forEach(item => {
      const p = item.patternType;
      const qStem = item.questionText || item.text_bn || 'মেডিকেল জীববিজ্ঞান প্রশ্ন';
      const topic = item.topic || item.topic_bn || item.chapterName || 'জীববিজ্ঞান';
      const options = item.options || [];
      const correctAns = (options && item.correctAnswerIndex !== undefined && options[item.correctAnswerIndex])
        ? options[item.correctAnswerIndex]
        : (item.correctAnswerText || 'সঠিক উত্তর');
      const finalChoice = item.finalChoiceText || (item.finalAnswerIndex !== null && options && options[item.finalAnswerIndex]) || 'কোনো অপশন নয়';
      const firstChoice = item.firstChoiceText || '';
      const explanation = item.explanation || item.explanation_bn || `${correctAns} হলো সঠিক বৈজ্ঞানিক তথ্য।`;
      const trap = item.trap || item.trap_hint_bn || '';

      // Box 1: Option Hesitation Table (Pattern 3 & 4)
      if (p === 3 || p === 4) {
        compTable.push({
          questionId: item.questionId,
          topic,
          stem: qStem,
          option1: firstChoice || 'বিভ্রান্তিকর অপশন',
          option2: finalChoice || correctAns,
          correctOption: correctAns,
          keyDiff: trap || `${correctAns} সঠিক উত্তর কারণ এটি সরাসরি ${topic}-এর সাথে জড়িত।`,
          isResolved: p === 3,
          status: p === 3 ? 'দ্বিধা সত্ত্বেও সঠিক ✅' : 'ফাঁদে বিভ্রান্তি ⚠️'
        });
      }

      // Box 2: Fast Careless Mistakes & Traps (Pattern 5, 4, 2, 7 when wrong)
      if (!item.isCorrect && (p === 5 || p === 4 || p === 2 || p === 7)) {
        dangerTraps.push({
          questionId: item.questionId,
          topic,
          stem: qStem,
          choice: finalChoice,
          correctChoice: correctAns,
          trap: trap || explanation || 'বিভ্রান্তিকর অপশনের ফাঁদে পড়ে ভুল হয়েছে।',
          isRepeat: false,
          repeatCount: 1,
          speedSec: item.timeTaken,
          alertLevel: p === 5 ? 'FAST_MISTAKE' : 'CARELESS_ERROR'
        });
      }

      // Box 3: Memory Mnemonics for Latency > 6s (Pattern 1 & 2)
      if (p === 1 || p === 2) {
        memoryTricks.push({
          topic,
          stem: qStem,
          latencySec: item.timeTaken,
          mnemonic: trap ? `💡 মনে রাখার সহজ ছন্দ: ${trap}` : `💡 মনে রাখার সহজ টেকনিক: "${topic}" মনে রাখতে "${correctAns}"-এর মূল কি-ওয়ার্ড মনে রাখুন।`,
          speedTrigger: `⚡ ৫-সেকেন্ডে রিকল করার কৌশল: "${topic}" দেখলেই সরাসরি "${correctAns}" মনে করুন।`
        });
      }

      // Box 4: Skipped Questions (Pattern 7 & 6)
      if (p === 7 || (p === 6 && item.wasSkipped)) {
        unchartedPrimers.push({
          questionId: item.questionId,
          topic,
          stem: qStem,
          primerText: `📖 এই প্রশ্নের জন্য আবশ্যকীয় তথ্য: "${qStem}"-এর সঠিক উত্তর হলো "${correctAns}"।`,
          keyFacts: explanation
        });
      }

      // Box 5: Mastered Concepts (Pattern 0)
      if (p === 0 && item.isCorrect) {
        masteredConcepts.push({
          topic,
          stem: qStem,
          speedSec: item.timeTaken,
          resolvedFrom: 'First-Attempt Instant Recall',
          resolutionNote: `${item.timeTaken} সেকেন্ডে কোনো দ্বিধা ছাড়া শতভাগ নির্ভুল উত্তর!`
        });
      }
    });

    const sessionNotes = {
      titleBn: 'এই পরীক্ষার স্মার্ট রিভিশন নোট',
      version: 1,
      examsCount: 1,
      masteryPercent: accuracy,
      comparisonTable: compTable,
      dangerTraps: dangerTraps,
      memoryTricks: memoryTricks,
      unchartedPrimers: unchartedPrimers,
      masteredConcepts: masteredConcepts
    };

    // Determine target chapter for living note compilation
    const targetChapterId = chapterId || (classifiedItems[0] && (classifiedItems[0].chapterId || classifiedItems[0].chapter_id)) || null;

    if (targetChapterId) {
      compileChapterLivingNote(targetChapterId, classifiedItems, sessionId)
        .then(livingDoc => {
          res.json({
            sessionId,
            totalQuestions,
            correctCount,
            accuracy,
            avgTime,
            dominantPattern,
            patternCounts,
            classifiedItems,
            sessionNotes,
            chapterLivingNote: livingDoc || sessionNotes
          });
        })
        .catch(cErr => {
          console.error('Error compiling chapter living note on submit:', cErr);
          res.json({
            sessionId,
            totalQuestions,
            correctCount,
            accuracy,
            avgTime,
            dominantPattern,
            patternCounts,
            classifiedItems,
            sessionNotes,
            chapterLivingNote: sessionNotes
          });
        });
    } else {
      res.json({
        sessionId,
        totalQuestions,
        correctCount,
        accuracy,
        avgTime,
        dominantPattern,
        patternCounts,
        classifiedItems,
        sessionNotes,
        chapterLivingNote: sessionNotes
      });
    }
  });
});

// ─── HELPER: Deterministic Rule-Based Note Generator for 7 Patterns ───
function buildDeterministicNote(item) {
  const patternType = parseInt(item.patternType || item.pattern_type || 7);
  const qText = item.questionText || item.text_bn || 'জীববিজ্ঞান প্রশ্ন';
  const options = item.options || (item.options_json ? JSON.parse(item.options_json) : []);
  const correctIdx = item.correctAnswerIndex !== undefined ? item.correctAnswerIndex : item.correct_index;
  const correctText = (options && correctIdx !== undefined && options[correctIdx]) ? options[correctIdx] : (item.correctAnswerText || 'সঠিক উত্তর');
  const topic = item.topic || item.topic_bn || item.chapterName || 'জীববিজ্ঞান ধারণা';
  const explanation = item.explanation || item.explanation_bn || `${correctText} হলো এই প্রশ্নের সঠিক বৈজ্ঞানিক তথ্য।`;
  const trapHint = item.trap || item.trap_hint_bn || '';
  const firstChoice = item.firstChoiceText || (item.clickPath && item.clickPath[0]) || '';
  const finalChoice = item.finalChoiceText || (item.finalAnswerIndex !== null && options && options[item.finalAnswerIndex]) || 'কোনো অপশন নয়';
  const timeSec = item.timeTaken || 1;

  let patternName = '';
  let behaviorSummary = '';
  let diagnosis = '';
  let coreConcept = explanation;
  let comparisonBox = null;
  let memoryTrick = '';
  let medicalTrapAlert = '';

  switch (patternType) {
    case 1: // Slow + Correct (>6s, 0 switch, Correct)
      patternName = 'Slow + Correct (স্মৃতি মন্থর / Memory Fade)';
      behaviorSummary = `সময় বেশি লেগেছে (${timeSec} সে. > ৬ সে.), কোনো অপশন পরিবর্তন না করেই সঠিক উত্তর (${correctText}) দিয়েছেন।`;
      diagnosis = `টপিকটি আপনার জানা আছে, কিন্তু পরীক্ষার চাপে মস্তিষ্ক থেকে দ্রুত তথ্য রিকল করতে দেরি হচ্ছে। মেডিকেল ভর্তি পরীক্ষায় প্রতি এমসিকিউ-তে মাত্র ৩৬-৪০ সেকেন্ড সময় পাওয়া যায়; তাই এই ধরনের বিলম্ব পরীক্ষার শেষ অংশে মারাত্মক সময় সংকট তৈরি করবে।`;
      memoryTrick = trapHint ? `💡 দ্রুত স্মৃতির কৌশল: "${trapHint}" মনে রাখুন।` : `💡 ৩-সেকেন্ড স্পিড হুক: "${topic}" দেখলেই সরাসরি "${correctText}" রিকল করার অভ্যাস গড়ে তুলুন।`;
      medicalTrapAlert = `ধীরগতির কারণে শেষের সহজ প্রশ্নগুলোর জন্য সময় কম পড়তে পারে। সময় নিয়ন্ত্রণে বেশি নজর দিন।`;
      break;

    case 2: // Slow + Wrong (>6s, 0 switch, Wrong)
      patternName = 'Slow + Wrong (কনসেপ্ট অস্পষ্ট / Concept Gap)';
      behaviorSummary = `সময় বেশি লেগেছে (${timeSec} সে.) এবং ভুল অপশন (${finalChoice}) নির্বাচন করেছেন।`;
      diagnosis = `টপিকটিতে মৌলিক ধারণার স্পষ্ট ঘাটতি রয়েছে। যথেষ্ট সময় নিয়েও সঠিক উত্তর না আসা নির্দেশ করে বিষয়টি পুনরায় মূল পাঠ্যবই থেকে পড়া আবশ্যক।`;
      memoryTrick = trapHint ? `💡 কনসেপ্ট স্পষ্টীকরণ: ${trapHint}` : `💡 মূল ভিত্তি: ${explanation}`;
      medicalTrapAlert = `অস্পষ্ট ধারণা নিয়ে বেশি সময় নষ্ট করা এবং ভুল দাগানো মেডিকেল পরীক্ষায় দ্বিগুণ ক্ষতি (-০.২৫ মার্কস কাটা ও সময় অপচয়)।`;
      break;

    case 3: // Switched + Correct (>=1 switch, Correct)
      patternName = 'Switched + Correct (দ্বিধাগ্রস্ত নির্ভুল / Ambiguity Hesitation)';
      behaviorSummary = `অপশন পরিবর্তন: '${firstChoice || 'অন্য অপশন'}' থেকে '${finalChoice}' এ সুইচ করে অবশেষে সঠিক উত্তর দিয়েছেন।`;
      diagnosis = `সঠিক উত্তর দিতে পারলেও দুটি অপশনের মধ্যে সূক্ষ্ম তফাত না বোঝায় তীব্র দ্বিধাদ্বন্দ্বে ভুগছিলেন। এই অনিশ্চয়তা পরবর্তী পরীক্ষায় ভুল সিদ্ধান্তের কারণ হতে পারে।`;
      comparisonBox = {
        option1: {
          name: finalChoice || correctText,
          definition: explanation
        },
        option2: {
          name: firstChoice || 'বিভ্রান্তিকর অপশন',
          definition: trapHint || 'শিক্ষার্থীদের বিভ্রান্ত করার জন্য সাধারণ অল্টারনেটিভ অপশন।'
        },
        keyDifference: trapHint || `সঠিক উত্তর "${finalChoice}" সরাসরি ${topic} এর মূল বৈশিষ্ট্য বহন করে, অপর অপশনটি নয়।`
      };
      memoryTrick = `💡 দুইয়ের তফাত মনে রাখার ছন্দ: ${trapHint || 'দুটো অপশনের কার্যপদ্ধতি সম্পূর্ণ আলাদা।'}`;
      medicalTrapAlert = `মেডিকেল ভর্তি পরীক্ষায় প্রশ্নকর্তারা প্রায়ই এমন অপশন পাশাপাশি রাখেন যা একই অধ্যায়ের দুটি কাছাকাছি বিষয়কে নির্দেশ করে।`;
      break;

    case 4: // Switched + Wrong (>=1 switch, Wrong)
      patternName = 'Switched + Wrong (ফাঁদে বিভ্রান্তি / Distractor Trap)';
      behaviorSummary = `অপশন পরিবর্তন করে '${finalChoice}' বেছে নিয়েছেন এবং উত্তরটি ভুল হয়েছে (সঠিক ছিল: ${correctText})।`;
      diagnosis = `প্রশ্নকর্তার সাজানো বিভ্রান্তিকর ফাঁদে (Distractor Trap) পা দিয়েছেন। সঠিক উত্তরের কাছাকাছি পৌঁছালেও ভুল কনসেপ্টের প্ররোচনায় ভুল অপশনটি বেছে নিয়েছেন।`;
      comparisonBox = {
        option1: {
          name: `${correctText} (সঠিক উত্তর)`,
          definition: explanation
        },
        option2: {
          name: `${finalChoice} (আপনার বেছে নেওয়া ফাঁদ)`,
          definition: trapHint || 'একটি প্রচলিত বিভ্রান্তিকর ভুল ধারণা।'
        },
        keyDifference: trapHint || `সঠিক "${correctText}" যেখানে মূল কার্য সম্পন্ন করে, সেখানে "${finalChoice}" ভিন্ন শারীরবৃত্তীয় প্রক্রিয়ার সাথে জড়িত।`
      };
      medicalTrapAlert = `⚠️ ফাঁদ বিশ্লেষণ: মেডিকেল ভর্তি পরীক্ষায় এমন অপশন থাকে যা প্রথম দেখায় সঠিক মনে হয়। প্রতিটি শব্দের সূক্ষ্ম অর্থ মনে রাখা জরুরি।`;
      memoryTrick = `💡 ট্র্যাপ এড়ানোর ছন্দ: ${trapHint || explanation}`;
      break;

    case 5: // Fast + Wrong (<=6s, 0 switch, Wrong, never skipped)
      patternName = 'Fast + Wrong (ভুল আত্মবিশ্বাস / Confidently Wrong)';
      behaviorSummary = `মাত্র ${timeSec} সেকেন্ডের মধ্যে অতি দ্রুত ভুল অপশন '${finalChoice}' দাগিয়েছেন। (সঠিক: ${correctText})`;
      diagnosis = `মারাত্মক ভুল আত্মবিশ্বাস! প্রশ্নটি সম্পূর্ণ মনোযোগ সহকারে না পড়েই প্রচলিত ধারণার বশবর্তী হয়ে অতি দ্রুত দাগিয়ে ফেলেছেন। মেডিকেল ভর্তি পরীক্ষায় এই জাতীয় ভুল -০.২৫ নেগেটিভ মার্কিং এনে পুরো র‍্যাংকিং পিছিয়ে দেয়।`;
      medicalTrapAlert = `🚨 নেগেটিভ মার্কিং অ্যালার্ট (-০.২৫ Penalty): প্রশ্নকর্তার ফাঁদ ছিল অতি পরিচিত একটি ভুলের পুনরাবৃত্তি করানো। লক্ষ্য করুন: ${trapHint || explanation}`;
      memoryTrick = `💡 অতিরিক্ত আত্মবিশ্বাস নিয়ন্ত্রণের নিয়ম: কোনো প্রশ্ন সহজ মনে হলেও অন্তত ৪ সেকেন্ড সময় নিয়ে 'ব্যতিক্রম' বা 'কোনটি নয়' আছে কি না নিশ্চিত হয়ে দাগান।`;
      break;

    case 6: // Skip & Return (wasSkipped=true, answeredAtEnd=true)
      patternName = 'Skip & Return (আতঙ্কজনিত স্কিপ / Panic Blank)';
      behaviorSummary = `প্রথম দর্শনে প্রশ্নটি ভয় পেয়ে স্কিপ করেছিলেন, কিন্তু পরীক্ষার শেষ ভাগে এসে উত্তর দিয়েছেন।`;
      diagnosis = `পরীক্ষার শুরুতে সাময়িক স্মৃতিবিলোপ (Memory Freeze) বা আত্মবিশ্বাসের অভাবের লক্ষণ। মেডিকেল হলে বিপুল মানসিক চাপে এই প্রশ্নগুলোতে সময় না পেয়ে ছেড়ে আসার ঝুঁকি থাকে।`;
      memoryTrick = `⚡ ৩-সেকেন্ড ইনস্ট্যান্ট রিকল হুক: "${topic}" দেখা মাত্রই "${correctText}" মনে পড়ার ছন্দ: ${trapHint || explanation}`;
      medicalTrapAlert = `পরীক্ষায় প্রশ্ন দেখে ভয় পেলে গভীর শ্বাস নিয়ে মূল কী-ওয়ার্ডে ফোকাস করুন।`;
      break;

    case 7: // Unattempted / Missed (never answered or skipped and left unanswered)
    default:
      patternName = 'Unattempted / Missed (অস্পর্শিত বিষয় / Uncharted Topic)';
      behaviorSummary = `প্রশ্নটির কোনো উত্তর দেওয়া হয়নি বা স্পর্শ না করে স্কিপ করে গেছেন।`;
      diagnosis = `এই টপিকটি আপনার সম্পূর্ণ অপঠিত বা ধারণার অভাবে উত্তর দেওয়ার সাহস পাননি। মেডিকেল ভর্তি পরীক্ষায় কোনো প্রশ্ন আনঅ্যাটেম্পটেড রাখা মানে সরাসরি পিছিয়ে পড়া।`;
      coreConcept = `📖 অ্যাডমিশন মাস্ট-নো প্রাইমার: "${qText}"—এর সঠিক উত্তর হলো "${correctText}"। বৈজ্ঞানিক ব্যাখ্যা: ${explanation}`;
      medicalTrapAlert = `এই টপিকটি (${topic}) মেডিকেল ভর্তি পরীক্ষায় উচ্চ গুরুত্বসম্পন্ন (High-Yield)। অবহেলা না করে আজই পাঠ্যবই থেকে রিভিশন দিন।`;
      memoryTrick = trapHint ? `💡 দ্রুত আয়ত্ত করার টেকনিক: ${trapHint}` : `💡 মনে রাখার মূল তথ্য: ${explanation}`;
      break;
  }

  return {
    questionId: item.questionId || item.id,
    topicName: topic,
    patternType,
    patternName,
    examQuestionExcerpt: qText,
    studentBehaviorSummary: behaviorSummary,
    diagnosis,
    coreConcept,
    comparisonBox,
    memoryTrick,
    medicalTrapAlert,
    adaptiveQuestionIdea: `পরবর্তী রিটেকে ${topic} এর ওপর বিশেষ এমসিকিউ দিয়ে জ্ঞান যাচাই করা হবে।`
  };
}

// ─── 5. LIVING STUDY NOTES GENERATOR (Qwen AI + Resilient Cognitive Engine) ───
app.post('/api/notes/generate', async (req, res) => {
  const { sessionId, items } = req.body;

  let targetItems = items ? items.filter(it => (it.patternType !== undefined ? it.patternType : it.pattern_type) >= 0) : null;
  if (!targetItems && sessionId) {
    targetItems = await new Promise((resolve, reject) => {
      db.all(`
        SELECT t.*, q.text_bn, q.options_json, q.explanation_bn, q.trap_hint_bn, q.topic_bn, q.chapter_id, c.name_bn as chapter_name
        FROM telemetry_logs t
        LEFT JOIN questions q ON t.question_id = q.id
        LEFT JOIN chapters c ON q.chapter_id = c.id
        WHERE t.session_id = ?
      `, [sessionId], (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  if (!targetItems || targetItems.length === 0) {
    return res.json({ message: 'No questions in exam session', notes: [] });
  }

  // Enrich target items with question table info from SQLite
  const questionIds = targetItems.map(it => it.questionId || it.question_id).filter(Boolean);
  if (questionIds.length > 0) {
    const qDetails = await new Promise((resolve) => {
      const placeholders = questionIds.map(() => '?').join(',');
      db.all(`
        SELECT q.id, q.chapter_id, q.topic_bn, q.text_bn, q.options_json,
               q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name, c.paper
        FROM questions q
        LEFT JOIN chapters c ON q.chapter_id = c.id
        WHERE q.id IN (${placeholders})
      `, questionIds, (err, rows) => {
        if (err || !rows) resolve(new Map());
        else {
          const map = new Map();
          rows.forEach(r => map.set(r.id, r));
          resolve(map);
        }
      });
    });

    targetItems = targetItems.map(it => {
      const qId = it.questionId || it.question_id;
      const details = qDetails.get(qId);
      if (details) {
        return {
          ...it,
          questionId: qId,
          questionText: details.text_bn || it.questionText,
          options: details.options_json ? JSON.parse(details.options_json) : it.options,
          correctAnswerIndex: details.correct_index !== undefined ? details.correct_index : it.correctAnswerIndex,
          explanation: details.explanation_bn || it.explanation,
          trap: details.trap_hint_bn || it.trap,
          topic: details.topic_bn || it.topic,
          chapterId: details.chapter_id || it.chapterId,
          chapterName: details.chapter_name || it.chapterName,
          paper: details.paper || it.paper
        };
      }
      return it;
    });
  }

  // Pre-generate deterministic notes for ALL questions in the exam
  const allNotes = targetItems.map(item => buildDeterministicNote(item));

  // Prioritize top 3 distinct cognitive friction items to enhance with Qwen AI
  const patternBuckets = {};
  targetItems.forEach(item => {
    const p = item.patternType !== undefined ? item.patternType : item.pattern_type;
    if (p > 0) {
      if (!patternBuckets[p]) patternBuckets[p] = [];
      patternBuckets[p].push(item);
    }
  });

  const prioritized = [];
  const priorityOrder = [5, 4, 3, 6, 2, 7, 1];
  for (const p of priorityOrder) {
    if (patternBuckets[p] && patternBuckets[p].length > 0) {
      prioritized.push(patternBuckets[p][0]);
    }
    if (prioritized.length >= 3) break;
  }

  if (prioritized.length < 3) {
    for (const item of targetItems) {
      if ((item.patternType || item.pattern_type) > 0 && !prioritized.find(p => (p.questionId || p.id) === (item.questionId || item.id))) {
        prioritized.push(item);
      }
      if (prioritized.length >= 3) break;
    }
  }

  let finalNotesToSave = allNotes;

  if (prioritized.length > 0) {
    const formattedItemsForPrompt = prioritized.map(item => ({
      questionId: item.questionId || item.id,
      questionText: item.questionText || item.text_bn,
      options: item.options || (item.options_json ? JSON.parse(item.options_json) : []),
      correctAnswerText: (item.options && item.correctAnswerIndex !== undefined) ? item.options[item.correctAnswerIndex] : (item.finalChoiceText || 'সঠিক উত্তর'),
      studentFirstChoice: item.firstChoiceText || 'None',
      studentFinalChoice: item.finalChoiceText || (item.finalAnswerIndex !== null && item.options ? item.options[item.finalAnswerIndex] : 'Skipped / Unattempted'),
      timeTakenSeconds: item.timeTaken,
      patternType: item.patternType || item.pattern_type,
      topic: item.topic || item.topic_bn || 'Biology',
      chapterName: item.chapterName || item.chapter_name || 'Biology'
    }));

    const prompt = `You are AdmitIQ's cognitive study note generator for Bangladesh Medical Admission Test (MAT) Biology students.
Analyze the student's answering behavior below and generate personalized, living study notes in Bangla.

CRITICAL INSTRUCTIONS:
1. Respond ONLY with valid JSON. Do not wrap in markdown or backticks.
2. The notes MUST be directly derived from the student's actual exam questions and telemetry provided below.
3. For Pattern 3 & 4 (Switched Options): You MUST generate a "comparisonBox" specifically contrasting the 2 exact options the student hesitated between!
4. For Pattern 5 (Confidently Wrong): Issue a strict Negative Marking Alert (-0.25 MAT penalty) explaining why their rapid assumption was deadly wrong.
5. For Pattern 7 (Unattempted / Skipped): Explain the high-yield core facts of this skipped topic so they never skip it in the real admission test.
6. For Pattern 1 (Slow + Correct): Provide an instant recognition mnemonic (মনে রাখার ছন্দ) so they recall it under 5 seconds.
7. For Pattern 6 (Skip & Return): Provide a 3-second instant recall hook to eliminate exam freeze.
8. Write all note content in clear, natural, high-yield Bangla with medical admission mnemonics (মনে রাখার ছন্দ).

SCHEMA:
{
  "notes": [
    {
      "questionId": 0,
      "topicName": "string",
      "patternType": 1 to 7,
      "patternName": "string",
      "examQuestionExcerpt": "string (Question stem in Bangla)",
      "studentBehaviorSummary": "string",
      "diagnosis": "string",
      "coreConcept": "string",
      "comparisonBox": {
        "option1": { "name": "string", "definition": "string" },
        "option2": { "name": "string", "definition": "string" },
        "keyDifference": "string"
      },
      "memoryTrick": "string",
      "medicalTrapAlert": "string",
      "adaptiveQuestionIdea": "string"
    }
  ]
}

STUDENT EXAM TELEMETRY DATA:
${JSON.stringify(formattedItemsForPrompt)}`;

    try {
      const rawOutput = await callQwen(prompt);
      let cleaned = rawOutput.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      }

      const parsed = JSON.parse(cleaned);
      if (parsed.notes && Array.isArray(parsed.notes) && parsed.notes.length > 0) {
        const aiMap = new Map();
        parsed.notes.forEach(n => {
          if (n.questionId) aiMap.set(n.questionId, n);
        });

        // Merge Qwen AI enhanced notes into allNotes
        finalNotesToSave = allNotes.map((dNote, idx) => {
          const aiNote = aiMap.get(dNote.questionId) || parsed.notes[idx];
          if (aiNote && (aiNote.questionId === dNote.questionId || idx < parsed.notes.length)) {
            return {
              ...dNote,
              ...aiNote,
              questionId: dNote.questionId,
              patternType: dNote.patternType,
              topicName: aiNote.topicName || dNote.topicName,
              comparisonBox: aiNote.comparisonBox || dNote.comparisonBox,
              medicalTrapAlert: aiNote.medicalTrapAlert || dNote.medicalTrapAlert
            };
          }
          return dNote;
        });
      }
    } catch (aiErr) {
      console.warn('AI LLM generation warning, using high-yield deterministic cognitive notes for all questions:', aiErr.message);
      finalNotesToSave = allNotes;
    }
  }

  const itemMap = new Map();
  targetItems.forEach(it => itemMap.set(it.questionId || it.id, it));

  const savedNotes = [];
  for (const note of finalNotesToSave) {
    const originalItem = itemMap.get(note.questionId) || targetItems[0] || {};
    const finalPatternType = parseInt(note.patternType) || originalItem.patternType || 7;
    const finalTopic = note.topicName || originalItem.topic || originalItem.topic_bn || 'Biology Concept';
    const finalChapterId = originalItem.chapterId || originalItem.chapter_id || null;

    await new Promise((resolve, reject) => {
      db.run(`
        INSERT INTO study_notes (
          user_id, session_id, chapter_id, topic_name, pattern_type, confused_options_json, note_content_json, version, exams_count, mastery_percent
        ) VALUES (1, ?, ?, ?, ?, ?, ?, 1, 1, 45.0)
      `, [
        sessionId || null,
        finalChapterId,
        finalTopic,
        finalPatternType,
        JSON.stringify([note.comparisonBox?.option1?.name, note.comparisonBox?.option2?.name].filter(Boolean)),
        JSON.stringify({
          ...note,
          patternType: finalPatternType,
          topicName: finalTopic,
          questionId: originalItem.questionId || originalItem.id,
          chapterId: finalChapterId,
          chapterName: originalItem.chapterName || originalItem.chapter_name
        })
      ], function (err) {
        if (err) reject(err);
        else {
          savedNotes.push({
            id: this.lastID,
            sessionId: sessionId || null,
            chapterId: finalChapterId,
            chapterName: originalItem.chapterName || originalItem.chapter_name || 'Biology',
            ...note,
            patternType: finalPatternType,
            topicName: finalTopic,
            version: 1,
            examsCount: 1,
            masteryPercent: 45.0
          });
          resolve();
        }
      });
    });
  }

  // Enrich living chapter document with AI notes
  const primaryChapterId = targetItems[0]?.chapterId || targetItems[0]?.chapter_id || null;
  let compiledChapterNote = null;
  if (primaryChapterId) {
    const aiNotesLookup = new Map();
    finalNotesToSave.forEach(n => {
      if (n.questionId) aiNotesLookup.set(n.questionId, n);
    });
    try {
      compiledChapterNote = await compileChapterLivingNote(primaryChapterId, targetItems, sessionId, aiNotesLookup);
    } catch (e) {
      console.warn('Could not compile chapter living note in notes/generate:', e.message);
    }
  }

  res.json({
    success: true,
    sessionId,
    count: savedNotes.length,
    notes: savedNotes,
    chapterLivingNote: compiledChapterNote
  });
});

// ─── 6. UNIFIED CHAPTER LIVING DOCUMENTS REPOSITORY API ───────────
app.get('/api/notes/living', (req, res) => {
  const { chapter_id, paper } = req.query;
  let sql = `
    SELECT ln.*, c.name_bn as chapter_name, c.paper, c.chapter_no
    FROM chapter_living_notes ln
    JOIN chapters c ON ln.chapter_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (chapter_id) {
    sql += ` AND ln.chapter_id = ? `;
    params.push(chapter_id);
  }
  if (paper) {
    sql += ` AND c.paper = ? `;
    params.push(paper);
  }
  sql += ` ORDER BY c.paper, c.chapter_no `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const livingNotes = rows.map(r => ({
      id: r.id,
      chapterId: r.chapter_id,
      chapterName: r.chapter_name,
      paper: r.paper,
      chapterNo: r.chapter_no,
      titleBn: r.title_bn || r.chapter_name,
      version: r.version,
      examsCount: r.exams_count,
      masteryPercent: r.mastery_percent,
      comparisonTable: JSON.parse(r.comparison_table_json || '[]'),
      dangerTraps: JSON.parse(r.danger_traps_json || '[]'),
      memoryTricks: JSON.parse(r.memory_tricks_json || '[]'),
      unchartedPrimers: JSON.parse(r.uncharted_primers_json || '[]'),
      masteredConcepts: JSON.parse(r.mastered_concepts_json || '[]'),
      lastExamSessionId: r.last_exam_session_id,
      updatedAt: r.updated_at
    }));

    res.json({ livingNotes });
  });
});

// ─── 6.1 GET SINGLE CHAPTER LIVING NOTE ───────────────────────────
app.get('/api/chapters/:id/living-note', (req, res) => {
  const chapterId = req.params.id;
  db.get(`
    SELECT ln.*, c.name_bn as chapter_name, c.paper, c.chapter_no
    FROM chapter_living_notes ln
    JOIN chapters c ON ln.chapter_id = c.id
    WHERE ln.chapter_id = ?
  `, [chapterId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.json({ livingNote: null });

    res.json({
      livingNote: {
        id: row.id,
        chapterId: row.chapter_id,
        chapterName: row.chapter_name,
        paper: row.paper,
        chapterNo: row.chapter_no,
        titleBn: row.title_bn || row.chapter_name,
        version: row.version,
        examsCount: row.exams_count,
        masteryPercent: row.mastery_percent,
        comparisonTable: JSON.parse(row.comparison_table_json || '[]'),
        dangerTraps: JSON.parse(row.danger_traps_json || '[]'),
        memoryTricks: JSON.parse(row.memory_tricks_json || '[]'),
        unchartedPrimers: JSON.parse(row.uncharted_primers_json || '[]'),
        masteredConcepts: JSON.parse(row.mastered_concepts_json || '[]'),
        lastExamSessionId: row.last_exam_session_id,
        updatedAt: row.updated_at
      }
    });
  });
});

// ─── 6.2 FULL CHAPTER ADAPTIVE RETAKE GENERATOR ──────────────────
app.get('/api/chapters/:id/retake', (req, res) => {
  const chapterId = req.params.id;

  db.get(`SELECT * FROM chapter_living_notes WHERE chapter_id = ?`, [chapterId], (nErr, noteRow) => {
    let priorityQIds = [];
    if (noteRow) {
      try {
        const dangerTraps = JSON.parse(noteRow.danger_traps_json || '[]');
        const compTable = JSON.parse(noteRow.comparison_table_json || '[]');
        const unchart = JSON.parse(noteRow.uncharted_primers_json || '[]');

        // Priority 1: Repeat Traps
        dangerTraps.filter(t => t.isRepeat).forEach(t => { if (t.questionId) priorityQIds.push(t.questionId); });
        // Priority 2: Unresolved Danger Traps
        dangerTraps.forEach(t => { if (t.questionId && !priorityQIds.includes(t.questionId)) priorityQIds.push(t.questionId); });
        // Priority 3: Confused Comparison Items
        compTable.filter(c => !c.isResolved).forEach(c => { if (c.questionId && !priorityQIds.includes(c.questionId)) priorityQIds.push(c.questionId); });
        // Priority 4: Skipped Questions
        unchart.forEach(u => { if (u.questionId && !priorityQIds.includes(u.questionId)) priorityQIds.push(u.questionId); });
      } catch (e) {}
    }

    const limit = 10;
    const placeholders = priorityQIds.length > 0 ? priorityQIds.map(() => '?').join(',') : '0';

    db.all(`
      SELECT q.id, q.chapter_id, q.topic_bn, q.topic_en, q.text_bn, q.options_json,
             q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name, c.paper
      FROM questions q
      JOIN chapters c ON q.chapter_id = c.id
      WHERE q.chapter_id = ?
      ORDER BY CASE WHEN q.id IN (${placeholders}) THEN 0 ELSE 1 END, RANDOM()
      LIMIT ?
    `, [chapterId, ...priorityQIds, limit], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({
        chapterId: parseInt(chapterId),
        isAdaptiveRetake: true,
        version: noteRow ? noteRow.version : 1,
        examsCount: noteRow ? noteRow.exams_count : 0,
        targetedWeakSpotsCount: priorityQIds.length,
        questions: formatQuestions(rows)
      });
    });
  });
});

// ─── 6.3 LEGACY ITEM-LEVEL NOTES API ─────────────────────────────
app.get('/api/notes', (req, res) => {
  const { session_id, chapter_id, paper, pattern_type } = req.query;
  let sql = `
    SELECT sn.id, sn.user_id, sn.session_id, sn.chapter_id, sn.topic_name, sn.pattern_type,
           sn.confused_options_json, sn.note_content_json, sn.version, sn.exams_count,
           sn.mastery_percent, sn.is_resolved, sn.updated_at,
           c.name_bn as chapter_name, c.paper, c.chapter_no
    FROM study_notes sn
    LEFT JOIN chapters c ON sn.chapter_id = c.id
    WHERE 1=1
  `;
  const params = [];
  if (session_id) {
    sql += ` AND sn.session_id = ? `;
    params.push(session_id);
  }
  if (chapter_id) {
    sql += ` AND sn.chapter_id = ? `;
    params.push(chapter_id);
  }
  if (paper) {
    sql += ` AND c.paper = ? `;
    params.push(paper);
  }
  if (pattern_type) {
    sql += ` AND sn.pattern_type = ? `;
    params.push(pattern_type);
  }
  sql += ` ORDER BY sn.id DESC `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });

    const notes = rows.map(r => ({
      id: r.id,
      sessionId: r.session_id,
      chapterId: r.chapter_id,
      chapterName: r.chapter_name || 'Biology General',
      paper: r.paper || '1st_paper',
      chapterNo: r.chapter_no || 0,
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

    const triggerQId = content.questionId || 0;
    const chapterId = noteRow.chapter_id;

    let sql = `
      SELECT q.id, q.chapter_id, q.topic_bn, q.text_bn, q.options_json,
             q.correct_index, q.explanation_bn, q.trap_hint_bn, c.name_bn as chapter_name
      FROM questions q
      JOIN chapters c ON q.chapter_id = c.id
    `;
    const params = [];
    if (chapterId) {
      sql += ` WHERE q.chapter_id = ? `;
      params.push(chapterId);
    }
    sql += ` ORDER BY CASE WHEN q.id = ? THEN 0 ELSE 1 END, RANDOM() LIMIT 5 `;
    params.push(triggerQId);

    db.all(sql, params, (err, qRows) => {
      if (err) return res.status(500).json({ error: err.message });

      const retakeQuestions = qRows.map(r => ({
        id: r.id,
        chapterId: r.chapter_id,
        chapterName: r.chapter_name,
        topicBn: r.topic_bn,
        text: r.text_bn,
        options: JSON.parse(r.options_json),
        correct: r.correct_index,
        explanation: r.explanation_bn,
        trap: r.trap_hint_bn,
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
    `, [newVersion, newExamsCount, newMastery, isResolved, noteId], function (err) {
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
