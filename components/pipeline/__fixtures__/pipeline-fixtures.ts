import type { PipelineSnapshot } from '../pipeline-view-state';

/**
 * Fixtures visuales de F04.
 *
 * Sirven para recorrer los estados sin backend, tanto en tests como en la
 * revisión de accesibilidad. Ninguno inventa telemetría: donde el runtime no
 * reporta, el valor es `null` y la UI lo muestra como "sin datos".
 */

const BASE: PipelineSnapshot = {
  schemaVersion: '1.0',
  repoId: 'fixture-repo',
  availableSources: ['git', 'openspec', 'runtime'],
  hasPipelineActivity: true,
  decisions: [],
  agents: [],
  activity: [],
  economy: {
    tokens: { input: null, output: null, reasoning: null, cacheRead: null },
    costUsd: null,
    costBasis: 'unknown',
    costCoverage: { withCost: 0, total: 0 },
    contextMaxTokens: null,
    contextCurrentTokens: null,
    compactionCount: null,
    reasoningAvailable: false,
  },
  openSpec: {
    selectedChangeId: null,
    activeChanges: [],
    archivedChanges: [],
    specifications: [],
    reports: [],
    diagnostics: [],
    observedAt: '2026-07-28T10:05:00.000Z',
    latestGate: null,
  },
};

