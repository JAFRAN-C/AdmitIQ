const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const dbDir = path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'admitiq.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening SQLite database:', err);
  } else {
    console.log('Connected to SQLite database at:', dbPath);
  }
});

// Initialize Schema
function initSchema() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // 1. Users
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT UNIQUE,
          target_exam TEXT DEFAULT 'Medical Admission',
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Chapters (HSC Biology 1st & 2nd Paper)
      db.run(`
        CREATE TABLE IF NOT EXISTS chapters (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          paper TEXT NOT NULL, /* '1st_paper' or '2nd_paper' */
          chapter_no INTEGER NOT NULL,
          name_bn TEXT NOT NULL,
          name_en TEXT NOT NULL,
          total_mcqs INTEGER DEFAULT 0
        )
      `);

      // 3. Questions
      db.run(`
        CREATE TABLE IF NOT EXISTS questions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          chapter_id INTEGER NOT NULL,
          topic_bn TEXT NOT NULL,
          topic_en TEXT,
          text_bn TEXT NOT NULL,
          options_json TEXT NOT NULL, /* ["optA", "optB", "optC", "optD"] */
          correct_index INTEGER NOT NULL,
          explanation_bn TEXT,
          trap_hint_bn TEXT,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id)
        )
      `);

      // 4. Exam Sessions
      db.run(`
        CREATE TABLE IF NOT EXISTS exam_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER DEFAULT 1,
          chapter_id INTEGER,
          total_questions INTEGER NOT NULL,
          score INTEGER NOT NULL,
          accuracy REAL NOT NULL,
          avg_time REAL NOT NULL,
          dominant_pattern INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id)
        )
      `);

      // 5. Telemetry Logs (7-Pattern Behavioral Telemetry)
      db.run(`
        CREATE TABLE IF NOT EXISTS telemetry_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_id INTEGER NOT NULL,
          question_id INTEGER NOT NULL,
          time_taken REAL NOT NULL,
          switch_count INTEGER DEFAULT 0,
          click_path_json TEXT, /* ["A", "C", "B"] */
          was_skipped INTEGER DEFAULT 0,
          answered_at_end INTEGER DEFAULT 0,
          is_correct INTEGER NOT NULL,
          pattern_type INTEGER NOT NULL, /* 1 to 7 */
          first_choice TEXT,
          final_choice TEXT,
          FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
          FOREIGN KEY (question_id) REFERENCES questions(id)
        )
      `);

      // 6. Dynamic Living Study Notes (Item-level)
      db.run(`
        CREATE TABLE IF NOT EXISTS study_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER DEFAULT 1,
          session_id INTEGER,
          chapter_id INTEGER,
          topic_name TEXT NOT NULL,
          pattern_type INTEGER NOT NULL,
          confused_options_json TEXT, /* ["tRNA", "mRNA"] */
          note_content_json TEXT NOT NULL,
          version INTEGER DEFAULT 1,
          exams_count INTEGER DEFAULT 1,
          mastery_percent REAL DEFAULT 40.0,
          is_resolved INTEGER DEFAULT 0,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (session_id) REFERENCES exam_sessions(id),
          FOREIGN KEY (chapter_id) REFERENCES chapters(id)
        )
      `);

      // 7. Unified Chapter-Wise Living Study Documents (Multi-Exam Cognitive Tracker)
      db.run(`
        CREATE TABLE IF NOT EXISTS chapter_living_notes (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER DEFAULT 1,
          chapter_id INTEGER UNIQUE,
          paper TEXT,
          chapter_no INTEGER,
          title_bn TEXT,
          version INTEGER DEFAULT 1,
          exams_count INTEGER DEFAULT 1,
          mastery_percent REAL DEFAULT 40.0,
          comparison_table_json TEXT,  /* [{ topic, option1, option2, keyDiff, isResolved, status }] */
          danger_traps_json TEXT,      /* [{ questionId, topic, stem, choice, correctChoice, trap, isRepeat, repeatCount }] */
          memory_tricks_json TEXT,     /* [{ topic, mnemonic, speedTrigger }] */
          uncharted_primers_json TEXT, /* [{ topic, primerText, keyFacts }] */
          mastered_concepts_json TEXT, /* [{ topic, resolvedFrom, speedSec }] */
          last_exam_session_id INTEGER,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (chapter_id) REFERENCES chapters(id)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
}

module.exports = { db, initSchema };

