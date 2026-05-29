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
} from '@/types/temporal-agent';

const GREEN = '#a3f185';
const CYAN = '#5ed8ff';
const ORANGE = '#fd9d1a';

interface Props {
  repoPath: string;
  repoName: string;
}

export function TemporalAgentSettings({ repoPath, repoName }: Props) {
  const [config, setConfig] = useState<TemporalAgentConfig | null>(null);
  const [notesMd, setNotesMd] = useState<string>('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    window.api.temporalAgent.loadConfig(repoPath, repoName).then((c) => {
      if (alive) setConfig(c);
    });
    return () => {
      alive = false;
    };
  }, [repoPath, repoName]);

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
