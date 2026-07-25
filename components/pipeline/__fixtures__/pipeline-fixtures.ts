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
};

export const FIXTURES = {
  running: RUNNING_SNAPSHOT,
  localUnpriced: LOCAL_UNPRICED_SNAPSHOT,
  rejected: REJECTED_SNAPSHOT,
} as const;
