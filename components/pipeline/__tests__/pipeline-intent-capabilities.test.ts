import { describe, expect, it } from 'vitest';
import type { RuntimeDiscoveryEntry } from '@/types/pipeline';
import { resolveIntentCapability } from '../pipeline-intent-capabilities';

function entry(overrides: Partial<RuntimeDiscoveryEntry> = {}): RuntimeDiscoveryEntry {
  return {
    runtime: 'claude',
    adapterId: 'adapter-claude',
    installed: true,
    runtimeVersion: '1.0.0',
    launchable: true,
    evidenceStatus: 'verified',
    startAvailability: 'available',
    startConstraints: [],
    startModifiesRepo: true,
    diagnostics: [],
    ...overrides,
  };
}

describe('resolveIntentCapability (tabla intención→capacidad)', () => {
  describe('caso 1: lectura permitida (explore)', () => {
    it('Claude está disponible para explorar', () => {
      const res = resolveIntentCapability('explore', entry({ runtime: 'claude' }));
      expect(res.status).toBe('available');
      expect(res.canLaunch).toBe(true);
      expect(res.alternativeRuntime).toBeNull();
    });

    it('Codex está disponible para explorar', () => {
      const res = resolveIntentCapability(
        'explore',
        entry({ runtime: 'codex', startModifiesRepo: false }),
      );
      expect(res.status).toBe('available');
      expect(res.canLaunch).toBe(true);
      expect(res.alternativeRuntime).toBeNull();
    });
  });

  describe('caso 2: escritura ausente (write-artifact)', () => {
    it('Claude está disponible para escribir propuestas y artefactos', () => {
      const res = resolveIntentCapability(
        'write-artifact',
        entry({ runtime: 'claude', startModifiesRepo: true }),
      );
      expect(res.status).toBe('available');
      expect(res.canLaunch).toBe(true);
      expect(res.alternativeRuntime).toBeNull();
    });

    it('Codex no está disponible por tener sandbox de sólo lectura y sugiere Claude', () => {
      const res = resolveIntentCapability(
        'write-artifact',
        entry({ runtime: 'codex', startModifiesRepo: false }),
      );
      expect(res.status).toBe('unavailable');
      expect(res.canLaunch).toBe(false);
      expect(res.reasonKey).toBe('pipeline.launcher.intent.codexNoWrite');
      expect(res.reason).toContain('Sólo puede leer; para escribir la propuesta usá Claude');
      expect(res.alternativeRuntime).toBe('claude');
    });
  });

  describe('caso 3: pruebas ausentes (implement-task)', () => {
    it('Claude es parcial: escribe código pero no corre pruebas (verificación manual)', () => {
      const res = resolveIntentCapability(
        'implement-task',
        entry({ runtime: 'claude', startModifiesRepo: true }),
      );
      expect(res.status).toBe('partial');
      expect(res.canLaunch).toBe(true);
      expect(res.reasonKey).toBe('pipeline.launcher.intent.claudeNoTests');
      expect(res.reason).toContain('pnpm verificar');
      expect(res.alternativeRuntime).toBeNull();
    });

    it('Codex no está disponible: no puede escribir ni correr pruebas y sugiere Claude', () => {
      const res = resolveIntentCapability(
        'implement-task',
        entry({ runtime: 'codex', startModifiesRepo: false }),
      );
      expect(res.status).toBe('unavailable');
      expect(res.canLaunch).toBe(false);
      expect(res.reasonKey).toBe('pipeline.launcher.intent.codexNoImplement');
      expect(res.reason).toContain('No puede escribir archivos ni correr pruebas');
      expect(res.alternativeRuntime).toBe('claude');
    });
  });

  describe('caso 4: reanudar sesión (resume)', () => {
    it('no está disponible con ningún runtime hasta contar con pruebas', () => {
      const resClaude = resolveIntentCapability('resume', entry({ runtime: 'claude' }));
      expect(resClaude.status).toBe('unavailable');
      expect(resClaude.canLaunch).toBe(false);
      expect(resClaude.reasonKey).toBe('pipeline.launcher.intent.resumeUnavailable');

      const resCodex = resolveIntentCapability('resume', entry({ runtime: 'codex' }));
      expect(resCodex.status).toBe('unavailable');
      expect(resCodex.canLaunch).toBe(false);
    });
  });

  describe('caso 5: OpenCode (sin comprobar, no bloquear por falta de fixture)', () => {
    it('devuelve «sin comprobar» y permite arrancar sin bloquear por pertenecer a pending_fixture', () => {
      const openCodeEntry = entry({
        runtime: 'opencode',
        launchable: true,
        evidenceStatus: 'pending_fixture',
        startModifiesRepo: true,
      });

      for (const intent of ['explore', 'write-artifact', 'implement-task'] as const) {
        const res = resolveIntentCapability(intent, openCodeEntry);
        expect(res.status).toBe('unverified');
        expect(res.canLaunch).toBe(true);
        expect(res.reasonKey).toBe('pipeline.launcher.intent.unverified');
        expect(res.reason).toContain('Capacidad sin comprobar');
      }
    });
  });

  describe('caso 6: runtime desconocido o no lanzable', () => {
    it('devuelve unavailable para runtime desconocido', () => {
      const res = resolveIntentCapability(
        'explore',
        entry({ runtime: 'desconocido' as any }),
      );
      expect(res.status).toBe('unavailable');
      expect(res.canLaunch).toBe(false);
    });

    it('devuelve unavailable si launchable es false (p. ej. agy)', () => {
      const res = resolveIntentCapability(
        'explore',
        entry({ runtime: 'agy', launchable: false, diagnostics: ['agy es solo un wrapper'] }),
      );
      expect(res.status).toBe('unavailable');
      expect(res.canLaunch).toBe(false);
      expect(res.reason).toBe('agy es solo un wrapper');
    });

    it('devuelve unavailable si no hay entrada seleccionada', () => {
      const res = resolveIntentCapability('write-artifact', null);
      expect(res.status).toBe('unavailable');
      expect(res.canLaunch).toBe(false);
      expect(res.alternativeRuntime).toBe('claude');
    });
  });
});
