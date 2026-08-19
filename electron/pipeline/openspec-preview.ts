import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type {
  OpenSpecEngineStatus,
  OpenSpecOutputItem,
  OpenSpecPreviewResult,
  OpenSpecUpdatePlan,
} from '../../types/pipeline';
import { deriveUpdateMatrixAction } from '../../lib/openspec-update-guide';

/** Tope de lectura de `openspec/config.yaml`: archivo de configuración, no evidencia arbitraria. */
const MAX_SCHEMA_CONFIG_BYTES = 64 * 1024;

export interface RepoSchemaConfig {
  /** Valor de la clave `schema:` que gobierna los cambios del repositorio. `null` si no se pudo leer. */
  schemaName: string | null;
  /** Contenido crudo del `openspec/config.yaml`. `null` si no existe o no se pudo leer. */
  repoConfigRaw: string | null;
}

export interface GeneratePreviewOptions {
  repoPath: string;
  engineStatus: OpenSpecEngineStatus;
  targetVersion?: string;
  gitInfo?: {
    branch?: string | null;
    headCommit?: string | null;
    workingTreeFingerprint?: string | null;
  };
  /** Schema/config del repositorio (2.12): `readRepoSchemaConfig` lo provee desde disco. */
  schemaConfig?: RepoSchemaConfig;
  now?: () => Date;
}

/**
 * Lee el schema/config de OpenSpec del repositorio: `openspec/config.yaml`,
 * que declara el schema con el que los cambios se gobiernan (`schema:`).
 * Lectura acotada y tolerante: ausente o ilegible degrada a `null`, nunca falla.
 */
