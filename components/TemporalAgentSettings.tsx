'use client';

// components/TemporalAgentSettings.tsx
// Per-repo Settings panel for the Temporal Agent (Phase 0).
// Reads/writes via window.api.temporalAgent (no localStorage, no secrets here).
// Palette: "The Compiled Soul" — navy #020f1e, neon green #a3f185,
// cyan #5ed8ff, warning orange #fd9d1a.

import { useEffect, useState } from 'react';
import type {
  TemporalAgentConfig,
  AnalysisFrequency,
  PrivacyScope,
  PredictionResult,
} from '@/types/temporal-agent';

const GREEN = '#a3f185';
const CYAN = '#5ed8ff';
const ORANGE = '#fd9d1a';

// Phase 3 / Phase 4: OpenRouter is the primary provider (one key → many models).
const ACTIVE_PROVIDER = 'openrouter';

interface Props {
  repoPath: string;
  repoName: string;
  /** Capa 1: lift the fresh prediction up so the graph can draw it this session. */
  onPrediction?: (result: PredictionResult) => void;
}

export function TemporalAgentSettings({ repoPath, repoName, onPrediction }: Props) {
  const [config, setConfig] = useState<TemporalAgentConfig | null>(null);
  const [notesMd, setNotesMd] = useState<string>('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI key state — only a boolean ("is there a key?") is ever read back.
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Prediction trigger (Phase 4: provider is stubbed in main; draw is Phase 5).
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    window.api.temporalAgent.loadConfig(repoPath, repoName).then((c) => {
      if (alive) setConfig(c);
    });
    window.api.ai.hasKey(ACTIVE_PROVIDER).then((r) => {
      if (alive) setHasKey(r.success ? Boolean(r.data) : false);
    });
    return () => {
      alive = false;
    };
  }, [repoPath, repoName]);

  async function refreshHasKey() {
    const r = await window.api.ai.hasKey(ACTIVE_PROVIDER);
    setHasKey(r.success ? Boolean(r.data) : false);
  }

  async function saveKey() {
    const k = keyDraft.trim();
    if (!k) return;
    setSavingKey(true);
    try {
      await window.api.ai.setKey(ACTIVE_PROVIDER, k);
      setKeyDraft(''); // never keep the key in component state
      await refreshHasKey();
    } finally {
      setSavingKey(false);
    }
  }

  async function removeKey() {
    await window.api.ai.removeKey(ACTIVE_PROVIDER);
    await refreshHasKey();
  }

  async function predict() {
    setPredicting(true);
    setPredictError(null);
    try {
      const r = await window.api.ai.predictTimelines(repoPath, repoName);
      if (r.success && r.data) {
        setResult(r.data);
        // Capa 1: lift the result so the graph draws it (main already persisted it).
        onPrediction?.(r.data);
      } else {
        setPredictError(r.error ?? 'Prediction failed');
      }
    } catch (e) {
      setPredictError(e instanceof Error ? e.message : String(e));
    } finally {
      setPredicting(false);
    }
  }

  if (!config) return <div style={{ color: '#9BA1B0' }}>Loading…</div>;

  function patch(p: Partial<TemporalAgentConfig>) {
    setConfig((c) => (c ? { ...c, ...p } : c));
  }
  function patchSkill(p: Partial<TemporalAgentConfig['skillProfile']>) {
    setConfig((c) => (c ? { ...c, skillProfile: { ...c.skillProfile, ...p } } : c));
  }

  async function save() {
    if (!config) return;
    setSaving(true);
    try {
      await window.api.temporalAgent.saveConfig(repoPath, config);
    } finally {
      setSaving(false);
    }
  }

  async function openNotes() {
    const md = await window.api.temporalAgent.getNotesMarkdown(repoPath, repoName);
    setNotesMd(md);
    setShowNotes(true);
  }

  return (
    <section style={{ color: '#E1E1E6', display: 'flex', flexDirection: 'column', gap: 18 }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>Temporal Agent</h3>
        <span style={{ fontSize: 11, color: CYAN, border: `1px solid ${CYAN}`, borderRadius: 9999, padding: '1px 8px' }}>
          experimental
        </span>
      </header>
      <p style={{ fontSize: 13, color: '#9BA1B0', margin: 0 }}>
        Lets an AI propose speculative future branches for <strong>{repoName}</strong> on the
        chronometric graph. Opt-in. Nothing is sent anywhere until you trigger an analysis.
      </p>

      {/* Enable */}
      <Row label="Enable for this repo">
        <Toggle on={config.enabled} onChange={(v) => patch({ enabled: v })} />
      </Row>

      {/* Frequency */}
      <Row label="Analysis frequency">
        <select
          value={config.frequency}
          onChange={(e) => patch({ frequency: e.target.value as AnalysisFrequency })}
          style={selectStyle}
        >
          <option value="on-demand">On demand (button)</option>
          <option value="manual">Manual only</option>
          <option value="daily">Daily (when open)</option>
          <option value="weekly">Weekly (when open)</option>
        </select>
      </Row>

      {/* Privacy scope */}
      <Row label="What context is sent">
        <select
          value={config.privacyScope}
          onChange={(e) => patch({ privacyScope: e.target.value as PrivacyScope })}
          style={selectStyle}
        >
          <option value="metadata">Metadata only (commits, languages, deps)</option>
          <option value="metadata-plus-files">Metadata + changed filenames</option>
        </select>
      </Row>
      {config.privacyScope === 'metadata-plus-files' && (
        <p style={{ fontSize: 12, color: ORANGE, margin: 0 }}>
          Filenames give better predictions but widen what leaves your machine. Default is
          metadata-only; this stays off until you choose it.
        </p>
      )}

      {/* Skill profile */}
      <div style={cardStyle}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', color: GREEN }}>
          Temporal Attention — focus profile
        </h4>
        <TagInput
          label="Focus areas (up-weight)"
          tags={config.skillProfile.focusAreas}
          color={GREEN}
          onChange={(t) => patchSkill({ focusAreas: t })}
        />
        <TagInput
          label="Avoid topics (down-weight)"
          tags={config.skillProfile.avoidTopics}
          color={ORANGE}
          onChange={(t) => patchSkill({ avoidTopics: t })}
        />
        <Row label={`Hide predictions below confidence (${config.skillProfile.confidenceThreshold.toFixed(2)})`}>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={config.skillProfile.confidenceThreshold}
            onChange={(e) => patchSkill({ confidenceThreshold: Number(e.target.value) })}
            style={{ accentColor: CYAN, width: 180 }}
          />
        </Row>
      </div>

      {/* AI access — the renderer only ever learns whether a key exists. */}
      <div style={cardStyle}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', color: CYAN }}>
          AI access — OpenRouter
        </h4>
        <Row label="API key status">
          {hasKey === null ? (
            <span style={{ fontSize: 12, color: '#9BA1B0' }}>checking…</span>
          ) : hasKey ? (
            <span style={{ fontSize: 12, color: GREEN }}>● configured</span>
          ) : (
            <span style={{ fontSize: 12, color: ORANGE }}>○ not set</span>
          )}
        </Row>
        <p style={{ fontSize: 12, color: '#9BA1B0', margin: '0 0 8px' }}>
          The key is encrypted by your OS and used only inside the app process. It is never shown
          back here and never reaches this screen.
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder={hasKey ? 'Replace key…' : 'Paste OpenRouter API key'}
            autoComplete="off"
            style={{ ...selectStyle, flex: 1 }}
          />
          <button onClick={saveKey} disabled={savingKey || !keyDraft.trim()} style={primaryBtn}>
            {savingKey ? 'Saving…' : 'Save key'}
          </button>
          {hasKey && (
            <button onClick={removeKey} style={ghostBtn}>
              Remove
            </button>
          )}
        </div>

        {/* Model id — NOT a secret; saved in plain config with the rest of the prefs. */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: '#9BA1B0', display: 'block', marginBottom: 6 }}>
            Modelo (OpenRouter)
          </label>
          <input
            type="text"
            value={config.model ?? ''}
            onChange={(e) => patch({ model: e.target.value })}
            placeholder="ID de OpenRouter, formato proveedor/modelo. Ej: anthropic/claude-sonnet-4.5, anthropic/claude-sonnet-4.6, google/gemini-3-flash-preview"
            autoComplete="off"
            spellCheck={false}
            style={{ ...selectStyle, width: '100%' }}
          />
          <p style={{ fontSize: 11, color: '#697789', margin: '6px 0 0' }}>
            Vacío = usa el default <code>anthropic/claude-sonnet-4.5</code>. Acordate de <strong>Save</strong>.
          </p>
        </div>
      </div>

      {/* Prediction trigger — Phase 4 logs the result; the diagonal draw is Phase 5. */}
      <div style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={predict} disabled={predicting} style={{ ...primaryBtn, background: CYAN }}>
            {predicting ? 'Predicting…' : 'Predecir futuros'}
          </button>
          <span style={{ fontSize: 12, color: '#9BA1B0' }}>
            Runs the agent and logs the PredictionResult (drawing comes in Phase 5).
          </span>
        </div>
        {predictError && (
          <p style={{ fontSize: 12, color: ORANGE, margin: '10px 0 0' }}>Error: {predictError}</p>
        )}
        {result && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#cbc3d7' }}>
            <div style={{ color: GREEN, marginBottom: 6 }}>
              {result.branches.length} branch{result.branches.length === 1 ? '' : 'es'} from{' '}
              <span style={{ color: CYAN }}>{result.provider}</span>
            </div>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {result.branches.map((b) => (
                <li key={b.id} style={{ marginBottom: 4 }}>
                  <strong>{b.message}</strong> — {b.type}, {Math.round(b.confidence * 100)}%
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <button onClick={save} disabled={saving} style={primaryBtn}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button onClick={openNotes} style={ghostBtn}>
          View agent notes
        </button>
      </div>

      {showNotes && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 12, color: CYAN }}>notes.md (read-only mirror)</strong>
            <button onClick={() => setShowNotes(false)} style={ghostBtn}>
              Close
            </button>
          </div>
          <pre
            style={{
              marginTop: 8,
              maxHeight: 280,
              overflow: 'auto',
              fontSize: 11,
              lineHeight: 1.5,
              fontFamily: 'JetBrains Mono, monospace',
              color: '#cbc3d7',
              whiteSpace: 'pre-wrap',
            }}
          >
            {notesMd || '(empty)'}
          </pre>
        </div>
      )}
    </section>
  );
}

