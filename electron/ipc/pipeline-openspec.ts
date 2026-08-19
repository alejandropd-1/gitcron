import * as fs from 'node:fs';
import * as path from 'node:path';
import { ipcMain } from 'electron';
import type {
  OpenSpecDivergenceReason,
  OpenSpecEngineStatus,
  OpenSpecExecuteResult,
  OpenSpecFreshnessState,
  OpenSpecPreviewResult,
  OpenSpecRegistryCheck,
  OpenSpecRunUpdateResult,
  OpenSpecTargetConvergence,
  OpenSpecTargetDivergenceDetail,
  OpenSpecUpdatePlan,
} from '../../types/pipeline';
import {
  discoverOpenSpecCli,
  resolveOpenSpecExecutable,
  type AuthorizedOpenSpecRuntime,
} from '../pipeline/openspec-engine';
import {
  runOpenSpecUpdate,
  type RunOpenSpecUpdateOptions,
} from '../pipeline/openspec-cli';
import { readOpenSpecGlobalConfig } from '../pipeline/openspec-global-config';
import { inspectInstalledEvidence } from '../pipeline/openspec-evidence';
import { checkLatestOpenSpecVersion, getLocalCacheRegistryStatus } from '../pipeline/openspec-registry';
import {
  generateDiagnosticPreview,
  generateUpdatePlan,
  readRepoSchemaConfig,
  validatePlanIntegrity,
} from '../pipeline/openspec-preview';
import { classifyOpenSpecProfile } from '../../lib/openspec-profile';
import { compareSemver, parseSemver } from '../../lib/openspec-version';
import { getRealGitInfo, type RealGitInfo } from '../pipeline/repo-evidence-reader';
import { getToolDef } from '../pipeline/openspec-tooling';
import { authorizedRepoStore } from './authorized-repos';

export interface OpenSpecIpcDeps {
  getUserDataDir?: () => string | null;
  getAuthorizedRepoRoots?: () => string[];
  resolveRuntime?: (options?: { userDataDir?: string | null; repoPath?: string | null }) => AuthorizedOpenSpecRuntime | null;
  discoverCli?: (options?: { runtime?: AuthorizedOpenSpecRuntime | null }) => Promise<any>;
  checkLatest?: () => Promise<OpenSpecRegistryCheck>;
  readGlobalConfig?: (options?: { runtime?: AuthorizedOpenSpecRuntime | null }) => Promise<any>;
  ipcMain?: { handle: (channel: string, listener: any) => void };
  validateRepoPath?: (p: unknown) => string | null;
  getGitInfo?: (repoPath: string) => Promise<RealGitInfo>;
  runUpdate?: (repoPath: string, options?: RunOpenSpecUpdateOptions) => Promise<OpenSpecRunUpdateResult>;
}

/**
 * Valida estrictamente las claves permitidas en un payload IPC.
 * Rechaza cualquier propiedad desconocida o maliciosa enviada por el renderer.
 */
export function validateStrictPayloadKeys(payload: unknown, allowedKeys: string[]): void {
  if (payload === undefined || payload === null) return;
  if (typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('IPC Security Error: Invalid payload shape');
  }
  const keys = Object.keys(payload as object);
  for (const k of keys) {
    if (!allowedKeys.includes(k)) {
      throw new Error(`IPC Security Error: Unknown payload property "${k}"`);
    }
  }
}

/**
 * Valida estrictamente la ruta de un repositorio exigiendo:
 * 1. String no vacío.
 * 2. Ruta absoluta (`path.isAbsolute`).
 * 3. Existencia en disco y que sea un directorio.
 * 4. Verificación de raíz Git real (`.git` dir o file).
 * 5. Coincidencia canónica EXACTA con una raíz autorizada en main (authorizedRepoStore o authorizedRoots inyectadas).
 * 6. Rechazo de process.cwd(), watchers automáticos no validados, y rutas libres.
 */
