-- Trivia answers tracking
CREATE TABLE IF NOT EXISTS trivia_answers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  date_key TEXT NOT NULL,
  question_id INTEGER NOT NULL,
  answer_index INTEGER NOT NULL,
  is_correct INTEGER NOT NULL DEFAULT 0,
  answered_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id),
  UNIQUE(user_id, date_key)
);

CREATE INDEX IF NOT EXISTS idx_trivia_answers_user ON trivia_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_trivia_answers_date ON trivia_answers(date_key);
CREATE INDEX IF NOT EXISTS idx_trivia_answers_correct ON trivia_answers(is_correct);
