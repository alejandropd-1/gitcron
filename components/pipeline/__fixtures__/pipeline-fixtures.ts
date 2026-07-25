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
  availableSources: ['git', 'hermes', 'runtime', 'kit'],
  hermesConnected: true,
  hasPipelineActivity: true,
  now: {
    headlineKey: 'pipeline.now.idle',
    runtime: null,
    role: null,
    taskLabel: null,
    tasksDone: null,
    tasksTotal: null,
    elapsedMs: null,
    costUsd: null,
    costBasis: 'unknown',
    needsHuman: false,
  },
  stations: [],
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
};

/** Auditoría en curso, costo informado por el runtime. */
export const RUNNING_SNAPSHOT: PipelineSnapshot = {
  ...BASE,
  now: {
    headlineKey: 'pipeline.now.auditing',
    runtime: 'codex',
    role: 'auditor',
    taskLabel: 'runtime-adapters',
    tasksDone: 3,
    tasksTotal: 7,
    elapsedMs: 8 * 60 * 1000 + 12 * 1000,
    costUsd: 0.9881,
    costBasis: 'runtime_reported',
    needsHuman: false,
  },
  stations: [
    { id: 'proposal', state: 'done', humanGate: false, detailKey: null },
    { id: 'approval', state: 'done', humanGate: true, detailKey: null },
    { id: 'builder', state: 'done', humanGate: false, detailKey: null },
    { id: 'gates', state: 'done', humanGate: false, detailKey: null },
    { id: 'auditor', state: 'current', humanGate: false, detailKey: null },
    { id: 'fixer', state: 'possible', humanGate: false, detailKey: null },
    { id: 'merge', state: 'possible', humanGate: true, detailKey: null },
  ],
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
    { entryId: 'a1', channel: 'narrative', text: 'Arranca la auditoría del change.', at: null, agentId: 'orch-1' },
    { entryId: 'a2', channel: 'reasoning', text: 'Reviso el contrato del adaptador…', at: null, agentId: 'aud-1' },
    { entryId: 'a3', channel: 'reasoning', text: 'Comparo contra el fixture citado…', at: null, agentId: 'aud-1' },
    { entryId: 'a4', channel: 'reasoning', text: 'Los valores no coinciden.', at: null, agentId: 'aud-1' },
    { entryId: 'a5', channel: 'tool', text: 'leer archivo runtime-adapter.ts', at: null, agentId: 'aud-1' },
    { entryId: 'a6', channel: 'file', text: 'electron/pipeline/runtime-adapters/lmstudio-adapter.ts', at: null, agentId: 'aud-1' },
    { entryId: 'a7', channel: 'system', text: 'Controles automáticos: VERDE', at: null, agentId: null },
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
  proposal: {
    title: 'Fase 04 — Workspace visual per-repo',
    version: '1.0.0',
    markdownContent: `# Propuesta F04 — Workspace Pipeline UI

## Objetivos principales
- Construir el workspace visual per-repo en la solapa Pipeline.
- Respetar honestidad de datos: \`unknown\` nunca es 0.
- Reutilizar \`DiffViewer\` perezosamente y mostrar auditoría estructurada.

> **Nota:** La evidencia de ejecución no inventa valores faltantes.`,
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
  auditorFindings: [
    {
      id: 'find-1',
      category: 'Seguridad / Datos',
      description: 'Verificar que las claves sensibles o payload no autorizado no se rendericen en plano.',
      file: 'components/pipeline/PipelineWorkspace.tsx',
      line: 42,
      risk: 'low',
      recommendation: 'Mantener sanitización estricta antes de renderizar.',
    },
  ],
  gateHistory: [
    { gateId: 'C1', name: 'Typecheck (tsc)', status: 'VERDE', checkedAt: '17:40:00', details: '0 errores' },
    { gateId: 'C2', name: 'Dependencias (deps)', status: 'VERDE', checkedAt: '17:40:05', details: 'Sin librerías prohibidas' },
    { gateId: 'C3', name: 'Gobernanza protegida', status: 'VERDE', checkedAt: '17:40:10', details: 'Sin modificación de reglas base' },
    { gateId: 'C4', name: 'Pruebas (tests)', status: 'VERDE', checkedAt: '17:40:15', details: '409/409 tests OK' },
    { gateId: 'C6', name: 'OpenSpec strict', status: 'VERDE', checkedAt: '17:40:20', details: 'Esquema conforme' },
  ],
};

/**
 * Proveedor local: costo 0 real, pero por ausencia de precio, no por descuento.
 * La UI debe mostrarlo como "local, sin precio por token" y no como gratis.
 */
export const LOCAL_UNPRICED_SNAPSHOT: PipelineSnapshot = {
  ...RUNNING_SNAPSHOT,
  now: {
    ...RUNNING_SNAPSHOT.now,
    runtime: 'lmstudio',
    costUsd: null,
    costBasis: 'local_unpriced',
  },
};

/** El auditor rechazó: el recorrido vuelve al fixer. */
export const REJECTED_SNAPSHOT: PipelineSnapshot = {
  ...BASE,
  now: {
    ...BASE.now,
    headlineKey: 'pipeline.now.fixing',
    runtime: 'claude',
    role: 'fixer',
    taskLabel: 'corregir hallazgos',
    elapsedMs: 45 * 1000,
    costUsd: null,
    costBasis: 'unknown',
    needsHuman: true,
  },
  stations: [
    { id: 'proposal', state: 'done', humanGate: false, detailKey: null },
    { id: 'approval', state: 'done', humanGate: true, detailKey: null },
    { id: 'builder', state: 'done', humanGate: false, detailKey: null },
    { id: 'gates', state: 'done', humanGate: false, detailKey: null },
    { id: 'auditor', state: 'rejected', humanGate: false, detailKey: null },
    { id: 'fixer', state: 'current', humanGate: false, detailKey: null },
    { id: 'merge', state: 'possible', humanGate: true, detailKey: null },
  ],
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
  auditorFindings: [
    {
      id: 'find-rej-1',
      category: 'Dependencias no aprobadas',
      description: 'Intento de agregar paquete no autorizado "react-markdown" sin aprobación explícita.',
      file: 'package.json',
      line: 116,
      risk: 'high',
      recommendation: 'Usar formateador seguro propio o pedir autorización explícita a Ale.',
    },
  ],
  gateHistory: [
    { gateId: 'C1', name: 'Typecheck (tsc)', status: 'VERDE', checkedAt: '17:40:00', details: '0 errores' },
    { gateId: 'C2', name: 'Dependencias (deps)', status: 'ROJO', checkedAt: '17:40:05', details: 'Falló por nueva dependencia no aprobada' },
    { gateId: 'C3', name: 'Gobernanza protegida', status: 'VERDE', checkedAt: '17:40:10', details: 'OK' },
    { gateId: 'C4', name: 'Pruebas (tests)', status: 'VERDE', checkedAt: '17:40:15', details: 'OK' },
    { gateId: 'C6', name: 'OpenSpec strict', status: 'VERDE', checkedAt: '17:40:20', details: 'OK' },
  ],
};

export const FIXTURES = {
  running: RUNNING_SNAPSHOT,
  localUnpriced: LOCAL_UNPRICED_SNAPSHOT,
  rejected: REJECTED_SNAPSHOT,
} as const;
