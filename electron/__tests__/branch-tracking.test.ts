import { describe, expect, it } from 'vitest';
import { parseBranchTracking } from '../../electron/ipc/branch-tracking';

// Fixtures = salida cruda de:
//   git for-each-ref --format=%(refname:short)|%(upstream:short)|%(upstream:track) refs/heads
// Sin repo real: probamos solo el parseo de estados.

describe('parseBranchTracking', () => {
  it('solo-local: branch sin upstream configurado', () => {
    const raw = 'feature-x||\n';
    const t = parseBranchTracking(raw)['feature-x'];
    expect(t).toEqual({
      upstream: null,
      ahead: 0,
      behind: 0,
      gone: false,
      hasRemote: false,
    });
  });

  it('sincronizada: upstream vivo, sin ahead ni behind', () => {
    const raw = 'main|origin/main|\n';
    const t = parseBranchTracking(raw)['main'];
    expect(t).toEqual({
      upstream: 'origin/main',
      ahead: 0,
      behind: 0,
      gone: false,
      hasRemote: true,
    });
  });

  it('adelante: solo commits locales pendientes de push', () => {
    const raw = 'main|origin/main|[ahead 2]\n';
    const t = parseBranchTracking(raw)['main'];
    expect(t).toMatchObject({ ahead: 2, behind: 0, gone: false, hasRemote: true });
  });

  it('atras: solo commits remotos pendientes de pull', () => {
    const raw = 'main|origin/main|[behind 5]\n';
    const t = parseBranchTracking(raw)['main'];
    expect(t).toMatchObject({ ahead: 0, behind: 5, gone: false, hasRemote: true });
  });

  it('divergida: ahead y behind simultáneos', () => {
    const raw = 'main|origin/main|[ahead 1, behind 3]\n';
    const t = parseBranchTracking(raw)['main'];
    expect(t).toMatchObject({ ahead: 1, behind: 3, gone: false, hasRemote: true });
  });

  it('gone: upstream configurado pero eliminado en el remoto → sin remoto vivo', () => {
    const raw = 'old-feature|origin/old-feature|[gone]\n';
    const t = parseBranchTracking(raw)['old-feature'];
    expect(t).toMatchObject({
      upstream: 'origin/old-feature',
      gone: true,
      hasRemote: false,
    });
  });

  it('parsea múltiples branches y respeta líneas vacías/whitespace', () => {
    const raw = [
      'main|origin/main|',
      'feature-local||',
      'diverged|origin/diverged|[ahead 4, behind 2]',
      '',
      '   ',
    ].join('\n');
    const map = parseBranchTracking(raw);
    expect(Object.keys(map).sort()).toEqual(['diverged', 'feature-local', 'main']);
    expect(map['main'].hasRemote).toBe(true);
    expect(map['feature-local'].hasRemote).toBe(false);
    expect(map['diverged']).toMatchObject({ ahead: 4, behind: 2, hasRemote: true });
  });

  it('salida vacía → mapa vacío', () => {
    expect(parseBranchTracking('')).toEqual({});
    expect(parseBranchTracking('\n\n')).toEqual({});
  });
});
