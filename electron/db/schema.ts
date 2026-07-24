export interface Migration {
  version: number;
  statements: string[];
}

export const LATEST_SCHEMA_VERSION = 4;

export const PREDICTION_RUN_TABLE = 'prediction_run';
export const SPECULATIVE_BRANCH_TABLE = 'speculative_branch';
export const BRANCH_DECISION_TABLE = 'branch_decision';
export const PIPELINE_REPO_TABLE = 'pipeline_repo';
export const PIPELINE_SNAPSHOT_TABLE = 'pipeline_snapshot';
export const PIPELINE_EVENT_TABLE = 'pipeline_event';
export const PIPELINE_CURSOR_TABLE = 'pipeline_cursor';

export const TEMPORAL_AGENT_INDEXES = [
  'idx_run_repo',
  'idx_run_repo_generated',
  'idx_run_device',
  'idx_run_input_hash',
  'idx_branch_run',
  'idx_decision_branch',
  'idx_decision_device',
] as const;

const CREATE_PREDICTION_RUN_TABLE = `
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

const CREATE_SPECULATIVE_BRANCH_TABLE = `
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

const CREATE_BRANCH_DECISION_TABLE = `
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

const CREATE_INDEXES = [
  'CREATE INDEX idx_run_repo           ON prediction_run(repo_path);',
  'CREATE INDEX idx_run_repo_generated ON prediction_run(repo_path, generated_at);',
  'CREATE INDEX idx_run_device         ON prediction_run(device_id);',
  'CREATE INDEX idx_run_input_hash     ON prediction_run(input_hash);',
  'CREATE INDEX idx_branch_run         ON speculative_branch(run_id);',
  'CREATE INDEX idx_decision_branch    ON branch_decision(branch_id);',
  'CREATE INDEX idx_decision_device    ON branch_decision(device_id);',
];

// ── Cartografía Fase 5 ──────────────────────────────────────────────────────
// Caché de explicaciones de nodos generadas por la IA. Reutiliza la disciplina
// de persistencia del Temporal Agent (misma DB, mismas migraciones), pero es una
// tabla aparte: una explicación por (repo, nodo, contenido, idioma). La clave por
// CONTENIDO (`content_hash`) es lo que evita re-gastar el modelo si el nodo no
// cambió, y lo que invalida la caché en cuanto su código cambia.
const CREATE_CARTO_EXPLANATION_TABLE = `
CREATE TABLE carto_explanation (
  id           TEXT    PRIMARY KEY,
  repo_path    TEXT    NOT NULL,
  node_path    TEXT    NOT NULL,
  content_hash TEXT    NOT NULL,
  lang         TEXT    NOT NULL,
  provider     TEXT    NOT NULL,
  model        TEXT,
  explanation  TEXT    NOT NULL,
  generated_at TEXT    NOT NULL,
  created_at   TEXT    NOT NULL
) STRICT;
`;

const CREATE_CARTO_EXPLANATION_INDEXES = [
  // Clave de búsqueda/caché: misma celda lógica = mismo repo+nodo+contenido+idioma.
  'CREATE UNIQUE INDEX idx_carto_expl_key ON carto_explanation(repo_path, node_path, content_hash, lang);',
  // Para podar versiones viejas de un nodo (mismo repo+nodo+idioma, otro hash).
  'CREATE INDEX idx_carto_expl_node ON carto_explanation(repo_path, node_path, lang);',
];

// ── Cartografía Fase 8 ──────────────────────────────────────────────────────
// Texto top-down generado por IA para Panorama. La estructura que lo fundamenta
// se calcula aparte, de forma determinista y local. Esta tabla guarda sólo la
// narración del proyecto y sus recorridos guiados para un hash estructural dado.
const CREATE_CARTO_PANORAMA_TABLE = `
CREATE TABLE carto_panorama (
  id             TEXT    PRIMARY KEY,
  repo_path      TEXT    NOT NULL,
  structure_hash TEXT    NOT NULL,
  lang           TEXT    NOT NULL,
  provider       TEXT    NOT NULL,
  model          TEXT,
  one_line       TEXT    NOT NULL,
  paragraph      TEXT    NOT NULL,
  flows_json     TEXT    NOT NULL,
  generated_at   TEXT    NOT NULL,
  created_at     TEXT    NOT NULL
) STRICT;
`;

const CREATE_CARTO_PANORAMA_INDEXES = [
  'CREATE UNIQUE INDEX idx_carto_panorama_key ON carto_panorama(repo_path, structure_hash, lang);',
  'CREATE INDEX idx_carto_panorama_repo ON carto_panorama(repo_path, lang);',
];

const CREATE_PIPELINE_TABLES = [
  `CREATE TABLE pipeline_repo (
    repo_id               TEXT PRIMARY KEY,
    canonical_path        TEXT NOT NULL UNIQUE,
    git_common_dir_digest TEXT NOT NULL,
    created_at            TEXT NOT NULL,
    updated_at            TEXT NOT NULL
  ) STRICT;`,
  `CREATE TABLE pipeline_snapshot (
    repo_id     TEXT PRIMARY KEY REFERENCES pipeline_repo(repo_id) ON DELETE CASCADE,
    sequence    INTEGER NOT NULL,
    state_json  TEXT NOT NULL,
    captured_at TEXT NOT NULL
  ) STRICT;`,
  `CREATE TABLE pipeline_event (
    repo_id      TEXT NOT NULL REFERENCES pipeline_repo(repo_id) ON DELETE CASCADE,
    event_id     TEXT NOT NULL,
    sequence     INTEGER NOT NULL,
    kind         TEXT NOT NULL,
    observed_at  TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    PRIMARY KEY (repo_id, event_id),
    UNIQUE (repo_id, sequence)
  ) STRICT;`,
  `CREATE TABLE pipeline_cursor (
    repo_id     TEXT NOT NULL REFERENCES pipeline_repo(repo_id) ON DELETE CASCADE,
    source_ref  TEXT NOT NULL,
    offset      INTEGER NOT NULL,
    pending     TEXT NOT NULL,
    generation  TEXT,
    updated_at  TEXT NOT NULL,
    PRIMARY KEY (repo_id, source_ref)
  ) STRICT;`,
  'CREATE INDEX idx_pipeline_event_repo_sequence ON pipeline_event(repo_id, sequence);',
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
  {
    version: 2,
    statements: [
      CREATE_CARTO_EXPLANATION_TABLE,
      ...CREATE_CARTO_EXPLANATION_INDEXES,
    ],
  },
  {
    version: 3,
    statements: [
      CREATE_CARTO_PANORAMA_TABLE,
      ...CREATE_CARTO_PANORAMA_INDEXES,
    ],
  },
  {
    version: 4,
    statements: CREATE_PIPELINE_TABLES,
  },
];
