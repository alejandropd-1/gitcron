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
import { useT } from '@/hooks/use-translation';
import { useGitStore } from '@/lib/git-store';

const GREEN = '#a3f185';
const CYAN = '#5ed8ff';
const ORANGE = '#fd9d1a';

// Phase 3 / Phase 4: OpenRouter is the primary provider (one key → many models).
const ACTIVE_PROVIDER = 'openrouter';

const OPENROUTER_MODELS: Array<{ id: string; label: string; price: string }> = [
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash (barato)', price: '$0.50 / $3.00' },
  { id: 'google/gemini-3.5-flash', label: 'Gemini 3.5 Flash', price: '$1.50 / $9.00' },
  { id: 'deepseek/deepseek-v4-pro', label: 'DeepSeek V4 Pro', price: '$0.44 / $0.87' },
  { id: 'xiaomi/mimo-v2.5-pro', label: 'MiMo V2.5 Pro', price: '$0.44 / $0.87' },
  { id: 'minimax/minimax-m2.7', label: 'MiniMax M2.7', price: '$0.26 / $1.20' },
  { id: 'anthropic/claude-sonnet-4.5', label: 'Claude Sonnet 4.5 (default)', price: '$3.00 / $15.00' },
  { id: 'openai/gpt-5.5', label: 'GPT-5.5', price: '$5.00 / $30.00' },
];

interface Props {
  repoPath: string;
  repoName: string;
  /** Capa 1: lift the fresh prediction up so the graph can draw it this session. */
  onPrediction?: (result: PredictionResult) => void;
  /** Capa 2C: notify parent when config is saved so threshold filters reactively. */
  onConfigSaved?: (config: TemporalAgentConfig) => void;
}

