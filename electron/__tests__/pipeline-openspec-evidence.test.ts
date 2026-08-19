import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, expect, it, vi } from 'vitest';
import {
  DIR_HASH_MAX_DEPTH,
  DIR_HASH_MAX_ENTRIES,
  extractGeneratedByHeader,
  inspectInstalledEvidence,
  skillToWorkflowName,
} from '../pipeline/openspec-evidence';
import { buildEngineStatusSnapshot } from '../ipc/pipeline-openspec';
import { authorizedRepoStore } from '../ipc/authorized-repos';

/**
 * Doble de disco anclado a rutas EXACTAS (invariante 19): `readdir` sólo
 * contesta por los directorios declarados y `lstat` sólo reconoce las rutas
 * declaradas. Nunca responde por coincidencia de subcadena ni describe un
 * árbol infinito: un doble que lo hace es un test roto, no una prueba de
 * robustez.
 */
function exactDiskDouble(spec: { dirs?: Record<string, string[]>; files?: string[] }) {
  const dirs = spec.dirs ?? {};
  const files = new Set(spec.files ?? []);
  const dirPaths = new Set(Object.keys(dirs));
  return {
    readdir: (p: string): string[] => (dirs[p] ? [...dirs[p]] : []),
    lstat: (p: string): any => {
      if (dirPaths.has(p) || files.has(p)) {
        return {
          isDirectory: () => dirPaths.has(p),
          isFile: () => files.has(p),
          isSymbolicLink: () => false,
        };
      }
      return null;
    },
  };
}

