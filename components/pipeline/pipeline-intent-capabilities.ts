import type { RuntimeDiscoveryEntry } from '@/types/pipeline';

export type PipelineIntent = 'explore' | 'write-artifact' | 'implement-task' | 'resume';

export type IntentAvailabilityStatus = 'available' | 'partial' | 'unavailable' | 'unverified';

export interface IntentCapabilityResolution {
  status: IntentAvailabilityStatus;
  canLaunch: boolean;
  reasonKey?: string;
  reason: string;
  alternativeRuntime?: 'claude' | 'codex' | null;
  alternativeKey?: string;
  alternativeText?: string;
}

/**
 * Cálculo puro de disponibilidad por intención según la tabla auditada en design.md
 * (decisión 2, tarea 2.1, medida el 2026-09-29 sobre los adaptadores reales; no por nombre del agente).
 *
 * Capacidades reales medidas:
 * - Claude (claude-adapter.ts:35-50): lee (Read,Grep,Glob), escribe (Edit,Write, acceptEdits),
 *   NO corre Bash/tests, resume no probado.
 * - Codex (codex-adapter.ts:25): lee, NO escribe (exec --sandbox read-only), no corre test suites,
 *   NO resume (--ephemeral).
 * - OpenCode (opencode-acp-adapter.ts): capacidad sin comprobar en todas las intenciones
 *   (handshake ACP negociado, ejecución de prompt no iniciada). Se muestra y no se bloquea por no tener fixture.
 * - agy (runtime-session-hub.ts:94): no lanzable (launchable: false).
 * - LM Studio: proveedor local, no runtime en el hub.
 */
export function resolveIntentCapability(
  intent: PipelineIntent,
  entry: RuntimeDiscoveryEntry | null | undefined,
): IntentCapabilityResolution {
  if (!entry) {
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.runtimeUnavailable',
      reason: 'Runtime no encontrado o no disponible.',
      alternativeRuntime: intent === 'resume' ? null : 'claude',
    };
  }

  // Runtime no lanzable (p. ej. agy o instalado sin start() en hub)
  if (!entry.launchable) {
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.runtimeNotLaunchable',
      reason: entry.diagnostics?.[0] ?? 'Este runtime no admite arranque de sesiones.',
      alternativeRuntime: intent === 'resume' ? null : 'claude',
    };
  }

  // OpenCode: capacidad sin comprobar en todas las intenciones hasta modelos-en-casa
  // (handshake ACP pendiente); se muestra, no se bloquea por no tener fixture, y lo dice.
  if (entry.runtime === 'opencode') {
    return {
      status: 'unverified',
      canLaunch: true,
      reasonKey: 'pipeline.launcher.intent.unverified',
      reason: 'Capacidad sin comprobar: el protocolo ACP no se contrastó contra una referencia viva.',
      alternativeRuntime: null,
    };
  }

  // Reanudar: ninguno comprobado hoy — no se ofrece hasta tener prueba
  if (intent === 'resume') {
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.resumeUnavailable',
      reason: 'Reanudar sesión no está disponible hasta contar con pruebas del adaptador.',
      alternativeRuntime: null,
    };
  }

  // Intención: Explorar (requiere: leer)
  // Disponible con Claude y Codex
  if (intent === 'explore') {
    if (entry.runtime === 'claude' || entry.runtime === 'codex') {
      return {
        status: 'available',
        canLaunch: true,
        reason: '',
        alternativeRuntime: null,
      };
    }
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.unavailableExplore',
      reason: 'Este runtime no está disponible para explorar.',
      alternativeRuntime: 'claude',
    };
  }

  // Intención: Proponer / escribir artefactos (requiere: leer + escribir)
  // Claude escribe; Codex tiene sandbox read-only.
  if (intent === 'write-artifact') {
    if (entry.runtime === 'claude' && entry.startModifiesRepo !== false) {
      return {
        status: 'available',
        canLaunch: true,
        reason: '',
        alternativeRuntime: null,
      };
    }
    if (entry.runtime === 'codex' || entry.startModifiesRepo === false) {
      return {
        status: 'unavailable',
        canLaunch: false,
        reasonKey: 'pipeline.launcher.intent.codexNoWrite',
        reason: 'Sólo puede leer; para escribir la propuesta usá Claude.',
        alternativeRuntime: 'claude',
        alternativeKey: 'pipeline.launcher.intent.useClaudeForArtifact',
        alternativeText: 'Para escribir la propuesta usá Claude.',
      };
    }
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.unavailableWrite',
      reason: 'Este runtime no puede escribir archivos.',
      alternativeRuntime: 'claude',
    };
  }

  // Intención: Implementar una tarea (requiere: leer + escribir + correr pruebas)
  // Claude: escribe pero --allowedTools no incluye Bash (no corre pruebas).
  // Codex: no escribe ni corre pruebas.
  if (intent === 'implement-task') {
    if (entry.runtime === 'claude') {
      return {
        status: 'partial',
        canLaunch: true,
        reasonKey: 'pipeline.launcher.intent.claudeNoTests',
        reason: 'Escribe el código pero no puede correr pruebas: la verificación queda para vos (pnpm verificar).',
        alternativeRuntime: null,
      };
    }
    if (entry.runtime === 'codex') {
      return {
        status: 'unavailable',
        canLaunch: false,
        reasonKey: 'pipeline.launcher.intent.codexNoImplement',
        reason: 'No puede escribir archivos ni correr pruebas.',
        alternativeRuntime: 'claude',
        alternativeKey: 'pipeline.launcher.intent.useClaudeForImplement',
        alternativeText: 'Para implementar la tarea usá Claude (con verificación manual).',
      };
    }
    return {
      status: 'unavailable',
      canLaunch: false,
      reasonKey: 'pipeline.launcher.intent.runtimeUnavailable',
      reason: 'Este runtime no puede implementar tareas.',
      alternativeRuntime: 'claude',
    };
  }

  return {
    status: 'unavailable',
    canLaunch: false,
    reasonKey: 'pipeline.launcher.intent.runtimeUnavailable',
    reason: 'Operación no compatible con este runtime.',
    alternativeRuntime: null,
  };
}