export function TemporalAgentSettings({ repoPath, repoName, onPrediction, onConfigSaved }: Props) {
  const t = useT();
  const language = useGitStore((s) => s.language);
  const [config, setConfig] = useState<TemporalAgentConfig | null>(null);
  const [notesMd, setNotesMd] = useState<string>('');
  const [showNotes, setShowNotes] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  // AI key state — only a boolean ("is there a key?") and a safe fingerprint are
  // ever read back. The fingerprint is a SHA-256 hash id, NOT part of the key.
  const [hasKey, setHasKey] = useState<boolean | null>(null);
  const [keyFingerprint, setKeyFingerprint] = useState<string | null>(null);
  const [keyDraft, setKeyDraft] = useState('');
  const [savingKey, setSavingKey] = useState(false);

  // Prediction trigger (Phase 4: provider is stubbed in main; draw is Phase 5).
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [predictError, setPredictError] = useState<string | null>(null);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    let alive = true;
    window.api.temporalAgent.loadConfig(repoPath, repoName).then((c) => {
      if (alive) setConfig(c);
    });
    window.api.ai.hasKey(ACTIVE_PROVIDER).then((r) => {
      if (alive) setHasKey(r.success ? Boolean(r.data) : false);
    });
    window.api.ai.keyFingerprint(ACTIVE_PROVIDER).then((r) => {
      if (alive) setKeyFingerprint(r.success ? r.data ?? null : null);
    });
    return () => {
      alive = false;
    };
  }, [repoPath, repoName]);

  async function refreshHasKey() {
    const [hasR, fpR] = await Promise.all([
      window.api.ai.hasKey(ACTIVE_PROVIDER),
      window.api.ai.keyFingerprint(ACTIVE_PROVIDER),
    ]);
    setHasKey(hasR.success ? Boolean(hasR.data) : false);
    setKeyFingerprint(fpR.success ? fpR.data ?? null : null);
  }

  async function predict() {
    setPredicting(true);
    setPredictError(null);
    setCancelled(false);
    try {
      const r = await window.api.ai.predictTimelines(repoPath, repoName, language);
      if (r.success && r.data) {
        setResult(r.data);
        // Capa 1: lift the result so the graph draws it (main already persisted it).
        onPrediction?.(r.data);
      } else {
        setPredictError(r.error ?? 'Prediction failed');
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('AbortError') || msg.includes('cancelada')) {
        setCancelled(true);
        setTimeout(() => setCancelled(false), 4000);
      } else {
        setPredictError(msg);
      }
    } finally {
      setPredicting(false);
    }
  }

  async function cancelPrediction() {
    await window.api.ai.cancelPrediction();
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
    setSaveError(null);
    try {
      await window.api.temporalAgent.saveConfig(repoPath, config);
      const now = Date.now();
      setSavedAt(now);
      setTimeout(() => setSavedAt((ts) => (ts === now ? null : ts)), 3000);
      onConfigSaved?.(config);
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : String(e));
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
          {t('temporalAgent.experimental')}
        </span>
      </header>
      <p style={{ fontSize: 13, color: '#9BA1B0', margin: 0 }}>
        {t('temporalAgent.description', { repo: repoName })}
      </p>

      {/* Enable */}
      <Row label={t('temporalAgent.enableLabel')}>
        <Toggle on={config.enabled} onChange={(v) => patch({ enabled: v })} />
      </Row>

      {/* Frequency */}
      <Row label={t('temporalAgent.frequencyLabel')}>
        <select
          value={config.frequency}
          onChange={(e) => patch({ frequency: e.target.value as AnalysisFrequency })}
          style={selectStyle}
        >
          <option value="on-demand">{t('temporalAgent.freqOnDemand')}</option>
          <option value="manual">{t('temporalAgent.freqManual')}</option>
          <option value="daily">{t('temporalAgent.freqDaily')}</option>
          <option value="weekly">{t('temporalAgent.freqWeekly')}</option>
        </select>
      </Row>

      {/* Privacy scope */}
      <Row label={t('temporalAgent.contextLabel')}>
        <select
          value={config.privacyScope}
          onChange={(e) => patch({ privacyScope: e.target.value as PrivacyScope })}
          style={selectStyle}
        >
          <option value="metadata">{t('temporalAgent.scopeMetadata')}</option>
          <option value="metadata-plus-files">{t('temporalAgent.scopeMetadataPlus')}</option>
        </select>
      </Row>
      {config.privacyScope === 'metadata-plus-files' && (
        <p style={{ fontSize: 12, color: ORANGE, margin: 0 }}>
          {t('temporalAgent.filenamesWarning')}
        </p>
      )}

      {/* Skill profile */}
      <div style={cardStyle}>
        <h4 style={{ fontSize: 13, fontWeight: 600, margin: '0 0 10px', color: GREEN }}>
          {t('temporalAgent.focusProfileHeading')}
        </h4>
        <TagInput
          label={t('temporalAgent.focusAreas')}
          tags={config.skillProfile.focusAreas}
          color={GREEN}
          onChange={(tags) => patchSkill({ focusAreas: tags })}
        />
        <TagInput
          label={t('temporalAgent.avoidTopics')}
          tags={config.skillProfile.avoidTopics}
          color={ORANGE}
          onChange={(tags) => patchSkill({ avoidTopics: tags })}
        />
        <Row label={t('temporalAgent.confidenceThreshold', { val: config.skillProfile.confidenceThreshold.toFixed(2) })}>
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
          {t('temporalAgent.aiAccessHeading')}
        </h4>
        <Row label={t('temporalAgent.apiKeyStatus')}>
          {hasKey === null ? (
            <span style={{ fontSize: 12, color: '#9BA1B0' }}>{t('temporalAgent.keyChecking')}</span>
          ) : hasKey ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
              <span style={{ fontSize: 12, color: GREEN }}>{t('temporalAgent.keyConfigured')}</span>
              {keyFingerprint && (
                <code style={{ fontSize: 11, color: '#9BA1B0', fontFamily: 'JetBrains Mono, monospace' }}>
                  {t('temporalAgent.keyFingerprint', { fp: keyFingerprint })}
                </code>
              )}
            </div>
          ) : (
            <span style={{ fontSize: 12, color: ORANGE }}>{t('temporalAgent.keyNotSet')}</span>
          )}
        </Row>
        <p style={{ fontSize: 12, color: '#9BA1B0', margin: '0 0 8px' }}>
          {t('temporalAgent.keyDescription')}
        </p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            type="password"
            value={keyDraft}
            onChange={(e) => setKeyDraft(e.target.value)}
            placeholder={hasKey ? t('temporalAgent.keyPlaceholderReplace') : t('temporalAgent.keyPlaceholderPaste')}
            autoComplete="off"
            style={{ ...selectStyle, flex: 1 }}
          />
          <button onClick={saveKey} disabled={savingKey || !keyDraft.trim()} style={primaryBtn}>
            {savingKey ? t('temporalAgent.saving') : t('temporalAgent.saveKey')}
          </button>
          {hasKey && (
            <button onClick={removeKey} style={ghostBtn}>
              {t('temporalAgent.removeKey')}
            </button>
          )}
        </div>

        {/* Model id — NOT a secret; saved in plain config with the rest of the prefs. */}
        <div style={{ marginTop: 12 }}>
          <label style={{ fontSize: 12, color: '#9BA1B0', display: 'block', marginBottom: 6 }}>
            {t('temporalAgent.modelLabel')}
          </label>
          <ModelSelect
            value={config.model ?? ''}
            onChange={(v) => patch({ model: v })}
          />
          {config.model && (
            <p style={{ fontSize: 11, color: GREEN, margin: '6px 0 0' }}>
              {t('temporalAgent.modelActive')}{' '}
              <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{config.model}</code>
            </p>
          )}
          {!config.model && (
            <p style={{ fontSize: 11, color: '#697789', margin: '6px 0 0' }}>
              {t('temporalAgent.modelEmptyPrefix')}{' '}
              <code>anthropic/claude-sonnet-4.5</code>
              {t('temporalAgent.modelEmptySuffix')}
            </p>
          )}
        </div>
      </div>

      {/* Prediction trigger — visually distinct from save/config: this is the expensive action. */}
      <div style={{ ...cardStyle, borderColor: `${CYAN}50` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {predicting ? (
            <>
              <button
                disabled
                style={{
                  ...primaryBtn,
                  background: '#2D2E39',
                  color: CYAN,
                  border: `1px solid ${CYAN}40`,
                  fontWeight: 600,
                  fontSize: 14,
                  padding: '12px 24px',
                  minWidth: 180,
                  cursor: 'wait',
                }}
              >
                {t('temporalAgent.generating')}
              </button>
              <button
                onClick={cancelPrediction}
                style={{
                  ...ghostBtn,
                  color: ORANGE,
                  borderColor: `${ORANGE}50`,
                  fontSize: 12,
                  padding: '8px 16px',
                }}
              >
                {t('common.cancel')}
              </button>
            </>
          ) : (
            <button
              onClick={predict}
              style={{
                ...primaryBtn,
                background: CYAN,
                color: '#020f1e',
                fontWeight: 700,
                fontSize: 15,
                padding: '14px 28px',
                border: 'none',
                borderRadius: 10,
                minWidth: 220,
                boxShadow: `0 0 18px ${CYAN}30`,
                cursor: 'pointer',
              }}
            >
              {t('temporalAgent.predictBtn')}
            </button>
          )}
          <span style={{ fontSize: 12, color: '#697789', maxWidth: 220, lineHeight: 1.4 }}>
            {t('temporalAgent.predictDesc')}{' '}
            <strong style={{ color: ORANGE }}>{t('temporalAgent.predictCost')}</strong>
          </span>
        </div>
        {cancelled && (
          <p style={{ fontSize: 12, color: '#9eacc0', margin: '10px 0 0' }}>
            {t('temporalAgent.cancelled')}
          </p>
        )}
        {predictError && (
          <p style={{ fontSize: 12, color: ORANGE, margin: '10px 0 0' }}>Error: {predictError}</p>
        )}
        {result && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#cbc3d7' }}>
            <div style={{ color: GREEN, marginBottom: 6 }}>
              {result.branches.length} branch{result.branches.length === 1 ? '' : 'es'} {t('temporalAgent.resultFrom')}{' '}
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

      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
        <button onClick={save} disabled={saving} style={primaryBtn}>
          {saving ? t('temporalAgent.saving') : t('temporalAgent.save')}
        </button>
        <button onClick={openNotes} style={ghostBtn}>
          {t('temporalAgent.viewNotes')}
        </button>
        {savedAt && (
          <span style={{ fontSize: 12, color: GREEN, fontWeight: 600 }}>
            {t('temporalAgent.savedConfirmation')}
          </span>
        )}
        {saveError && (
          <span style={{ fontSize: 12, color: ORANGE }}>
            Error: {saveError}
          </span>
        )}
      </div>

      {/* Active config summary */}
      <div style={{ ...cardStyle, fontSize: 11, color: '#697789', lineHeight: 1.6 }}>
        <strong style={{ color: '#9BA1B0', fontSize: 12 }}>{t('temporalAgent.configSummaryLabel')}</strong>{' '}
        {config.enabled ? <span style={{ color: GREEN }}>on</span> : <span style={{ color: ORANGE }}>off</span>}
        {' · '}scope: {config.privacyScope}
        {' · '}modelo: <code style={{ fontFamily: 'JetBrains Mono, monospace' }}>{config.model || 'default'}</code>
        {' · '}threshold: {config.skillProfile.confidenceThreshold.toFixed(2)}
        {' · '}freq: {config.frequency}
        {config.skillProfile.focusAreas.length > 0 && (
          <>
            <br />
            focus: {config.skillProfile.focusAreas.join(', ')}
          </>
        )}
      </div>

      {showNotes && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <strong style={{ fontSize: 12, color: CYAN }}>{t('temporalAgent.notesHeading')}</strong>
            <button onClick={() => setShowNotes(false)} style={ghostBtn}>
              {t('common.close')}
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
            {notesMd || t('temporalAgent.notesEmpty')}
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

function ModelSelect({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const t = useT();
  const [customMode, setCustomMode] = useState(false);
  const knownIds = OPENROUTER_MODELS.map((m) => m.id);
  const isKnown = knownIds.includes(value);
  const selectValue = !value ? '' : isKnown ? value : '__custom__';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <select
        value={customMode ? '__custom__' : selectValue}
        onChange={(e) => {
          const v = e.target.value;
          if (v === '__custom__') {
            setCustomMode(true);
            onChange('');
          } else {
            setCustomMode(false);
            onChange(v);
          }
        }}
        style={{ ...selectStyle, width: '100%' }}
      >
        <option value="">{t('temporalAgent.modelDefaultOption')}</option>
        {OPENROUTER_MODELS.map((m) => (
          <option key={m.id} value={m.id}>
            {m.label} — {m.price}/M tokens
          </option>
        ))}
        <option value="__custom__">{t('temporalAgent.modelCustomOption')}</option>
      </select>
      {(customMode || (!isKnown && value)) && (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={t('temporalAgent.modelCustomPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          style={{ ...selectStyle, width: '100%' }}
        />
      )}
    </div>
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
  const t = useT();
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
        {tags.map((tag) => (
          <span
            key={tag}
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
            {tag}
            <button
              onClick={() => onChange(tags.filter((x) => x !== tag))}
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
        placeholder={t('temporalAgent.tagPlaceholder')}
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