describe('inspectInstalledEvidence (Audit Points 5, 6, 7, 8 Tests)', () => {
  it('extrae la cabecera generatedBy en formatos 1.5.0 y 1.8.0', () => {
    expect(extractGeneratedByHeader('generatedBy: "1.5.0"')).toBe('1.5.0');
    expect(extractGeneratedByHeader('generatedBy: "openspec@1.8.0"')).toBe('1.8.0');
    expect(extractGeneratedByHeader('generatedBy: openspec/1.8.0')).toBe('1.8.0');
    expect(extractGeneratedByHeader('')).toBeNull();
  });

  it('valida exclusivamente los nombres oficiales 1.8 y rechaza openspec-mi-flujo', () => {
    expect(skillToWorkflowName('openspec-apply-change')).toBe('apply');
    expect(skillToWorkflowName('openspec-explore')).toBe('explore');
    expect(skillToWorkflowName('openspec-propose')).toBe('propose');
    expect(skillToWorkflowName('openspec-sync-specs')).toBe('sync');
    expect(skillToWorkflowName('openspec-archive-change')).toBe('archive');
    expect(skillToWorkflowName('openspec-update-plan')).toBe('update');
    expect(skillToWorkflowName('openspec-new-change')).toBe('new');
    expect(skillToWorkflowName('openspec-continue-change')).toBe('continue');
    expect(skillToWorkflowName('openspec-ff-change')).toBe('ff');
    expect(skillToWorkflowName('openspec-verify-change')).toBe('verify');
    expect(skillToWorkflowName('openspec-bulk-archive')).toBe('bulk-archive');
    expect(skillToWorkflowName('openspec-onboard')).toBe('onboard');

    // Nombres no oficiales
    expect(skillToWorkflowName('openspec-mi-flujo')).toBeNull();
    expect(skillToWorkflowName('openspec-custom-task')).toBeNull();
    expect(skillToWorkflowName('custom-agent')).toBeNull();
  });

  it('no cuenta un agente como configurado si sólo tiene skills personalizadas o openspec-mi-flujo', () => {
    const repo = 'C:\\repo';
    const customSkills = ['accessibility', 'seo', 'dex', 'openspec-mi-flujo'];
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: customSkills,
      },
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => '',
    });

    // .agents está presente como directorio, pero NO está configurado para OpenSpec oficial
    expect(evidence.presentToolDirectories).toContain('agents');
    expect(evidence.configuredTools).not.toContain('agents');
    expect(evidence.configuredCount).toBe(0);
    expect(evidence.configuredAgentsCount).toBe(0);
    expect(evidence.totalPresentAgentsCount).toBeGreaterThanOrEqual(1);
    expect(evidence.customized).toEqual(expect.arrayContaining(['accessibility', 'seo', 'dex', 'openspec-mi-flujo']));
  });

  it('separa agentes interactivos de integraciones CI como GitHub Workflows', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents', '.github'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['openspec-apply-change'],
        [`${repo}\\.github`]: ['workflows'],
        [`${repo}\\.github\\workflows`]: ['openspec-apply-change.yml'],
      },
      files: [
        `${repo}\\.agents\\skills\\openspec-apply-change\\SKILL.md`,
        `${repo}\\.github\\workflows\\openspec-apply-change.yml`,
      ],
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => 'generatedBy: "1.8.0"',
    });

    // Ambos están en configuredTools pero sólo .agents cuenta en configuredAgentsCount
    expect(evidence.configuredTools).toContain('github');
    expect(evidence.configuredTools).toContain('agents');
    expect(evidence.configuredAgentsCount).toBe(1);
    expect(evidence.configuredCount).toBe(1);
  });

  it('cambia el contentHash cuando se modifica el contenido de SKILL.md conservando el mismo nombre', () => {
    let skillContent = 'description: version 1';

    const fakeLstat = (p: string) => {
      if (p.endsWith('SKILL.md')) {
        return { isDirectory: () => false, isFile: () => true, isSymbolicLink: () => false } as any;
      }
      return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false } as any;
    };

    const fakeReaddir = (p: string) => {
      if (p.endsWith('.agents') || p.endsWith('skills')) return ['openspec-apply-change'];
      if (p.endsWith('openspec-apply-change')) return ['SKILL.md'];
      return [];
    };

    const ev1 = inspectInstalledEvidence('C:\\repo', {
      realpath: (p) => p,
      lstat: fakeLstat,
      readdir: fakeReaddir,
      readFile: () => skillContent,
    });

    const hash1 = ev1.outputInventory.find((o) => o.targetName === 'Agents Multi-Agent')?.contentHash;
    expect(hash1).not.toBeNull();

    // Modificar contenido conservando el mismo archivo y nombre
    skillContent = 'description: version 2 con modificaciones';

    const ev2 = inspectInstalledEvidence('C:\\repo', {
      realpath: (p) => p,
      lstat: fakeLstat,
      readdir: fakeReaddir,
      readFile: () => skillContent,
    });

    const hash2 = ev2.outputInventory.find((o) => o.targetName === 'Agents Multi-Agent')?.contentHash;
    expect(hash2).not.toBeNull();
    expect(hash1).not.toBe(hash2);
  });

  it('clasifica las skills oficiales de OpenSpec en .agents como new-agents', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['openspec-apply-change', 'openspec-propose'],
      },
      files: [
        `${repo}\\.agents\\skills\\openspec-apply-change\\SKILL.md`,
        `${repo}\\.agents\\skills\\openspec-propose\\SKILL.md`,
      ],
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => 'generatedBy: "1.8.0"',
    });

    expect(evidence.configuredTools).toContain('agents');
    expect(evidence.configuredCount).toBe(1);

    const applySkill = evidence.skills.find((s) => s.name === 'openspec-apply-change');
    expect(applySkill?.origin).toBe('new-agents');
    expect(applySkill?.isOfficial).toBe(true);
  });

  it('detecta conflictos cuando existen ambas carpetas legacy y new skills simultáneamente', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents', '.codex'],
        [`${repo}\\.codex`]: ['skills'],
        [`${repo}\\.codex\\skills`]: ['openspec-explore'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['openspec-apply-change'],
      },
      files: [
        `${repo}\\.codex\\skills\\openspec-explore\\SKILL.md`,
        `${repo}\\.agents\\skills\\openspec-apply-change\\SKILL.md`,
      ],
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => 'generatedBy: "1.5.0"',
    });

    expect(evidence.legacy).toContain('codex');
    expect(evidence.skills.some((s) => s.name === 'openspec-explore')).toBe(true);
    expect(evidence.conflicts).not.toBeNull();
    expect(evidence.conflicts?.length).toBeGreaterThan(0);
  });

  it('construye el inventario dinámico de outputs para todos los targets soportados', () => {
    const evidence = inspectInstalledEvidence('C:\\repo', {
      lstat: (p) => {
        if (p.includes('.github') || p.includes('.minimax')) {
          return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false } as any;
        }
        return null;
      },
      readdir: () => [],
      readFile: () => '',
    });

    expect(evidence.outputInventory.length).toBeGreaterThan(15);
    const minimax = evidence.outputInventory.find((o) => o.targetName === 'MiniMax Code' || o.id === 'output-minimax-code');
    expect(minimax?.kind).toBe('external-global');
    expect(minimax?.blocked).toBe(true);
    expect(minimax?.presenceState).toBe('present');

    const github = evidence.outputInventory.find((o) => o.targetName === 'GitHub Workflows' || o.id === 'output-github');
    expect(github?.kind).toBe('repo-local');
    expect(github?.blocked).toBe(false);
    expect(github?.presenceState).toBe('present');

    const cursor = evidence.outputInventory.find((o) => o.targetName === 'Cursor' || o.id === 'output-cursor');
    expect(cursor?.presenceState).toBe('absent');
  });

  it('detecta symlinks apuntando a directorios hermanos fuera del repositorio y los marca como conflicto', () => {
    const evidence = inspectInstalledEvidence('C:\\repo', {
      realpath: (p) => {
        if (p === 'C:\\repo') return 'C:\\repo';
        if (p.includes('.agents')) return 'C:\\repo-sibling\\external-agents';
        return p;
      },
      lstat: (p) => {
        if (p.includes('.agents')) {
          return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => true } as any;
        }
        return { isDirectory: () => true, isFile: () => false, isSymbolicLink: () => false } as any;
      },
      readdir: () => [],
      readFile: () => '',
    });

    expect(evidence.conflicts).not.toBeNull();
    expect(evidence.conflicts?.some((c) => c.includes('apunta fuera del repositorio'))).toBe(true);
    const agentsOutput = evidence.outputInventory.find((o) => o.targetName === 'Agents Multi-Agent');
    expect(agentsOutput?.presenceState).toBe('conflicting');
    expect(agentsOutput?.isSymlink).toBe(true);
  });

  it('reproduce en disco real el caso exacto de Alejandro: CLI 1.5, legacy skills 1.5, custom skills y global config 5 workflows', async () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-alejandro-test-'));
    try {
      // 1. Crear estructura real del repositorio
      const gitDir = path.join(tempDir, '.git');
      fs.mkdirSync(gitDir, { recursive: true });
      fs.writeFileSync(path.join(gitDir, 'HEAD'), 'ref: refs/heads/main\n');

      const openspecDir = path.join(tempDir, 'openspec');
      fs.mkdirSync(openspecDir, { recursive: true });
      fs.writeFileSync(path.join(openspecDir, 'config.yaml'), 'schema: spec-driven\n');

      // Legacy skills en .codex/skills/
      const codexSkillDir = path.join(tempDir, '.codex', 'skills', 'openspec-apply-change');
      fs.mkdirSync(codexSkillDir, { recursive: true });
      fs.writeFileSync(path.join(codexSkillDir, 'SKILL.md'), '---\ngeneratedBy: "1.5.0"\n---\nLegacy skill\n');

      // Custom skills en .agents/skills/ (sin skills oficiales)
      const customSkillDir = path.join(tempDir, '.agents', 'skills', 'custom-helper');
      fs.mkdirSync(customSkillDir, { recursive: true });
      fs.writeFileSync(path.join(customSkillDir, 'SKILL.md'), '---\nname: custom-helper\n---\nCustom\n');

      // 2. Autorizar repositorio
      authorizedRepoStore.clear();
      const canonical = authorizedRepoStore.authorizeRepo(tempDir);
      expect(canonical).not.toBeNull();

      // 3. Inspeccionar evidencia real en disco
      const evidence = inspectInstalledEvidence(tempDir);
      expect(evidence.generatedBy).toBe('1.5.0');
      expect(evidence.legacy).toContain('codex');
      expect(evidence.customized).toContain('custom-helper');

      // 4. Evaluar snapshot diagnóstico completo
      const snapshot = await buildEngineStatusSnapshot(tempDir, {
        discoverCli: async () => ({
          installed: true,
          runtimeVersion: '1.5.0',
          provenance: 'global',
          displayPath: 'C:\\Users\\apdel\\AppData\\Roaming\\npm\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.8.0' },
          versionClass: 'supported',
          evidenceStatus: 'confirmed',
          diagnostics: [],
        }),
        readGlobalConfig: async () => ({
          rawProfile: 'core',
          configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
          origin: 'cli',
          readAt: new Date().toISOString(),
        }),
      });

      expect(snapshot.cli.runtimeVersion).toBe('1.5.0');
      expect(snapshot.repoState).toBe('initialized');
      expect(snapshot.integrationState).toBe('up-to-date');
      expect(snapshot.divergence?.isDivergent).toBe(true);
      expect(snapshot.divergence?.overallStatus).toBe('divergent');
      expect(typeof snapshot.divergence?.reason).toBe('object');
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  describe('convergencia por target y perfiles (2.9 / Invariantes 8 & 19)', () => {
    it('target presente con cero workflows oficiales (.agents con custom skills) participa del cálculo e impide convergencia', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-target-conv-neg-'));
      try {
        // 1. Repositorio con .git, openspec y .agents con sólo custom skills
        fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
        fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');

        const customDir = path.join(tempDir, '.agents', 'skills', 'custom-helper');
        fs.mkdirSync(customDir, { recursive: true });
        fs.writeFileSync(path.join(customDir, 'SKILL.md'), '---\nname: custom-helper\n---\nCustom skill\n');

        authorizedRepoStore.clear();
        authorizedRepoStore.authorizeRepo(tempDir);

        const snapshot = await buildEngineStatusSnapshot(tempDir, {
          discoverCli: async () => ({
            installed: true,
            runtimeVersion: '1.8.0',
            provenance: 'global',
            displayPath: 'C:\\global\\openspec.cmd',
            supportedRange: { min: '1.5.0', max: '1.8.0' },
            versionClass: 'supported',
            evidenceStatus: 'confirmed',
            diagnostics: [],
          }),
          readGlobalConfig: async () => ({
            rawProfile: 'core',
            configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
            origin: 'cli',
            readAt: new Date().toISOString(),
          }),
        });

        // Target presente con 0 workflows oficiales NO puede ser convergent
        expect(snapshot.divergence?.isDivergent).toBe(true);
        expect(snapshot.divergence?.overallStatus).toBe('divergent');
        expect(snapshot.divergence?.targetConvergences?.['agents']?.status).toBe('divergent');
        expect(snapshot.divergence?.targetConvergences?.['agents']?.installedWorkflows).toEqual([]);

        // El motivo que cruza IPC es estructurado y tipado sin prosa en castellano ni inglés
        expect(typeof snapshot.divergence?.reason).toBe('object');
        expect(snapshot.divergence?.reason).toEqual({
          kind: 'target-workflows-mismatch',
          toolId: 'agents',
          label: 'Agents Multi-Agent',
          targetCount: 0,
          targetWorkflows: [],
          globalCount: 5,
          globalWorkflows: ['apply', 'archive', 'explore', 'propose', 'sync'],
        });
      } finally {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    });

    it('control positivo: todos los targets presentes con los mismos workflows que la global declaran convergencia', async () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-target-conv-pos-'));
      try {
        fs.mkdirSync(path.join(tempDir, '.git'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
        fs.mkdirSync(path.join(tempDir, 'openspec'), { recursive: true });
        fs.writeFileSync(path.join(tempDir, 'openspec', 'config.yaml'), 'schema: spec-driven\n');

        const officialSkills = [
          'openspec-propose',
          'openspec-explore',
          'openspec-apply-change',
          'openspec-sync-specs',
          'openspec-archive-change',
        ];
        for (const sk of officialSkills) {
          const skDir = path.join(tempDir, '.agents', 'skills', sk);
          fs.mkdirSync(skDir, { recursive: true });
          fs.writeFileSync(path.join(skDir, 'SKILL.md'), '---\ngeneratedBy: "1.8.0"\n---\nOfficial skill\n');
        }

        authorizedRepoStore.clear();
        authorizedRepoStore.authorizeRepo(tempDir);

        const snapshot = await buildEngineStatusSnapshot(tempDir, {
          discoverCli: async () => ({
            installed: true,
            runtimeVersion: '1.8.0',
            provenance: 'global',
            displayPath: 'C:\\global\\openspec.cmd',
            supportedRange: { min: '1.5.0', max: '1.8.0' },
            versionClass: 'supported',
            evidenceStatus: 'confirmed',
            diagnostics: [],
          }),
          readGlobalConfig: async () => ({
            rawProfile: 'core',
            configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
            origin: 'cli',
            readAt: new Date().toISOString(),
          }),
        });

        // Todos los targets coinciden exactamente con la global
        expect(snapshot.divergence?.isDivergent).toBe(false);
        expect(snapshot.divergence?.overallStatus).toBe('convergent');
        expect(snapshot.divergence?.targetConvergences?.['agents']?.status).toBe('convergent');
        expect(snapshot.divergence?.reason).toBeNull();
      } finally {
        try {
          fs.rmSync(tempDir, { recursive: true, force: true });
        } catch {
          // ignore
        }
      }
    });

    it('cuando la evidencia de integración no es confirmada (unknown), la convergencia queda unknown y no afirma convergent', async () => {
      const repo = 'C:\\repo';
      const disk = exactDiskDouble({
        dirs: {
          [repo]: ['.agents'],
          [`${repo}\\.agents`]: ['skills'],
        },
      });

      authorizedRepoStore.clear();
      authorizedRepoStore.authorizeRepo(repo);

      // Usando dobles anclados a rutas exactas (Invariante 19)
      const snapshot = await buildEngineStatusSnapshot(repo, {
        validateRepoPath: () => repo,
        discoverCli: async () => ({
          installed: true,
          runtimeVersion: '1.8.0',
          provenance: 'global',
          displayPath: 'C:\\global\\openspec.cmd',
          supportedRange: { min: '1.5.0', max: '1.8.0' },
          versionClass: 'supported',
          evidenceStatus: 'unknown',
          diagnostics: [],
        }),
        readGlobalConfig: async () => ({
          rawProfile: 'core',
          configuredWorkflows: ['propose', 'explore', 'apply', 'sync', 'archive'],
          origin: 'cli',
          readAt: new Date().toISOString(),
        }),
      });

      // Nunca puede declararse convergente si la evidencia no está confirmada
      expect(snapshot.divergence?.overallStatus).toBe('unknown');
      expect(snapshot.divergence?.isDivergent).toBe(false);
    });
  });
});

