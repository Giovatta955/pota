-- Schema MySQL / MariaDB per la versione PHP.
-- Requisiti: MySQL 5.7+ o MariaDB 10.3+, charset utf8mb4.
-- Importare da phpMyAdmin (scheda "Importa") PRIMA di contenuti.sql.

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ---------- Contenuti ----------
CREATE TABLE IF NOT EXISTS topics (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  exam_weight DECIMAL(6,2) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subtopics (
  id VARCHAR(150) NOT NULL PRIMARY KEY,
  topic_id VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  position INT NOT NULL DEFAULT 0,
  exam_weight DECIMAL(6,2) NOT NULL DEFAULT 1,
  is_free TINYINT(1) NOT NULL DEFAULT 0,
  KEY idx_sub_topic (topic_id),
  CONSTRAINT fk_sub_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- html = riassunto già convertito da Markdown (generato dallo script di esportazione)
CREATE TABLE IF NOT EXISTS summaries (
  subtopic_id VARCHAR(150) NOT NULL PRIMARY KEY,
  html MEDIUMTEXT NOT NULL,
  key_points TEXT NOT NULL,            -- JSON: array di stringhe
  CONSTRAINT fk_sum_sub FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS maps (
  subtopic_id VARCHAR(150) NOT NULL PRIMARY KEY,
  tree MEDIUMTEXT NOT NULL,            -- JSON: {title, rel?, note?, children?}
  CONSTRAINT fk_map_sub FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcards (
  id VARCHAR(200) NOT NULL PRIMARY KEY,
  subtopic_id VARCHAR(150) NOT NULL,
  front TEXT NOT NULL,
  back TEXT NOT NULL,
  KEY idx_fc_sub (subtopic_id),
  CONSTRAINT fk_fc_sub FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS questions (
  id VARCHAR(200) NOT NULL PRIMARY KEY,
  topic_id VARCHAR(100) NOT NULL,
  subtopic_id VARCHAR(150) NOT NULL,
  level TINYINT NOT NULL,
  stem TEXT NOT NULL,
  options TEXT NOT NULL,               -- JSON: [{key:"A",text:"..."},...]
  correct CHAR(1) NOT NULL,
  explanation TEXT NOT NULL,
  reference VARCHAR(500) NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'published',
  active TINYINT(1) NOT NULL DEFAULT 1,
  KEY idx_q_sub_level (subtopic_id, level),
  KEY idx_q_topic (topic_id),
  CONSTRAINT fk_q_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE,
  CONSTRAINT fk_q_sub FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS media (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  subtopic_id VARCHAR(150) NOT NULL,
  kind VARCHAR(10) NOT NULL,           -- podcast | video
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  description VARCHAR(1000) NULL,
  duration_s INT NULL,
  position INT NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_media_sub (subtopic_id, position),
  CONSTRAINT fk_media_sub FOREIGN KEY (subtopic_id) REFERENCES subtopics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Utenti ----------
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  is_admin TINYINT(1) NOT NULL DEFAULT 0,
  withdrawal_consent_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS password_resets (
  token_hash CHAR(64) NOT NULL PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  expires_at DATETIME NOT NULL,
  CONSTRAINT fk_pr_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS login_attempts (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  email VARCHAR(255) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_la (ip, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS subscriptions (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  provider VARCHAR(20) NOT NULL,
  provider_customer_id VARCHAR(100) NULL,
  provider_subscription_id VARCHAR(150) NULL,
  plan VARCHAR(10) NOT NULL,           -- monthly | pass
  status VARCHAR(30) NOT NULL,
  current_period_end DATETIME NULL,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_sub_provider (provider_subscription_id),
  KEY idx_sub_user (user_id),
  CONSTRAINT fk_subs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- Progressi ----------
CREATE TABLE IF NOT EXISTS attempts (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  user_id INT UNSIGNED NOT NULL,
  question_id VARCHAR(200) NOT NULL,
  answer CHAR(1) NOT NULL,
  is_correct TINYINT(1) NOT NULL,
  time_ms INT NULL,
  mode VARCHAR(10) NOT NULL,           -- quiz | trainer | exam
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_att_user (user_id, created_at),
  KEY idx_att_q (question_id),
  CONSTRAINT fk_att_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_att_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS topic_stats (
  user_id INT UNSIGNED NOT NULL,
  topic_id VARCHAR(100) NOT NULL,
  accuracy_ema DECIMAL(6,4) NOT NULL DEFAULT 0.5,
  current_level TINYINT NOT NULL DEFAULT 1,
  n_answers INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, topic_id),
  CONSTRAINT fk_ts_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_ts_topic FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS flashcard_progress (
  user_id INT UNSIGNED NOT NULL,
  flashcard_id VARCHAR(200) NOT NULL,
  ease DECIMAL(4,2) NOT NULL DEFAULT 2.5,
  interval_days INT NOT NULL DEFAULT 0,
  repetitions INT NOT NULL DEFAULT 0,
  due_date DATE NOT NULL,
  PRIMARY KEY (user_id, flashcard_id),
  KEY idx_fp_due (user_id, due_date),
  CONSTRAINT fk_fp_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_card FOREIGN KEY (flashcard_id) REFERENCES flashcards(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exams (
  id CHAR(32) NOT NULL PRIMARY KEY,    -- identificativo casuale, non indovinabile
  user_id INT UNSIGNED NOT NULL,
  question_ids TEXT NOT NULL,          -- JSON: array di id domanda
  duration_s INT NOT NULL,
  started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  submitted_at DATETIME NULL,
  score DECIMAL(6,4) NULL,
  KEY idx_exam_user (user_id, started_at),
  CONSTRAINT fk_exam_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS exam_answers (
  exam_id CHAR(32) NOT NULL,
  question_id VARCHAR(200) NOT NULL,
  answer CHAR(1) NULL,
  PRIMARY KEY (exam_id, question_id),
  CONSTRAINT fk_ea_exam FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE,
  CONSTRAINT fk_ea_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS reports (
  id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  question_id VARCHAR(200) NOT NULL,
  user_id INT UNSIGNED NULL,
  note VARCHAR(2000) NOT NULL,
  status VARCHAR(12) NOT NULL DEFAULT 'open',  -- open | resolved | dismissed
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_rep_status (status, created_at),
  CONSTRAINT fk_rep_q FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  CONSTRAINT fk_rep_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Eventi Stripe già elaborati (evita doppie elaborazioni se Stripe reinvia)
CREATE TABLE IF NOT EXISTS stripe_events (
  id VARCHAR(100) NOT NULL PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