export function validateStrictRepoPath(p: unknown, authorizedRoots?: string[]): string | null {
  if (typeof p !== 'string' || !p.trim()) return null;
  const rawPath = p.trim();

  // 1. Debe ser ruta absoluta
  if (!path.isAbsolute(rawPath)) return null;

  // 2. Traversal check explícito
  const normalized = path.normalize(rawPath);
  if (normalized.includes('..')) return null;

  // 3. Existencia en disco y canonicalización
  try {
    const st = fs.lstatSync(normalized);
    if (!st.isDirectory()) return null;

    const realPath = fs.realpathSync(normalized);

    // 4. Verificación de raíz Git
    const gitDir = path.join(realPath, '.git');
    try {
      const gitSt = fs.lstatSync(gitDir);
      if (!gitSt.isDirectory() && !gitSt.isFile()) return null;
    } catch {
      return null;
    }

    // 5. Verificación de autorización en main-owned store
    if (authorizedRoots !== undefined) {
      const isWin = process.platform === 'win32';
      const normRealPath = isWin ? realPath.toLowerCase() : realPath;
      let isAuth = false;
      for (const r of authorizedRoots) {
        if (typeof r !== 'string' || !r.trim()) continue;
        try {
          const canonicalRoot = fs.realpathSync(r.trim());
          const normRoot = isWin ? canonicalRoot.toLowerCase() : canonicalRoot;
          if (normRealPath === normRoot) {
            isAuth = true;
            break;
          }
        } catch {
          // ignore
        }
      }
      if (!isAuth) return null;
    } else {
      if (!authorizedRepoStore.isAuthorized(realPath)) {
        return null;
      }
    }

    return realPath;
  } catch {
    return null;
  }
}

/**
 * Construye el snapshot diagnóstico local unificado sin bloquear por red.
 * Satisface los requisitos de resolución única de runtime y 3 ejes + convergencia per-target.
 */