describe('computeDirContentHash — recorrido acotado (invariante 19)', () => {
  it('termina y marca la evidencia como truncada cuando el árbol excede el tope de profundidad', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gitcron-deep-tree-'));
    try {
      // Disco real: cadena de directorios más profunda que DIR_HASH_MAX_DEPTH
      const skillsDir = path.join(tempDir, '.agents', 'skills');
      fs.mkdirSync(skillsDir, { recursive: true });
      let current = skillsDir;
      for (let i = 0; i < DIR_HASH_MAX_DEPTH + 4; i++) {
        current = path.join(current, `nivel-${i}`);
        fs.mkdirSync(current);
      }
      fs.writeFileSync(path.join(current, 'SKILL.md'), 'contenido profundo');

      const evidence = inspectInstalledEvidence(tempDir);
      const agentsOutput = evidence.outputInventory.find((o) => o.id === 'output-agents');
      expect(agentsOutput?.hashTruncated).toBe(true);
      expect(agentsOutput?.contentHash).toBeNull();
      expect(evidence.evidenceStatus).toBe('unknown');
    } finally {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        // ignore
      }
    }
  });

  it('termina y marca la evidencia como truncada cuando el árbol excede el tope de entradas', () => {
    const repo = 'C:\\repo';
    const skillsDir = `${repo}\\.agents\\skills`;
    const wideNames = Array.from({ length: DIR_HASH_MAX_ENTRIES + 5 }, (_, i) => `archivo-${i}`);
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents'],
        [`${repo}\\.agents`]: ['skills'],
        [skillsDir]: wideNames,
      },
      // Árbol ancho pero finito: un archivo por entrada, a nivel 1.
      files: wideNames.map((n) => `${skillsDir}\\${n}`),
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => 'contenido',
    });

    const agentsOutput = evidence.outputInventory.find((o) => o.id === 'output-agents');
    expect(agentsOutput?.hashTruncated).toBe(true);
    expect(agentsOutput?.contentHash).toBeNull();
    expect(evidence.evidenceStatus).toBe('unknown');
  });

  it('termina ante un doble de disco cíclico (una carpeta que se contiene a sí misma)', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['self'],
        // `path.join('self', '.') === 'self'`: sin corte de reentrada, el
        // recorrido vuelve a entrar en la misma carpeta para siempre.
        [`${repo}\\.agents\\skills\\self`]: ['.', '..'],
      },
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => '',
    });

    // El corte por reentrada no es pérdida de datos: el recorrido no queda truncado.
    const agentsOutput = evidence.outputInventory.find((o) => o.id === 'output-agents');
    expect(agentsOutput?.hashTruncated).toBe(false);
    expect(evidence.evidenceStatus).not.toBe('unknown');
  });

  it('un árbol dentro de los topes sigue produciendo hash completo sin truncar', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.agents'],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['openspec-apply-change'],
        [`${repo}\\.agents\\skills\\openspec-apply-change`]: ['SKILL.md'],
      },
      files: [`${repo}\\.agents\\skills\\openspec-apply-change\\SKILL.md`],
    });
    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => 'generatedBy: "1.8.0"',
    });

    const agentsOutput = evidence.outputInventory.find((o) => o.id === 'output-agents');
    expect(agentsOutput?.hashTruncated).toBe(false);
    expect(agentsOutput?.contentHash).not.toBeNull();
    expect(evidence.evidenceStatus).toBe('confirmed');
  });

  it('clasifica skills en la taxonomía exacta de origin sin caer en custom-agents por omisión', () => {
    const repo = 'C:\\repo';
    const disk = exactDiskDouble({
      dirs: {
        [repo]: ['.codex', '.agent', '.agents', '.claude', '.opencode'],
        [`${repo}\\.codex`]: ['skills'],
        [`${repo}\\.codex\\skills`]: [
          'openspec-propose',
          'openspec-explore',
          'openspec-apply-change',
          'openspec-sync-specs',
          'openspec-archive-change',
        ],
        [`${repo}\\.agent`]: ['skills'],
        [`${repo}\\.agent\\skills`]: [
          'openspec-propose',
          'openspec-explore',
          'openspec-apply-change',
          'openspec-sync-specs',
          'openspec-archive-change',
        ],
        [`${repo}\\.agents`]: ['skills'],
        [`${repo}\\.agents\\skills`]: ['accessibility', 'seo', 'dex'],
        [`${repo}\\.claude`]: ['skills'],
        [`${repo}\\.claude\\skills`]: [
          'openspec-propose',
          'openspec-explore',
          'openspec-apply-change',
          'openspec-sync-specs',
          'openspec-archive-change',
        ],
        [`${repo}\\.opencode`]: ['skills'],
        [`${repo}\\.opencode\\skills`]: [
          'openspec-propose',
          'openspec-explore',
          'openspec-apply-change',
          'openspec-sync-specs',
          'openspec-archive-change',
        ],
      },
    });

    const evidence = inspectInstalledEvidence(repo, {
      realpath: (p) => p,
      ...disk,
      readFile: () => '',
    });

    // 10 legacy skills (5 codex, 5 agent)
    const legacyCodex = evidence.skills.filter((s) => s.origin === 'legacy-codex');
    const legacyAgent = evidence.skills.filter((s) => s.origin === 'legacy-agent');
    expect(legacyCodex).toHaveLength(5);
    expect(legacyAgent).toHaveLength(5);
    expect(evidence.legacy).toEqual(expect.arrayContaining(['codex', 'antigravity']));

    // 10 official skills en otras herramientas (5 claude, 5 opencode)
    const officialOther = evidence.skills.filter((s) => s.origin === 'official-other');
    expect(officialOther).toHaveLength(10);
    expect(officialOther.every((s) => s.isOfficial)).toBe(true);

    // .agents sólo tiene personalizados, ninguno es openspec-*
    const customAgents = evidence.skills.filter((s) => s.origin === 'custom-agents');
    expect(customAgents.map((s) => s.name).sort()).toEqual(['accessibility', 'dex', 'seo']);
    expect(customAgents.every((s) => !s.isOfficial)).toBe(true);
    expect(customAgents.some((s) => s.name.startsWith('openspec-'))).toBe(false);
  });
});