export function readRepoSchemaConfig(repoPath: string): RepoSchemaConfig {
  try {
    const configPath = path.join(repoPath, 'openspec', 'config.yaml');
    const st = fs.statSync(configPath);
    if (!st.isFile() || st.size > MAX_SCHEMA_CONFIG_BYTES) return { schemaName: null, repoConfigRaw: null };
    const raw = fs.readFileSync(configPath, 'utf8');
    const match = /^schema:\s*["']?([A-Za-z0-9_-]+)["']?\s*$/m.exec(raw);
    return { schemaName: match ? match[1] : null, repoConfigRaw: raw };
  } catch {
    return { schemaName: null, repoConfigRaw: null };
  }
}

/**
 * Computa una huella hash SHA-256 determinista para un objeto o estructura.
 */
export function computeFingerprint(data: unknown): string {
  const json = JSON.stringify(data ?? null);
  return createHash('sha256').update(json).digest('hex').slice(0, 16);
}

/**
 * Genera una vista previa diagnóstica de la actualización de OpenSpec.
 *
 * En la Fase 2 (Lote 2), al no existir aún el runtime administrado ejecutable,
 * la vista previa se declara honestamente como `not-available` o `partial`.
 * NUNCA se declara como `exact`.
 */
export function generateDiagnosticPreview(
  options: GeneratePreviewOptions,
): OpenSpecPreviewResult {
  const targetVersion = options.targetVersion ?? '1.8.0';
  const now = options.now ? options.now() : new Date();
  const capturedAt = now.toISOString();

  const cli = options.engineStatus.cli;
  const isAvailable = cli.installed && options.engineStatus.repoState !== 'unknown';

  const previewClass: OpenSpecPreviewResult['previewClass'] = isAvailable ? 'partial' : 'not-available';
  const summary = isAvailable
    ? `Vista previa diagnóstica parcial para versión objetivo ${targetVersion}. Runtime administrado ejecutable no disponible (Fase 2).`
    : `Vista previa no disponible: falta diagnóstico indispensable del motor u hoja de evidencia del repositorio.`;

  const globalConfigFingerprint = computeFingerprint(options.engineStatus.globalConfig);
  const installedEvidenceFingerprint = computeFingerprint(options.engineStatus.installedIntegration);
  const outputInventoryFingerprint = computeFingerprint(
    options.engineStatus.installedIntegration?.outputInventory ?? [],
  );
  // Huella del schema del change y la configuración de OpenSpec del repo (2.12):
  // cambia el `schema:` o el config.yaml ⇒ el plan queda invalidado.
  const schemaConfigFingerprint = computeFingerprint(
    options.schemaConfig ?? { schemaName: null, repoConfigRaw: null },
  );

  // FASE 3 PENDIENTE: `packageIntegrity` es `null` porque en Fase 2 no existe
  // paquete administrado que descargar ni verificar. La comparación en
  // `validatePlanIntegrity` queda inerte A PROPÓSITO (`null === null`) y NO es
  // cobertura existente: se llenará con la integridad real del tarball cuando
  // la POC del runtime administrado (fase 3) la provea. No inventar un valor
  // sustituto ni hashear otra cosa en su lugar.
  const packageIntegrity: string | null = null;

  const outputInventory: OpenSpecOutputItem[] = options.engineStatus.installedIntegration?.outputInventory ?? [];

  return {
    previewClass,
    summary,
    capturedAt,
    outputInventory,
    invalidationParams: {
      repoPath: options.repoPath,
      branch: options.gitInfo?.branch ?? null,
      headCommit: options.gitInfo?.headCommit ?? null,
      workingTreeFingerprint: options.gitInfo?.workingTreeFingerprint ?? 'unknown:unmeasured',
      cliPath: cli.displayPath,
      cliProvenance: cli.provenance,
      cliVersion: cli.runtimeVersion,
      targetVersion,
      packageIntegrity,
      globalConfigFingerprint,
      installedEvidenceFingerprint,
      outputInventoryFingerprint,
      schemaConfigFingerprint,
    },
  };
}

/**
 * Genera el plan diagnóstico completo de actualización respetando la matriz estricta de decisión.
 * Satisface Audit Point 9:
 * - motor ausente + repo no inicializado => init
 * - motor ausente + repo inicializado => blocked
 * - too-old => upgrade-init / upgrade-update
 * - too-new => blocked
 * - repo unknown / integración unknown => blocked
 * - integración conflicted/custom => blocked
 * - integración outdated => update
 * - todo al día => none
 */
export function generateUpdatePlan(options: GeneratePreviewOptions): OpenSpecUpdatePlan {
  const preview = generateDiagnosticPreview(options);
  const requiredAction = deriveUpdateMatrixAction(options.engineStatus);

  return {
    repoPath: options.repoPath,
    requiredAction,
    preview,
    canExecute: false,
    reason: 'Se requiere completar la POC y la activación del runtime administrado (Fase 3/4) antes de ejecutar la actualización real.',
  };
}

/**
 * Comprueba si un plan diagnóstico se mantiene válido frente a un nuevo conjunto de parámetros (2.12).
 * Compara absolutamente todos los campos transportados. Retorna null si es válido, o la clave tipada.
 */
export function validatePlanIntegrity(
  plan: OpenSpecUpdatePlan,
  currentParams: OpenSpecPreviewResult['invalidationParams'],
): string | null {
  const p = plan.preview.invalidationParams;
  if (p.repoPath !== currentParams.repoPath) return 'repo-path-changed';
  if (p.branch !== currentParams.branch) return 'branch-changed';
  if (p.headCommit !== currentParams.headCommit) return 'head-commit-changed';
  if (p.workingTreeFingerprint !== currentParams.workingTreeFingerprint) return 'working-tree-changed';
  if (p.cliPath !== currentParams.cliPath) return 'cli-path-changed';
  if (p.cliProvenance !== currentParams.cliProvenance) return 'cli-provenance-changed';
  if (p.cliVersion !== currentParams.cliVersion) return 'cli-version-changed';
  if (p.targetVersion !== currentParams.targetVersion) return 'target-version-changed';
  if (p.packageIntegrity !== currentParams.packageIntegrity) return 'package-integrity-changed';
  if (p.globalConfigFingerprint !== currentParams.globalConfigFingerprint) return 'global-config-changed';
  if (p.installedEvidenceFingerprint !== currentParams.installedEvidenceFingerprint) return 'evidence-changed';
  if (p.outputInventoryFingerprint !== currentParams.outputInventoryFingerprint) return 'output-inventory-changed';
  if (p.schemaConfigFingerprint !== currentParams.schemaConfigFingerprint) return 'schema-config-changed';
  return null;
}