export async function buildEngineStatusSnapshot(
  rawRepoPath?: unknown,
  deps: OpenSpecIpcDeps = {},
): Promise<OpenSpecEngineStatus> {
  const getUserDataDir = deps.getUserDataDir ?? (() => null);
  const userDataDir = getUserDataDir();

  const authorizedRoots = deps.getAuthorizedRepoRoots ? deps.getAuthorizedRepoRoots() : undefined;
  const validateRepo = deps.validateRepoPath ?? ((p) => validateStrictRepoPath(p, authorizedRoots));

  let validRepoPath: string | null = null;
  if (rawRepoPath !== undefined && rawRepoPath !== null) {
    validRepoPath = validateRepo(rawRepoPath);
    if (!validRepoPath) {
      throw new Error('IPC Security Error: Invalid or unauthorized repository path');
    }
  }

  // 1. RESOLVER EL RUNTIME AUTORIZADO UNA SOLA VEZ EN MAIN
  const resolveRuntime = deps.resolveRuntime ?? resolveOpenSpecExecutable;
  const authorizedRuntime = resolveRuntime({ userDataDir, repoPath: validRepoPath });

  // 2. Descubrir CLI y leer configuración global inyectando ESE MISMO RUNTIME RESUELTO
  const discover = deps.discoverCli ?? ((opts) => discoverOpenSpecCli({ ...opts, userDataDir, repoPath: validRepoPath }));
  const readConfig = deps.readGlobalConfig ?? ((opts) => readOpenSpecGlobalConfig({ ...opts }));

  const [cli, globalConfig] = await Promise.all([
    discover({ runtime: authorizedRuntime }),
    readConfig({ runtime: authorizedRuntime }),
  ]);

  // 3. Obtener caché local del registry sin await de red
  const cachedRegistry = getLocalCacheRegistryStatus(userDataDir, new Date());

  // 4. Inspección de evidencia de integración instalada
  const installedIntegration = validRepoPath ? inspectInstalledEvidence(validRepoPath) : null;

  // 5. Determinar estado de inicialización del repositorio
  let repoState: OpenSpecEngineStatus['repoState'] = 'unknown';
  if (validRepoPath) {
    try {
      const hasOpenSpecYaml = fs.existsSync(path.join(validRepoPath, '.openspec.yaml'));
      const hasOpenSpecDir = fs.existsSync(path.join(validRepoPath, 'openspec'));
      repoState = hasOpenSpecYaml || hasOpenSpecDir ? 'initialized' : 'not-initialized';
    } catch {
      repoState = 'unknown';
    }
  }

  // 6. Determinar estado de la integración
  let integrationState: OpenSpecEngineStatus['integrationState'] = 'unknown';
  if (installedIntegration) {
    if (installedIntegration.evidenceStatus === 'unknown') {
      integrationState = 'unknown';
    } else if (installedIntegration.conflicts && installedIntegration.conflicts.length > 0) {
      integrationState = 'conflicted';
    } else if (
      installedIntegration.generatedBy &&
      cli.runtimeVersion &&
      installedIntegration.generatedBy !== cli.runtimeVersion
    ) {
      integrationState = 'outdated';
    } else if (installedIntegration.missing && installedIntegration.missing.length > 0) {
      integrationState = 'outdated';
    } else if (installedIntegration.skills.length > 0) {
      const hasModifiedOfficialSkills = installedIntegration.skills.some(
        (s) => s.isOfficial && s.origin === 'custom-agents',
      );
      integrationState = hasModifiedOfficialSkills ? 'custom' : 'up-to-date';
    } else {
      integrationState = 'outdated';
    }
  }

  // 6.5. Determinar novedad del CLI frente al registro npm (freshnessState)
  let freshnessState: OpenSpecFreshnessState = 'unknown';
  if (!cachedRegistry || cachedRegistry.status === 'offline' || !cachedRegistry.latestVersion) {
    freshnessState = 'offline';
  } else if (cli.runtimeVersion) {
    const parsedRuntime = parseSemver(cli.runtimeVersion);
    const parsedLatest = parseSemver(cachedRegistry.latestVersion);
    if (parsedRuntime && parsedLatest) {
      freshnessState = compareSemver(parsedRuntime, parsedLatest) >= 0
        ? 'cli-up-to-date'
        : 'cli-upgrade-available';
    } else {
      freshnessState = 'unknown';
    }
  }

  // 7. Calcular perfiles global y repo y evaluar convergencia por target
  const globalProfileRes = classifyOpenSpecProfile({
    rawProfile: globalConfig?.rawProfile,
    workflows: globalConfig?.configuredWorkflows,
    source: 'global-config',
  });

  const allRepoWorkflows = installedIntegration
    ? Array.from(new Set(Object.values(installedIntegration.installedWorkflowsByTarget).flat())).sort()
    : [];

  const repoProfileRes = classifyOpenSpecProfile({
    workflows: allRepoWorkflows,
    source: 'installed-integration',
  });

  const targetConvergences: Record<string, OpenSpecTargetConvergence> = {};
  let hasTargetDivergence = false;
  const targetDivergenceReasons: OpenSpecTargetDivergenceDetail[] = [];

  const globalWorkflows = globalConfig?.configuredWorkflows
    ? [...globalConfig.configuredWorkflows].sort()
    : null;
  const globalWorkflowsStr = globalWorkflows ? globalWorkflows.join(',') : '';

  if (installedIntegration) {
    // Un target presente sin workflows oficiales también participa del cálculo
    // (2.9): queda fuera de `installedWorkflowsByTarget` y antes era invisible,
    // lo que declaraba convergencia con `.agents` presente pero sin configurar.
    // Nunca puede haber convergencia confirmada con un target presente sin
    // comparar. Los outputs `external-global` no entran: son sólo diagnóstico
    // (contrato 2.10).
    const compared = new Set(Object.keys(installedIntegration.installedWorkflowsByTarget));
    const targetEntries: Array<[string, string[]]> = [
      ...Object.entries(installedIntegration.installedWorkflowsByTarget),
      ...(installedIntegration.presentToolDirectories ?? [])
        .filter((toolId) => !compared.has(toolId))
        .map((toolId) => [toolId, []] as [string, string[]]),
    ];
    for (const [toolId, targetWfs] of targetEntries) {
      const toolDef = getToolDef(toolId);
      const label = toolDef?.label ?? toolId;
      const sortedTargetWfs = [...targetWfs].sort();
      const targetProfileRes = classifyOpenSpecProfile({
        workflows: sortedTargetWfs,
        source: 'installed-integration',
      });

      let status: OpenSpecTargetConvergence['status'] = 'unknown';
      let reason: OpenSpecTargetDivergenceDetail | null = null;

      if (globalWorkflows !== null && globalProfileRes.profileClass !== 'unknown') {
        if (
          sortedTargetWfs.join(',') === globalWorkflowsStr &&
          targetProfileRes.profileClass === globalProfileRes.profileClass
        ) {
          status = 'convergent';
        } else {
          status = 'divergent';
          hasTargetDivergence = true;
          reason = {
            kind: 'target-workflows-mismatch',
            toolId,
            label,
            targetCount: sortedTargetWfs.length,
            targetWorkflows: sortedTargetWfs,
            globalCount: globalWorkflows.length,
            globalWorkflows: globalWorkflows,
          };
          targetDivergenceReasons.push(reason);
        }
      }

      targetConvergences[toolId] = {
        toolId,
        label,
        status,
        targetProfileClass: targetProfileRes.profileClass,
        installedWorkflows: sortedTargetWfs,
        reason,
      };
    }
  }

  let isDivergent = false;
  let divergenceReason: OpenSpecDivergenceReason | null = null;
  let overallStatus: 'convergent' | 'divergent' | 'unknown' = 'unknown';

  if (
    globalProfileRes.profileClass !== 'unknown' &&
    integrationState !== 'unknown' &&
    repoState !== 'unknown' &&
    installedIntegration?.evidenceStatus === 'confirmed'
  ) {
    if (hasTargetDivergence) {
      isDivergent = true;
      overallStatus = 'divergent';
      if (targetDivergenceReasons.length === 1) {
        divergenceReason = targetDivergenceReasons[0];
      } else {
        divergenceReason = {
          kind: 'multiple-target-divergences',
          targets: targetDivergenceReasons,
        };
      }
    } else if (
      repoProfileRes.profileClass !== 'unknown' &&
      globalProfileRes.profileClass !== repoProfileRes.profileClass
    ) {
      isDivergent = true;
      overallStatus = 'divergent';
      divergenceReason = {
        kind: 'profile-mismatch',
        globalProfileClass: globalProfileRes.profileClass,
        repoProfileClass: repoProfileRes.profileClass,
      };
    } else if (repoProfileRes.profileClass !== 'unknown') {
      isDivergent = false;
      overallStatus = 'convergent';
    }
  }

  return {
    cli,
    latestAvailable: cachedRegistry,
    globalConfig,
    installedIntegration,
    repoState,
    integrationState,
    freshnessState,
    divergence: {
      isDivergent,
      reason: divergenceReason,
      overallStatus,
      globalProfileClass: globalProfileRes.profileClass,
      repoProfileClass: repoProfileRes.profileClass,
      targetConvergences,
    },
  };
}