/** Auditoría en curso, costo informado por el runtime. */
export const RUNNING_SNAPSHOT: PipelineSnapshot = {
  ...BASE,
  agents: [
    {
      agentId: 'orch-1',
      parentAgentId: null,
      runtime: 'claude',
      provider: 'Anthropic',
      model: 'claude-opus-5',
      role: 'orchestrator',
      state: 'running',
      elapsedMs: 12 * 60_000,
      inputTokens: 1280,
      outputTokens: 640,
    },
    {
      agentId: 'aud-1',
      parentAgentId: 'orch-1',
      runtime: 'codex',
      provider: 'OpenAI',
      model: 'codex-cli',
      role: 'auditor',
      state: 'running',
      elapsedMs: 8 * 60_000,
      inputTokens: 6113,
      outputTokens: 1078,
    },
    {
      // Runtime sin telemetría: tokens en null, nunca en cero.
      agentId: 'scout-1',
      parentAgentId: 'orch-1',
      runtime: 'agy',
      provider: null,
      model: null,
      role: 'scout',
      state: 'done',
      elapsedMs: 90_000,
      inputTokens: null,
      outputTokens: null,
    },
  ],
  activity: [
    { entryId: 'a1', channel: 'narrative', text: 'Leyó proposal.md, design.md, specs/ y tasks.md para entender el contexto.', at: '2026-07-28T10:02:00.000Z', agentId: 'orch-1' },
    { entryId: 'a2', channel: 'reasoning', text: 'Reviso el contrato del adaptador…', at: '2026-07-28T10:03:00.000Z', agentId: 'aud-1' },
    { entryId: 'a3', channel: 'reasoning', text: 'Comparo contra el fixture citado…', at: '2026-07-28T10:03:10.000Z', agentId: 'aud-1' },
    { entryId: 'a4', channel: 'reasoning', text: 'Los valores no coinciden.', at: '2026-07-28T10:03:20.000Z', agentId: 'aud-1' },
    { entryId: 'a5', channel: 'tool', text: 'Ejecutando pnpm run validate', at: '2026-07-28T10:04:00.000Z', agentId: 'aud-1' },
    { entryId: 'a6', channel: 'file', text: 'Añadidas variables base para colores y modo oscuro.', at: '2026-07-28T10:04:20.000Z', agentId: 'aud-1' },
    { entryId: 'a7', channel: 'system', text: 'openspec validate: passing', at: '2026-07-28T10:05:00.000Z', agentId: null },
  ],
  economy: {
    tokens: { input: 7393, output: 1718, reasoning: 4131, cacheRead: 26368 },
    costUsd: 0.9881,
    costBasis: 'runtime_reported',
    // Un agente de tres no informó costo: la comparación en dinero no es representativa.
    costCoverage: { withCost: 2, total: 3 },
    contextMaxTokens: 262144,
    contextCurrentTokens: 37690,
    compactionCount: 0,
    reasoningAvailable: true,
  },
  diffs: [
    {
      filePath: 'components/pipeline/PipelineWorkspace.tsx',
      agentId: 'orch-1',
      taskId: 'setup-workspace',
      diffContent: `@@ -1,5 +1,8 @@
 import { useT } from '@/hooks/use-translation';
+import { PipelineDetails } from './PipelineDetails';
 
 export function PipelineWorkspace() {
+  // Integración de vista de detalles
 }`,
    },
    {
      filePath: 'electron/pipeline/runtime-adapters/lmstudio-adapter.ts',
      agentId: null,
      taskId: null,
      diffContent: `@@ -10,4 +10,6 @@
 export function adaptLmStudioEnvelope(data: unknown) {
+  // Mapeo honesto de costo local sin precio
   return { costUsd: null, costBasis: 'local_unpriced' };
 }`,
    },
  ],
  openSpec: {
    selectedChangeId: 'add-dark-mode',
    activeChanges: [{
      changeId: 'add-dark-mode',
      intent: 'Añadir modo oscuro con variables CSS y detección de preferencia del sistema.',
      tasks: [
        { id: '1.1', text: 'Add theme context provider', completed: true, line: 1, sourceRef: 'openspec/changes/add-dark-mode/tasks.md' },
        { id: '1.2', text: 'Create toggle component', completed: true, line: 2, sourceRef: 'openspec/changes/add-dark-mode/tasks.md' },
        { id: '2.1', text: 'Add CSS variables', completed: false, line: 3, sourceRef: 'openspec/changes/add-dark-mode/tasks.md' },
        { id: '2.2', text: 'Wire up localStorage', completed: false, line: 4, sourceRef: 'openspec/changes/add-dark-mode/tasks.md' },
      ],
      proposalExists: true,
      designExists: true,
      specsCount: 1,
      validation: 'unknown',
      artifacts: {
        proposal: '## Why\n\nEl sistema no respeta la preferencia de color del sistema operativo.\n\n## What Changes\n\n- Variables CSS por modo\n- Deteccion de `prefers-color-scheme`\n',
        design: '## Context\n\nDatos de vista previa: este contenido no proviene de ningun repositorio.\n',
        tasks: '- [x] 1.1 Add theme context provider\n- [x] 1.2 Create toggle component\n- [ ] 2.1 Add CSS variables\n- [ ] 2.2 Wire up localStorage\n',
        specs: [{
          capability: 'theme-preference',
          content: '## ADDED Requirements\n\n### Requirement: Respeta la preferencia del sistema\n',
          sourceRef: 'openspec/changes/add-dark-mode/specs/theme-preference/spec.md',
        }],
      },
    }],
    archivedChanges: [
      { changeId: 'add-slash-command-support', archivedAt: '2025-01-23', sourceRef: 'openspec/changes/archive/2025-01-23-add-slash-command-support' },
      { changeId: 'sort-active-changes-by-progress', archivedAt: '2025-01-19', sourceRef: 'openspec/changes/archive/2025-01-19-sort-active-changes-by-progress' },
      { changeId: 'update-agent-file-name', archivedAt: '2025-01-16', sourceRef: 'openspec/changes/archive/2025-01-16-update-agent-file-name' },
      { changeId: 'update-agent-instructions', archivedAt: '2025-01-15', sourceRef: 'openspec/changes/archive/2025-01-15-update-agent-instructions' },
    ],
    specifications: [
      { specificationId: 'cli-archive', requirements: 10, sourceRef: 'openspec/specs/cli-archive/spec.md' },
      { specificationId: 'openspec-conventions', requirements: 10, sourceRef: 'openspec/specs/openspec-conventions/spec.md' },
      { specificationId: 'cli-validate', requirements: 9, sourceRef: 'openspec/specs/cli-validate/spec.md' },
      { specificationId: 'cli-list', requirements: 7, sourceRef: 'openspec/specs/cli-list/spec.md' },
      { specificationId: 'cli-view', requirements: 7, sourceRef: 'openspec/specs/cli-view/spec.md' },
      { specificationId: 'cli-init', requirements: 5, sourceRef: 'openspec/specs/cli-init/spec.md' },
      { specificationId: 'cli-update', requirements: 5, sourceRef: 'openspec/specs/cli-update/spec.md' },
      { specificationId: 'cli-change', requirements: 4, sourceRef: 'openspec/specs/cli-change/spec.md' },
      { specificationId: 'cli-spec', requirements: 4, sourceRef: 'openspec/specs/cli-spec/spec.md' },
      { specificationId: 'cli-show', requirements: 3, sourceRef: 'openspec/specs/cli-show/spec.md' },
    ],
    reports: ['docs/reports/add-dark-mode.md'],
    diagnostics: [],
    observedAt: '2026-07-28T10:05:00.000Z',
    latestGate: { result: 'VERDE', mode: 'fast', ts: '2026-07-28T10:05:00.000Z' },
  },
};

