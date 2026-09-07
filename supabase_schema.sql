-- Table 1: One row per interview session
CREATE TABLE sessions (
  id              TEXT PRIMARY KEY,
  candidate_name  TEXT NOT NULL,
  job_role        TEXT,
  interview_mode  TEXT NOT NULL CHECK (interview_mode IN ('guided','freeflow','roleplay')),
  organisation    TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at        TIMESTAMPTZ,
  duration_secs   INT,
  total_turns     INT DEFAULT 0,
  barge_in_count  INT DEFAULT 0,
  overall_score   FLOAT,
  flag            TEXT DEFAULT 'Clean' CHECK (flag IN ('Clean','Hallucination','Silence','Interruption Failure')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Table 2: One row per conversation turn
CREATE TABLE turn_metrics (
  id                  BIGSERIAL PRIMARY KEY,
  session_id          TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  turn_index          INT NOT NULL,
  timestamp_ms        BIGINT NOT NULL,
  stt_latency_ms      INT,
  llm_ttft_ms         INT,
  tts_latency_ms      INT,
  total_latency_ms    INT GENERATED ALWAYS AS (COALESCE(stt_latency_ms,0) + COALESCE(llm_ttft_ms,0) + COALESCE(tts_latency_ms,0)) STORED,
  barge_in            BOOLEAN DEFAULT FALSE,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_turn_metrics_session ON turn_metrics(session_id);

-- Table 3: One row per spoken utterance
CREATE TABLE transcripts (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  speaker         TEXT NOT NULL CHECK (speaker IN ('Agent','User','System')),
  role            TEXT NOT NULL CHECK (role IN ('ai','human','system')),
  text            TEXT NOT NULL,
  timestamp_secs  FLOAT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_transcripts_session ON transcripts(session_id);

-- Table 4: Tool calls (guided/roleplay modes only)
CREATE TABLE tool_calls (
  id              BIGSERIAL PRIMARY KEY,
  session_id      TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  turn_index      INT NOT NULL,
  timestamp_ms    BIGINT NOT NULL,
  tool_name       TEXT NOT NULL,
  arguments       JSONB,
  result          TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE turn_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;

-- Table 5: Dashboard Users (Tracks who logs in)
CREATE TABLE dashboard_users (
  id              BIGSERIAL PRIMARY KEY,
  email           TEXT UNIQUE NOT NULL,
  name            TEXT,
  image_url       TEXT,
  last_login      TIMESTAMPTZ DEFAULT NOW(),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE dashboard_users ENABLE ROW LEVEL SECURITY;

-- ── tool_calls table ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tool_calls (
  id            BIGSERIAL PRIMARY KEY,
  session_id    TEXT REFERENCES sessions(id) ON DELETE CASCADE,
  turn_index    INT NOT NULL,
  timestamp_ms  BIGINT NOT NULL,
  tool_name     TEXT NOT NULL,
  arguments     JSONB DEFAULT '{}',
  result        TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tool_calls_session ON tool_calls(session_id);

ALTER TABLE tool_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "service_role_all_tool_calls" ON tool_calls
  FOR ALL USING (true);