/**
 * Registra los handlers IPC de OpenSpec en el proceso principal.
 */
export function registerOpenSpecIpcHandlers(deps: OpenSpecIpcDeps = {}): void {
  const ipc = deps.ipcMain ?? ipcMain;
  if (!ipc || typeof ipc.handle !== 'function') return;

  const authorizedRoots = deps.getAuthorizedRepoRoots ? deps.getAuthorizedRepoRoots() : undefined;
  const validateRepo = deps.validateRepoPath ?? ((p) => validateStrictRepoPath(p, authorizedRoots));
  const getGitInfo = deps.getGitInfo ?? getRealGitInfo;

  // 1. Engine Status Snapshot
  ipc.handle(
    'pipeline:openspec:engine-status',
    async (_event, payload?: unknown) => {
      validateStrictPayloadKeys(payload, ['repoPath']);
      const rawRepoPath = (payload as any)?.repoPath;
      if (rawRepoPath !== undefined && rawRepoPath !== null) {
        const validRepoPath = validateRepo(rawRepoPath);
        if (!validRepoPath) {
          throw new Error('IPC Security Error: Invalid or unauthorized repository path');
        }
        return buildEngineStatusSnapshot(validRepoPath, deps);
      }
      return buildEngineStatusSnapshot(undefined, deps);
    },
  );

  // 2. Check Latest Version
  ipc.handle(
    'pipeline:openspec:check-latest',
    async (_event, payload?: unknown): Promise<OpenSpecRegistryCheck> => {
      validateStrictPayloadKeys(payload, []);
      const getUserDataDir = deps.getUserDataDir ?? (() => null);
      const userDataDir = getUserDataDir();
      const checkLatest = deps.checkLatest ?? (() => checkLatestOpenSpecVersion({ userDataDir }));
      return checkLatest();
    },
  );

  // 3. Update Plan
  ipc.handle(
    'pipeline:openspec:update-plan',
    async (_event, payload?: unknown): Promise<OpenSpecUpdatePlan> => {
      validateStrictPayloadKeys(payload, ['repoPath']);
      const rawRepoPath = (payload as any)?.repoPath;
      const validRepoPath = validateRepo(rawRepoPath);
      if (!validRepoPath) {
        throw new Error('IPC Security Error: Invalid or unauthorized repository path');
      }

      const status = await buildEngineStatusSnapshot(validRepoPath, deps);
      const gitInfo = await getGitInfo(validRepoPath);

      return generateUpdatePlan({
        repoPath: validRepoPath,
        engineStatus: status,
        gitInfo,
        schemaConfig: readRepoSchemaConfig(validRepoPath),
      });
    },
  );

  // 4. Update Execute (Bloqueado de forma tipada, con validación de integridad productiva)
  ipc.handle(
    'pipeline:openspec:update-execute',
    async (_event, payload?: unknown): Promise<OpenSpecExecuteResult> => {
      validateStrictPayloadKeys(payload, ['repoPath', 'plan']);
      const rawRepoPath = (payload as any)?.repoPath;
      const validRepoPath = validateRepo(rawRepoPath);
      if (!validRepoPath) {
        throw new Error('IPC Security Error: Invalid or unauthorized repository path');
      }

      const plan = (payload as any)?.plan as OpenSpecUpdatePlan | undefined;
      if (plan && plan.preview && plan.preview.invalidationParams) {
        const liveStatus = await buildEngineStatusSnapshot(validRepoPath, deps);
        const liveGitInfo = await getGitInfo(validRepoPath);
        const livePreview = generateDiagnosticPreview({
          repoPath: validRepoPath,
          engineStatus: liveStatus,
          gitInfo: liveGitInfo,
          schemaConfig: readRepoSchemaConfig(validRepoPath),
        });
        const integrityError = validatePlanIntegrity(plan, livePreview.invalidationParams);
        if (integrityError) {
          return {
            success: false,
            status: 'blocked',
            reason: 'poc-required',
            message: integrityError,
          };
        }
      }

      return {
        success: false,
        status: 'blocked',
        reason: 'poc-required',
        message: 'poc-required',
      };
    },
  );

  // 5. Preview
  ipc.handle(
    'pipeline:openspec:preview',
    async (_event, payload?: unknown): Promise<OpenSpecPreviewResult> => {
      validateStrictPayloadKeys(payload, ['repoPath']);
      const rawRepoPath = (payload as any)?.repoPath;
      const validRepoPath = validateRepo(rawRepoPath);
      if (!validRepoPath) {
        throw new Error('IPC Security Error: Invalid or unauthorized repository path');
      }

      const status = await buildEngineStatusSnapshot(validRepoPath, deps);
      const gitInfo = await getGitInfo(validRepoPath);

      return generateDiagnosticPreview({
        repoPath: validRepoPath,
        engineStatus: status,
        gitInfo,
        schemaConfig: readRepoSchemaConfig(validRepoPath),
      });
    },
  );

  // 6. Run Update (Ejecución de openspec update con salvaguardas de Git)
  ipc.handle(
    'pipeline:openspec:run-update',
    async (_event, payload?: unknown): Promise<OpenSpecRunUpdateResult> => {
      validateStrictPayloadKeys(payload, ['repoPath', 'plan', 'force']);
      const rawRepoPath = (payload as any)?.repoPath;
      const validRepoPath = validateRepo(rawRepoPath);
      if (!validRepoPath) {
        throw new Error('IPC Security Error: Invalid or unauthorized repository path');
      }

      const gitInfo = await getGitInfo(validRepoPath);

      // Salvaguarda 1: Bloqueo incondicional en main / master o detached HEAD (Decisión 1 y Hallazgo 7)
      const branch = gitInfo.branch ? gitInfo.branch.trim() : '';
      if (!branch || branch === 'main' || branch === 'master' || branch === 'HEAD') {
        const isMain = branch === 'main' || branch === 'master';
        return {
          success: false,
          status: 'blocked',
          filesUpdated: [],
          errors: [isMain ? 'branch-protected-main' : 'branch-detached'],
        };
      }

      // Salvaguarda 2: Bloqueo con working tree sucio
      if (!gitInfo.isClean) {
        return {
          success: false,
          status: 'blocked',
          filesUpdated: [],
          errors: ['working-tree-dirty'],
        };
      }

      // Salvaguarda 3: Validación de integridad del plan diagnóstico si se proporciona
      const plan = (payload as any)?.plan as OpenSpecUpdatePlan | undefined;
      if (plan && plan.preview && plan.preview.invalidationParams) {
        const liveStatus = await buildEngineStatusSnapshot(validRepoPath, deps);
        const livePreview = generateDiagnosticPreview({
          repoPath: validRepoPath,
          engineStatus: liveStatus,
          gitInfo,
          schemaConfig: readRepoSchemaConfig(validRepoPath),
        });
        const integrityError = validatePlanIntegrity(plan, livePreview.invalidationParams);
        if (integrityError) {
          return {
            success: false,
            status: 'blocked',
            filesUpdated: [],
            errors: [integrityError],
          };
        }
      }

      const getUserDataDir = deps.getUserDataDir ?? (() => null);
      const userDataDir = getUserDataDir();
      const resolveRuntime = deps.resolveRuntime ?? resolveOpenSpecExecutable;
      const authorizedRuntime = resolveRuntime({ userDataDir, repoPath: validRepoPath });

      const runUpdate = deps.runUpdate ?? runOpenSpecUpdate;
      const force = Boolean((payload as any)?.force);
      return runUpdate(validRepoPath, {
        force,
        runtime: authorizedRuntime,
      });
    },
  );
}
