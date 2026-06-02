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
import { Copy, Check, Brain } from 'lucide-react';

const GREEN = '#a3f185';
const CYAN = '#5ed8ff';
const ORANGE = '#fd9d1a';

// Phase 3 / Phase 4: OpenRouter is the primary provider (one key → many models).
const ACTIVE_PROVIDER = 'openrouter';

export function CopyButton({ text }: { text: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={handleCopy}
        style={{
          width: 28,
          height: 28,
          flexShrink: 0,
          borderRadius: 6,
          border: '1px solid rgba(217, 231, 252, 0.15)',
          background: 'rgba(217, 231, 252, 0.035)',
          color: '#9eacc0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all 0.2s',
          cursor: 'pointer',
          outline: 'none',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(163, 241, 133, 0.35)';
          e.currentTarget.style.background = 'rgba(217, 231, 252, 0.1)';
          e.currentTarget.style.color = '#a3f185';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(217, 231, 252, 0.15)';
          e.currentTarget.style.background = 'rgba(217, 231, 252, 0.035)';
          e.currentTarget.style.color = '#9eacc0';
        }}
        title={t('common.copy')}
      >
        {copied ? <Check size={14} style={{ color: '#a3f185' }} /> : <Copy size={14} />}
      </button>
      {copied && (
        <span
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%) translateY(-6px)',
            background: '#0D0E12',
            color: GREEN,
            border: `1px solid ${GREEN}30`,
            fontSize: 10,
            padding: '3px 8px',
            borderRadius: 4,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            fontFamily: 'sans-serif',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}
        >
          {t('common.copied')}
        </span>
      )}
    </div>
  );
}

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

  // States for interactive thinking messages and progress bar
  const [progress, setProgress] = useState(0);
  const [currentThought, setCurrentThought] = useState('');

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
    setResult(null);
    try {
      if (config) {
        await window.api.temporalAgent.saveConfig(repoPath, config);
        onConfigSaved?.(config);
      }
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

  // Curated list of funny and thoughtful loading phrases in Spanish and English (50+ items)
  const THOUGHTS_ES = [
    'Alineando los punteros del reflog...',
    'Analizando la entropía de tus commits recientes...',
    'Evitando bucles infinitos en el continuo espacio-tiempo...',
    'Consultando las profecías de Linus Torvalds...',
    'Persuadiendo a la IA de no generar conflictos de merge...',
    'Ignorando node_modules con extrema firmeza...',
    'Buscando ramas en universos paralelos...',
    'Calculando la probabilidad de romper producción (esperemos que 0%)...',
    'Descifrando mensajes de commit misteriosos...',
    'Summoning the Garbage Collector daemon...',
    'Verificando si dejaste contraseñas en el código (por las dudas)...',
    'Preguntándole al oráculo de git qué viene ahora...',
    'Buscando la iluminación en un mar de diffs...',
    'Tratando de entender por qué esa función tiene 32 parámetros...',
    'Conectando hemisferios cuánticos del Temporal Agent...',
    'Configurando condensador de flujos temporal...',
    'Alimentando a los hámsteres que hacen girar el servidor...',
    'Negociando diplomáticamente con el recolector de basura...',
    'Buscando café virtual para el agente de IA...',
    'Desenrollando bucles infinitos con mucho cuidado...',
    'Calculando la probabilidad de que funcione a la primera (99.9% de fe)...',
    'Pidiéndole permiso a Git para ver el futuro...',
    'Ocultando los bugs debajo de la alfombra de node_modules...',
    'Preguntándole a StackOverflow si esto es legal...',
    'Optimizando la velocidad de la luz en el cable de red...',
    'Alineando planetas para evitar conflictos en main...',
    'Traduciendo pensamientos analógicos a binario...',
    'Resolviendo discusiones filosóficas entre pestañas y espacios...',
    'Buscando ese punto y coma que falta desde 2024...',
    'Ignorando advertencias de compilación para mantener la paz mental...',
    'Acelerando taquiones para viajar al próximo commit...',
    'Hablando con el router en tonos amables...',
    'Reescribiendo la historia sin que Git se dé cuenta...',
    'Explicándole a la IA por qué borrar la carpeta System32 es mala idea...',
    'Enviando pings al espacio exterior...',
    'Borrando el historial de búsqueda del compilador...',
    'Alineando el reflog con la luna llena...',
    'Despertando a los duendes del procesamiento paralelo...',
    'Preguntándole a la IA si sueña con ovejas eléctricas o con commits limpios...',
    'Desactivando temporalmente las leyes de la física...',
    'Esperando a que el café haga efecto en el procesador...',
    'Limpiando el polvo digital del repositorio...',
    'Tratando de convencer a Windows Defender de que somos inocentes...',
    'Convirtiendo cafeína en código a nivel cuántico...',
    'Calentando los núcleos del procesador con algoritmos recursivos...',
    'Buscando la salida del laberinto del git rebase...',
    'Borrando cachés con desprecio...',
    'Evitando que el becario virtual rompa el grafo...',
    'Alineando los electrones en la memoria RAM...',
    'Negociando con Git para que acepte nuestra teoría del caos...',
    'Ordenando el caos cósmico de tus ramas locales...',
    'Revisando si las constantes siguen siendo constantes...',
    'Limpiando huellas digitales del reflog...',
    'Buscando el santo grial de la refactorización perfecta...',
    'Evitando que la IA se vuelva autoconsciente antes del push...',
    'Intentando entender por qué funciona pero no sabemos cómo...',
    'Peinando los grafos del árbol de Git...',
    'Preguntándole a Ada Lovelace qué opina de tu arquitectura...',
    'Comprando tiempo en la nube cuántica...',
    'Descartando posibilidades donde todo explota en producción...',
    'Sincronizando el reloj del sistema con la era espacial...',
    'Planchando arrugas temporales en la línea de tiempo...',
    'Dándole golpecitos virtuales al servidor a ver si arranca...',
    'Traduciendo bits tristes a bits felices...',
    'Invocando al espíritu de Alan Turing...',
    'Evitando que los commits se peleen entre sí...',
    'Despejando el camino especulativo de falsos positivos...'
  ];

  const THOUGHTS_EN = [
    'Aligning reflog pointers...',
    'Analyzing entropy of your recent commits...',
    'Avoiding infinite loops in the space-time continuum...',
    'Consulting with the prophecies of Linus Torvalds...',
    'Persuading the AI not to generate merge conflicts...',
    'Ignoring node_modules with extreme resolve...',
    'Searching for branches in parallel universes...',
    'Calculating probability of breaking production (hopefully 0%)...',
    'Deciphering mysterious commit messages...',
    'Summoning the Garbage Collector daemon...',
    'Double-checking you didn\'t commit secrets (just in case)...',
    'Asking the Git oracle what comes next...',
    'Seeking enlightenment in a sea of diffs...',
    'Trying to understand why that function has 32 parameters...',
    'Connecting quantum hemispheres of the Temporal Agent...',
    'Configuring the temporal flux capacitor...',
    'Feeding the hamsters that spin the server...',
    'Diplomatically negotiating with the garbage collector...',
    'Fetching virtual coffee for the AI agent...',
    'Carefully unrolling infinite loops...',
    'Calculating the probability of it working on the first run (99.9% faith)...',
    'Asking Git permission to see the future...',
    'Hiding bugs under the node_modules rug...',
    'Asking StackOverflow if this is legal...',
    'Optimizing the speed of light in the network cable...',
    'Aligning planets to avoid conflicts in main...',
    'Translating analog thoughts to binary...',
    'Resolving philosophical arguments between tabs and spaces...',
    'Searching for that missing semicolon since 2024...',
    'Ignoring compiler warnings to maintain peace of mind...',
    'Accelerating tachyons to travel to the next commit...',
    'Talking to the router in friendly tones...',
    'Rewriting history without Git noticing...',
    'Explaining to the AI why deleting System32 is a bad idea...',
    'Sending pings to outer space...',
    'Clearing the compiler\'s search history...',
    'Aligning the reflog with the full moon...',
    'Waking up the parallel processing elves...',
    'Asking the AI if it dreams of electric sheep or clean commits...',
    'Temporarily disabling the laws of physics...',
    'Waiting for coffee to take effect on the processor...',
    'Dusting the digital shelves of the repository...',
    'Trying to convince Windows Defender that we are innocent...',
    'Converting caffeine into code at a quantum level...',
    'Warming up CPU cores with recursive algorithms...',
    'Searching for the exit of the git rebase maze...',
    'Deleting caches with disdain...',
    'Preventing the virtual intern from breaking the graph...',
    'Aligning electrons in RAM...',
    'Negotiating with Git to accept our chaos theory...',
    'Ordering the cosmic chaos of your local branches...',
    'Checking if constants are still constant...',
    'Wiping digital fingerprints from the reflog...',
    'Searching for the holy grail of perfect refactoring...',
    'Preventing the AI from becoming self-aware before the push...',
    'Trying to understand why it works but we don\'t know how...',
    'Combing the Git tree graphs...',
    'Asking Ada Lovelace what she thinks of your architecture...',
    'Buying time in the quantum cloud...',
    'Discarding possibilities where everything blows up in prod...',
    'Synchronizing system clock with the space era...',
    'Ironing out temporal wrinkles in the timeline...',
    'Tapping the virtual server to see if it boots...',
    'Translating sad bits to happy bits...',
    'Summoning the spirit of Alan Turing...',
    'Preventing commits from fighting each other...',
    'Clearing the speculative path of false positives...'
  ];

  useEffect(() => {
    if (!predicting) {
      if (result) {
        setProgress(100);
      }
      return;
    }

    setProgress(0);
    const thoughts = language === 'en' ? THOUGHTS_EN : THOUGHTS_ES;
    const getRandomThought = (prev?: string) => {
      const filtered = prev ? thoughts.filter(t => t !== prev) : thoughts;
      return filtered[Math.floor(Math.random() * filtered.length)];
    };
    
    setCurrentThought(getRandomThought());

    // Cycle thoughts every 2.8 seconds
    const thoughtInterval = setInterval(() => {
      setCurrentThought(prev => getRandomThought(prev));
    }, 2800);

    // Smooth decaying progress bar towards 95%
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) return prev + (99 - prev) * 0.02; // crawl near the end
        return prev + (95 - prev) * 0.08; // asymptotic rise
      });
    }, 300);

    return () => {
      clearInterval(thoughtInterval);
      clearInterval(progressInterval);
    };
  }, [predicting, language, result]);

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
        <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, color: '#697789', flex: 1, minWidth: 200, lineHeight: 1.4 }}>
            {t('temporalAgent.predictDesc')}{' '}
            <strong style={{ color: ORANGE }}>{t('temporalAgent.predictCost')}</strong>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
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
                    fontSize: 13,
                    padding: '10px 20px',
                    minWidth: 160,
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
                  fontSize: 14,
                  padding: '12px 24px',
                  border: 'none',
                  borderRadius: 8,
                  minWidth: 180,
                  boxShadow: `0 0 14px ${CYAN}25`,
                  cursor: 'pointer',
                }}
              >
                {t('temporalAgent.predictBtn')}
              </button>
            )}
          </div>
        </div>
        {predicting && (
          <div style={{ marginTop: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12 }}>
              <span style={{ color: CYAN, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 500 }}>
                <Brain size={14} className="animate-pulse" style={{ color: CYAN }} />
                <span style={{ color: '#d9e7fc', opacity: 0.95 }}>{currentThought}</span>
              </span>
              <span style={{ color: '#9eacc0', fontFamily: 'monospace', fontSize: 11 }}>{Math.round(progress)}%</span>
            </div>
            {/* Progress Bar Container */}
            <div style={{ width: '100%', height: 4, background: '#1A1B23', borderRadius: 2, overflow: 'hidden', border: '1px solid rgba(217, 231, 252, 0.05)' }}>
              <div
                style={{
                  height: '100%',
                  width: `${progress}%`,
                  background: `linear-gradient(90deg, ${CYAN}, ${GREEN})`,
                  borderRadius: 2,
                  transition: 'width 0.3s cubic-bezier(0.1, 0.8, 0.25, 1)',
                }}
              />
            </div>
          </div>
        )}
        {cancelled && (
          <p style={{ fontSize: 12, color: '#9eacc0', margin: '10px 0 0' }}>
            {t('temporalAgent.cancelled')}
          </p>
        )}
        {predictError && (
          <p style={{ fontSize: 12, color: ORANGE, margin: '10px 0 0' }}>Error: {predictError}</p>
        )}
        {result && (
          <div style={{ marginTop: 12, padding: '10px 14px', background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: GREEN, fontWeight: 'bold', fontSize: 14 }}>✓</span>
            <span style={{ color: '#d9e7fc', fontSize: 12 }}>
              {language === 'en'
                ? 'Prediction completed successfully! New speculative branches have been generated in your graph.'
                : '¡Predicción completada con éxito! Se han generado las nuevas ramas especulativas en tu gráfico.'}
            </span>
          </div>
        )}
        {result && (
          <div style={{ marginTop: 14, fontSize: 12, color: '#cbc3d7' }}>
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
      <div style={{ ...cardStyle, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <strong style={{ color: '#9BA1B0', fontSize: 12 }}>{t('temporalAgent.configSummaryLabel')}</strong>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 12px', fontSize: 11, color: '#9BA1B0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#697789' }}>status:</span>
            {config.enabled ? (
              <span style={{ color: GREEN, fontWeight: 'bold', background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 4, padding: '1px 6px' }}>on</span>
            ) : (
              <span style={{ color: ORANGE, fontWeight: 'bold', background: `${ORANGE}10`, border: `1px solid ${ORANGE}30`, borderRadius: 4, padding: '1px 6px' }}>off</span>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#697789' }}>scope:</span>
            <span style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30`, borderRadius: 4, padding: '1px 6px' }}>{config.privacyScope}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#697789' }}>modelo:</span>
            <code style={{ color: CYAN, fontFamily: 'JetBrains Mono, monospace', background: `${CYAN}10`, border: `1px solid ${CYAN}30`, borderRadius: 4, padding: '1px 6px' }}>{config.model || 'default'}</code>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#697789' }}>threshold:</span>
            <span style={{ color: GREEN, background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 4, padding: '1px 6px' }}>{config.skillProfile.confidenceThreshold.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: '#697789' }}>freq:</span>
            <span style={{ color: CYAN, background: `${CYAN}10`, border: `1px solid ${CYAN}30`, borderRadius: 4, padding: '1px 6px' }}>{config.frequency}</span>
          </div>
          {config.skillProfile.focusAreas.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: '100%' }}>
              <span style={{ color: '#697789' }}>focus:</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {config.skillProfile.focusAreas.map(f => (
                  <span key={f} style={{ color: GREEN, background: `${GREEN}10`, border: `1px solid ${GREEN}30`, borderRadius: 4, padding: '1px 6px' }}>{f}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showNotes && (
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <strong style={{ fontSize: 12, color: CYAN }}>{t('temporalAgent.notesHeading')}</strong>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <CopyButton text={notesMd || ''} />
              <button onClick={() => setShowNotes(false)} style={ghostBtn}>
                {t('common.close')}
              </button>
            </div>
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
