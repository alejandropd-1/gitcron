export interface Migration {
  version: number;
  statements: string[];
}

export const LATEST_SCHEMA_VERSION = 1;

export const PREDICTION_RUN_TABLE = 'prediction_run';
export const SPECULATIVE_BRANCH_TABLE = 'speculative_branch';
export const BRANCH_DECISION_TABLE = 'branch_decision';

export const TEMPORAL_AGENT_INDEXES = [
  'idx_run_repo',
  'idx_run_repo_generated',
  'idx_run_device',
  'idx_run_input_hash',
  'idx_branch_run',
  'idx_decision_branch',
  'idx_decision_device',
] as const;

export const CREATE_PREDICTION_RUN_TABLE = `
CREATE TABLE prediction_run (
  id                 TEXT    PRIMARY KEY,
  repo_path          TEXT    NOT NULL,
  device_id          TEXT    NOT NULL,
  device_label       TEXT,
  provider           TEXT    NOT NULL,
  model              TEXT,
  app_version        TEXT,
  context_scope      TEXT    NOT NULL,
  input_commit_count INTEGER,
  web_trends         INTEGER NOT NULL DEFAULT 0,
  head_sha           TEXT,
  input_hash         TEXT,
  generated_at       TEXT    NOT NULL,
  created_at         TEXT    NOT NULL
) STRICT;
`;

export const CREATE_SPECULATIVE_BRANCH_TABLE = `
CREATE TABLE speculative_branch (
  id           TEXT    PRIMARY KEY,
  run_id       TEXT    NOT NULL REFERENCES prediction_run(id),
  source_id    TEXT,
  message      TEXT    NOT NULL,
  description  TEXT,
  rationale    TEXT    NOT NULL,
  type         TEXT    NOT NULL,
  confidence   REAL    NOT NULL
) STRICT;
`;

export const CREATE_BRANCH_DECISION_TABLE = `
CREATE TABLE branch_decision (
  id               TEXT    PRIMARY KEY,
  branch_id        TEXT    NOT NULL REFERENCES speculative_branch(id),
  device_id        TEXT    NOT NULL,
  decision         TEXT    NOT NULL,
  materialized_ref TEXT,
  note             TEXT,
  decided_at       TEXT    NOT NULL
) STRICT;
`;

export const CREATE_INDEXES = [
  'CREATE INDEX idx_run_repo           ON prediction_run(repo_path);',
  'CREATE INDEX idx_run_repo_generated ON prediction_run(repo_path, generated_at);',
  'CREATE INDEX idx_run_device         ON prediction_run(device_id);',
  'CREATE INDEX idx_run_input_hash     ON prediction_run(input_hash);',
  'CREATE INDEX idx_branch_run         ON speculative_branch(run_id);',
  'CREATE INDEX idx_decision_branch    ON branch_decision(branch_id);',
  'CREATE INDEX idx_decision_device    ON branch_decision(device_id);',
];

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    statements: [
      CREATE_PREDICTION_RUN_TABLE,
      CREATE_SPECULATIVE_BRANCH_TABLE,
      CREATE_BRANCH_DECISION_TABLE,
      ...CREATE_INDEXES,
    ],
  },
];