/**
 * Proveedor local: costo 0 real, pero por ausencia de precio, no por descuento.
 * La UI debe mostrarlo como "local, sin precio por token" y no como gratis.
 */
export const LOCAL_UNPRICED_SNAPSHOT: PipelineSnapshot = {
  ...RUNNING_SNAPSHOT,
  economy: {
    ...RUNNING_SNAPSHOT.economy,
    // Cero real por ausencia de precio, no por descuento: el proveedor corre en
    // la máquina y nadie le puso tarifa. `null` con base `local_unpriced` lo
    // dice; un 0 en dólares afirmaría que la corrida salió gratis.
    costUsd: null,
    costBasis: 'local_unpriced',
  },
};

/** El auditor rechazó: el recorrido vuelve al fixer. */
export const REJECTED_SNAPSHOT: PipelineSnapshot = {
  ...BASE,
  decisions: [
    {
      decisionId: 'dec-1',
      kind: 'dependency-request',
      // Plantilla de UX-DECISIONES: lenguaje humano, sin nombres de eventos.
      title: 'Quieren agregar "react-markdown" al proyecto.',
      why: 'Una dependencia se mantiene y actualiza a largo plazo, así que la decisión es tuya.',
      options: [
        {
          id: 'view-evidence',
          labelKey: 'pipeline.option.viewEvidence',
          consequence: null,
          availability: 'informational',
        },
        {
          id: 'approve',
          labelKey: 'pipeline.option.approve',
          consequence: 'Se instala y queda en el lockfile del proyecto.',
          availability: 'pending-f05',
        },
      ],
      risk: 'high',
      riskProvenance: 'derived',
      evidenceRefs: ['gates.jsonl', 'pnpm-lock.yaml'],
      technicalContext: '{ "gate": "C2", "status": "ROJO", "package": "react-markdown" }',
      provenance: 'repo',
      evidenceStatus: 'verified',
    },
    {
      decisionId: 'dec-2',
      kind: 'clarification',
      title: 'La IA necesita saber si el panel derecho se oculta.',
      // Sin "por qué" informado: se muestra como dato ausente, no se inventa.
      why: null,
      options: [
        {
          id: 'copy-answer',
          labelKey: 'pipeline.option.copyAnswer',
          consequence: null,
          availability: 'informational',
        },
      ],
      // Riesgo sin evaluar: no puede ordenarse al fondo como si fuera inofensivo.
      risk: 'unknown',
      riskProvenance: null,
      evidenceRefs: [],
      technicalContext: null,
      provenance: 'runtime',
      evidenceStatus: 'unknown',
    },
  ],
};

export const FIXTURES = {
  running: RUNNING_SNAPSHOT,
  localUnpriced: LOCAL_UNPRICED_SNAPSHOT,
  rejected: REJECTED_SNAPSHOT,
} as const;