// --- small presentational helpers ------------------------------------------

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
      <span style={{ fontSize: 13 }}>{label}</span>
      {children}
    </div>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      aria-pressed={on}
      style={{
        width: 42,
        height: 24,
        borderRadius: 9999,
        border: 'none',
        cursor: 'pointer',
        background: on ? '#a3f185' : '#2D2E39',
        position: 'relative',
        transition: 'background 0.2s',
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 3,
          left: on ? 21 : 3,
          width: 18,
          height: 18,
          borderRadius: 9999,
          background: on ? '#020f1e' : '#9BA1B0',
          transition: 'left 0.2s',
        }}
      />
    </button>
  );
}

function TagInput({
  label,
  tags,
  color,
  onChange,
}: {
  label: string;
  tags: string[];
  color: string;
  onChange: (t: string[]) => void;
}) {
  const [draft, setDraft] = useState('');
  function add() {
    const v = draft.trim();
    if (v && !tags.includes(v)) onChange([...tags, v]);
    setDraft('');
  }
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ fontSize: 12, color: '#9BA1B0', display: 'block', marginBottom: 6 }}>{label}</label>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
        {tags.map((t) => (
          <span
            key={t}
            style={{
              fontSize: 11,
              color,
              border: `1px solid ${color}`,
              borderRadius: 9999,
              padding: '1px 8px',
              display: 'inline-flex',
              gap: 6,
              alignItems: 'center',
            }}
          >
            {t}
            <button
              onClick={() => onChange(tags.filter((x) => x !== t))}
              style={{ background: 'none', border: 'none', color, cursor: 'pointer', padding: 0 }}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())}
        placeholder="type + Enter"
        style={{ ...selectStyle, width: '100%' }}
      />
    </div>
  );
}

const selectStyle: React.CSSProperties = {
  background: '#1A1B23',
  color: '#E1E1E6',
  border: '1px solid #2D2E39',
  borderRadius: 6,
  padding: '6px 8px',
  fontSize: 13,
};

const cardStyle: React.CSSProperties = {
  background: '#15121b',
  border: '1px solid #2D2E39',
  borderRadius: 10,
  padding: 14,
};

const primaryBtn: React.CSSProperties = {
  background: '#a3f185',
  color: '#020f1e',
  border: 'none',
  borderRadius: 6,
  padding: '8px 16px',
  fontWeight: 600,
  fontSize: 13,
  cursor: 'pointer',
};

const ghostBtn: React.CSSProperties = {
  background: 'transparent',
  color: '#9BA1B0',
  border: '1px solid #2D2E39',
  borderRadius: 6,
  padding: '8px 14px',
  fontSize: 13,
  cursor: 'pointer',
};
