import { describe, expect, it } from 'vitest';
import { isRemoteBranchDefault, parseRemoteDefaultBranch, remoteBranchDiffers, remoteBranchTarget } from '../branch-upstream';

describe('remoteBranchTarget', () => {
  it('preserves a remote branch name that differs from the local branch', () => {
    expect(remoteBranchTarget('origin/feat/astro.scaffold', 'feat/astro-scaffold')).toEqual({
      remote: 'origin',
      branch: 'feat/astro.scaffold',
    });
  });

  it('falls back to origin and the local name without a valid upstream', () => {
    expect(remoteBranchTarget(null, 'feature/local')).toEqual({
      remote: 'origin',
      branch: 'feature/local',
    });
  });
});

describe('isRemoteBranchDefault', () => {
  it('es verdadero cuando la rama remota coincide con la rama por defecto del remoto', () => {
    // Caso del defecto: claude/x con upstream origin/main -> borraría main.
    const target = remoteBranchTarget('origin/main', 'claude/x');
    expect(isRemoteBranchDefault(target.branch, 'main')).toBe(true);
  });

  it('es falso cuando la rama remota no es la por defecto', () => {
    const target = remoteBranchTarget('origin/feature/x', 'feature/x');
    expect(isRemoteBranchDefault(target.branch, 'main')).toBe(false);
  });

  it('es falso cuando no hay rama por defecto resuelta (no se puede afirmar)', () => {
    expect(isRemoteBranchDefault('main', null)).toBe(false);
    expect(isRemoteBranchDefault('main', undefined)).toBe(false);
  });
});

describe('remoteBranchDiffers', () => {
  it('es verdadero cuando el nombre remoto difiere del local', () => {
    expect(remoteBranchDiffers('main', 'claude/x')).toBe(true);
  });

  it('es falso cuando coinciden', () => {
    expect(remoteBranchDiffers('feature/x', 'feature/x')).toBe(false);
  });
});

describe('parseRemoteDefaultBranch', () => {
  it('quita el prefijo del remote y devuelve el nombre corto', () => {
    // `git symbolic-ref --short refs/remotes/origin/HEAD` -> "origin/main".
    expect(parseRemoteDefaultBranch('origin/main', 'origin')).toBe('main');
  });

  it('trimma saltos de línea de la salida de git', () => {
    expect(parseRemoteDefaultBranch('origin/main\n', 'origin')).toBe('main');
  });

  it('devuelve null si el HEAD del remoto no está resuelto', () => {
    expect(parseRemoteDefaultBranch('', 'origin')).toBeNull();
    expect(parseRemoteDefaultBranch(null, 'origin')).toBeNull();
    expect(parseRemoteDefaultBranch(undefined, 'origin')).toBeNull();
  });

  it('si no hay prefijo del remote, devuelve el valor tal cual', () => {
    expect(parseRemoteDefaultBranch('main', 'origin')).toBe('main');
  });
});
