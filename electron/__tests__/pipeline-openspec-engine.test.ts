import { describe, expect, it } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import {
  classifyOpenSpecProvenance,
  defaultProbePathState,
  discoverOpenSpecCli,
  parseOpenSpecVersionOutput,
  readOpenSpecChangeMetadata,
  resolveOpenSpecExecutable,
  runAuthorizedOpenSpec,
  type AuthorizedOpenSpecRuntime,
} from '../pipeline/openspec-engine';
import { classifyOpenSpecVersion } from '../../lib/openspec-version';

describe('defaultProbePathState (cobertura directa del adaptador real)', () => {
  it('retorna exists ante entrada/Stats existente', () => {
    expect(defaultProbePathState('any-path', () => ({ isFile: () => true }))).toBe('exists');
  });

  it('retorna absent ante ENOENT o ENOTDIR', () => {
    const errEnoent = new Error('ENOENT: no such file') as any;
    errEnoent.code = 'ENOENT';
    expect(defaultProbePathState('any-path', () => { throw errEnoent; })).toBe('absent');

    const errEnotdir = new Error('ENOTDIR: not a directory') as any;
    errEnotdir.code = 'ENOTDIR';
    expect(defaultProbePathState('any-path', () => { throw errEnotdir; })).toBe('absent');

    expect(defaultProbePathState('any-path', () => null)).toBe('absent');
    expect(defaultProbePathState('any-path', () => undefined)).toBe('absent');
  });

  it('retorna error ante EACCES, EPERM, EIO o ERR_INVALID_ARG_VALUE', () => {
    for (const code of ['EACCES', 'EPERM', 'EIO', 'ERR_INVALID_ARG_VALUE']) {
      const err = new Error(`${code} error`) as any;
      err.code = code;
      expect(defaultProbePathState('any-path', () => { throw err; })).toBe('error');
    }
  });

  it('retorna error ante error sin code o excepción inesperada sin propagar crash', () => {
    expect(defaultProbePathState('any-path', () => { throw new Error('no code'); })).toBe('error');
    expect(defaultProbePathState('any-path', () => { throw 'string exception'; })).toBe('error');
  });

  it('evalúa una ruta real con byte nulo (\\0) retornando error', () => {
    expect(defaultProbePathState('\0')).toBe('error');
  });
});

describe('runAuthorizedOpenSpec (Prueba de integración REAL en Windows)', () => {
  it('ejecuta un .cmd real en una ruta con espacios, &, %TEMP%, !FOO! y ^BAR sin fallar por cmd.exe', async () => {
    if (process.platform !== 'win32') return;

    const tmpParent = os.tmpdir();
    const dirWithComplexName = path.join(
      tmpParent,
      'gitcron test & %TEMP% !FOO! ^BAR ' + Date.now(),
    );
    fs.mkdirSync(dirWithComplexName, { recursive: true });

    const cmdPath = path.join(dirWithComplexName, 'test-runner & %TEMP% !FOO! ^BAR.cmd');
    fs.writeFileSync(cmdPath, '@echo OK_REAL_CMD %1 %2\n');

    try {
      const realRuntime: AuthorizedOpenSpecRuntime = {
        executablePath: cmdPath,
        command: 'test-runner.cmd',
        shell: true,
        displayPath: cmdPath,
        provenance: 'local',
      };

      const result = await runAuthorizedOpenSpec(realRuntime, ['hello-arg', 'world-arg']);
      expect(result.stdout.trim()).toContain('OK_REAL_CMD hello-arg world-arg');
    } finally {
      try {
        fs.rmSync(dirWithComplexName, { recursive: true, force: true });
      } catch {
        // cleanup ignore
      }
    }
  });

  it('garantiza que OPENSPEC_NO_UPDATE_CHECK y DO_NOT_TRACK no sean anuladas por options.env', async () => {
    if (process.platform !== 'win32') return;

    const tmpParent = os.tmpdir();
    const dir = path.join(tmpParent, 'gitcron env test ' + Date.now());
    fs.mkdirSync(dir, { recursive: true });
    const cmdPath = path.join(dir, 'env-test.cmd');
    fs.writeFileSync(cmdPath, '@echo ENV_VAR=%OPENSPEC_NO_UPDATE_CHECK%\n');

    try {
      const rt: AuthorizedOpenSpecRuntime = {
        executablePath: cmdPath,
        command: 'env-test.cmd',
        shell: true,
        displayPath: cmdPath,
        provenance: 'local',
      };

      const result = await runAuthorizedOpenSpec(rt, [], {
        env: { OPENSPEC_NO_UPDATE_CHECK: '0' },
      });
      expect(result.stdout.trim()).toBe('ENV_VAR=1');
    } finally {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        // cleanup ignore
      }
    }
  });
});

describe('resolveOpenSpecExecutable', () => {
  it('resuelve el primer candidato en Windows (.cmd, shell true) excluyendo .ps1', () => {
    const expected = path.win32.join('C:\\dir1', 'openspec.cmd');
    const result = resolveOpenSpecExecutable({
      pathEnv: 'C:\\dir1;C:\\dir2',
      platform: 'win32',
      exists: (p) => p === expected || p === path.win32.join('C:\\dir1', 'openspec.ps1'),
      isRegularFile: () => true,
      realpath: (p) => p,
      probePathState: (p) => (p === expected ? 'exists' : 'absent'),
    });
    expect(result).not.toBeNull();
    expect(result!.command).toBe('openspec.cmd');
    expect(result!.shell).toBe(true);
    expect(result!.executablePath).toBe(expected);
  });

  it('un exists sintético acotado al candidato PATH no contamina la clasificación de procedencia de las raíces', () => {
    const candidate = 'C:\\custom-tools\\openspec.cmd';
    const repo = 'C:\\my-repo';
    const managed = 'C:\\userData\\openspec-runtimes';

    // exists sintético que SÓLO retorna true para la ruta del candidato ejecutable
    const syntheticExists = (p: string) => p === candidate;

    // probePathState de procedencia separado que reporta estado real de las raíces
    const provenanceProbe = (p: string) => {
      if (p === candidate || p === repo || p === managed) return 'exists';
      return 'absent';
    };

    const result = resolveOpenSpecExecutable({
      pathEnv: 'C:\\custom-tools',
      platform: 'win32',
      userDataDir: 'C:\\userData',
      repoPath: repo,
      exists: syntheticExists,
      isRegularFile: () => true,
      realpath: (p) => p,
      probePathState: provenanceProbe,
    });

    expect(result).not.toBeNull();
    expect(result!.provenance).toBe('global');
  });

  it('caso determinista donde el candidato está dentro de openspec-runtimes y termina managed', () => {
    const candidate = 'C:\\userData\\openspec-runtimes\\1.8.0\\openspec.cmd';
    const managedRoot = 'C:\\userData\\openspec-runtimes';

    const result = resolveOpenSpecExecutable({
      pathEnv: 'C:\\userData\\openspec-runtimes\\1.8.0',
      platform: 'win32',
      userDataDir: 'C:\\userData',
      exists: (p) => p === candidate,
      isRegularFile: () => true,
      realpath: (p) => p,
      probePathState: (p) => (p === candidate || p === managedRoot ? 'exists' : 'absent'),
    });

    expect(result).not.toBeNull();
    expect(result!.provenance).toBe('managed');
  });

  it('excluye archivos .ps1 en Windows cuando no existe .cmd ni .exe', () => {
    const ps1Path = path.win32.join('C:\\dir1', 'openspec.ps1');
    const result = resolveOpenSpecExecutable({
      pathEnv: 'C:\\dir1',
      platform: 'win32',
      exists: (p) => p === ps1Path,
      isRegularFile: () => true,
      realpath: (p) => p,
    });
    expect(result).toBeNull();
  });

  it('resuelve en unix sin extensiones cuando tiene permisos de ejecución (shell false)', () => {
    const expected = '/usr/bin/openspec';
    const result = resolveOpenSpecExecutable({
      pathEnv: '/usr/local/bin:/usr/bin',
      platform: 'linux',
      exists: (p) => p === expected,
      isRegularFile: () => true,
      isExecutable: (p) => p === expected,
      realpath: (p) => p,
    });
    expect(result!.command).toBe('openspec');
    expect(result!.shell).toBe(false);
    expect(result!.executablePath).toBe(expected);
  });

  it('rechaza candidato en POSIX si no tiene permiso ejecutable', () => {
    const candidate = '/usr/bin/openspec';
    const result = resolveOpenSpecExecutable({
      pathEnv: '/usr/bin',
      platform: 'linux',
      exists: (p) => p === candidate,
      isRegularFile: () => true,
      isExecutable: () => false,
      realpath: (p) => p,
    });
    expect(result).toBeNull();
  });

  it('rechaza candidato cuando realpath falla (sin fallback a path.resolve)', () => {
    const candidate = '/usr/bin/openspec';
    const result = resolveOpenSpecExecutable({
      pathEnv: '/usr/bin',
      platform: 'linux',
      exists: (p) => p === candidate,
      isRegularFile: () => true,
      isExecutable: () => true,
      realpath: () => null,
    });
    expect(result).toBeNull();
  });

  it('verifica que sea un archivo regular stat.isFile()', () => {
    const dirCandidate = '/usr/bin/openspec';
    const result = resolveOpenSpecExecutable({
      pathEnv: '/usr/bin',
      platform: 'linux',
      exists: (p) => p === dirCandidate,
      isRegularFile: () => false,
      realpath: (p) => p,
    });
    expect(result).toBeNull();
  });

  it('devuelve null cuando no encuentra nada', () => {
    expect(
      resolveOpenSpecExecutable({ pathEnv: 'C:\\nope', platform: 'win32', exists: () => false }),
    ).toBeNull();
  });
});

describe('classifyOpenSpecProvenance (tres estados: exists / absent / error)', () => {
  it('raíz administrada ausente con ENOENT => puede terminar en global', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      repoPath: '/home/user/repo',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: (p) => {
        if (p.includes('openspec-runtimes')) return 'absent';
        return 'exists';
      },
    });
    expect(res).toBe('global');
  });

  it('raíz administrada con EACCES/EPERM => unknown', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      repoPath: '/home/user/repo',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: (p) => {
        if (p.includes('openspec-runtimes')) return 'error';
        return 'exists';
      },
    });
    expect(res).toBe('unknown');
  });

  it('repoPath con error de I/O => unknown', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      repoPath: '/home/user/repo',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: (p) => {
        if (p === '/home/user/repo') return 'error';
        if (p.includes('openspec-runtimes')) return 'absent';
        return 'exists';
      },
    });
    expect(res).toBe('unknown');
  });

  it('callback de inspección que arroja una excepción => unknown, sin propagar crash', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: (p) => {
        if (p.includes('openspec-runtimes')) throw new Error('EACCES: permission denied');
        return 'exists';
      },
    });
    expect(res).toBe('unknown');
  });

  it('canonicalización fallida (realpath null) de una ruta existente => unknown', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      platform: 'linux',
      realpath: (p) => (p.includes('openspec-runtimes') ? null : p),
      probePathState: () => 'exists',
    });
    expect(res).toBe('unknown');
  });

  it('target cuyo realpath falla => unknown', () => {
    const target = '/usr/bin/openspec';
    const res = classifyOpenSpecProvenance(target, {
      userDataDir: '/home/user/.app',
      platform: 'linux',
      realpath: (p) => (p === target ? null : p),
      probePathState: () => 'exists',
    });
    expect(res).toBe('unknown');
  });

  it('raíces inspeccionadas y target externo => global', () => {
    const res = classifyOpenSpecProvenance('/usr/bin/openspec', {
      userDataDir: '/home/user/.app',
      repoPath: '/home/user/repo',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: () => 'exists',
    });
    expect(res).toBe('global');
  });

  it('coincidencias canónicas (symlinks/junctions) => local o managed', () => {
    const realRepo = 'C:\\RealWork\\gitCronos';
    const symlinkRepo = 'C:\\SymlinkPath\\gitCronos';
    const exePath = 'C:\\RealWork\\gitCronos\\bin\\openspec.cmd';

    const realpathMap = new Map<string, string>([
      [realRepo.toLowerCase(), realRepo],
      [symlinkRepo.toLowerCase(), realRepo],
      [exePath.toLowerCase(), exePath],
    ]);

    const resLocal = classifyOpenSpecProvenance(exePath, {
      repoPath: symlinkRepo,
      platform: 'win32',
      realpath: (p) => realpathMap.get(p.toLowerCase()) ?? null,
      probePathState: () => 'exists',
    });
    expect(resLocal).toBe('local');

    const realManaged = '/var/lib/gitcron/openspec-runtimes';
    const symlinkUser = '/home/user/.gitcron';
    const symlinkManaged = '/home/user/.gitcron/openspec-runtimes';
    const exePathManaged = '/var/lib/gitcron/openspec-runtimes/1.8.0/openspec';

    const realpathManagedMap = new Map<string, string>([
      [symlinkUser, '/var/lib/gitcron'],
      [symlinkManaged, realManaged],
      [exePathManaged, exePathManaged],
    ]);

    const resManaged = classifyOpenSpecProvenance(exePathManaged, {
      userDataDir: symlinkUser,
      platform: 'linux',
      realpath: (p) => realpathManagedMap.get(p) ?? null,
      probePathState: () => 'exists',
    });
    expect(resManaged).toBe('managed');
  });

  it('diferencia case-sensitivity: Windows es case-insensitive, POSIX es case-sensitive', () => {
    const winRes = classifyOpenSpecProvenance('c:\\repo\\bin\\openspec.cmd', {
      repoPath: 'C:\\REPO',
      platform: 'win32',
      realpath: (p) => p,
      probePathState: () => 'exists',
    });
    expect(winRes).toBe('local');

    const posixRes = classifyOpenSpecProvenance('/Repo/bin/openspec', {
      repoPath: '/repo',
      platform: 'linux',
      realpath: (p) => p,
      probePathState: () => 'exists',
    });
    expect(posixRes).toBe('global');
  });

  it('evita colisiones de prefijo en repo (repo-otro no es local para /repo)', () => {
    expect(
      classifyOpenSpecProvenance('/repo-otro/bin/openspec', {
        userDataDir: '/home/me/.app',
        repoPath: '/repo',
        platform: 'linux',
        realpath: (p) => p,
        probePathState: () => 'exists',
      }),
    ).toBe('global');
  });
});

describe('parseOpenSpecVersionOutput y flujo completo de extracción + clasificación', () => {
  it('extrae MAJOR.MINOR.PATCH de "1.8.0" y "OpenSpec 1.8.0"', () => {
    expect(parseOpenSpecVersionOutput('1.5.0')).toBe('1.5.0');
    expect(parseOpenSpecVersionOutput('OpenSpec 1.8.0\n')).toBe('1.8.0');
    expect(parseOpenSpecVersionOutput('OpenSpec v1.8.0')).toBe('1.8.0');
  });

  it('rechaza basura pegada como "OpenSpec 1.8.0basura" o "1.8.0extra"', () => {
    expect(parseOpenSpecVersionOutput('OpenSpec 1.8.0basura')).toBeNull();
    expect(parseOpenSpecVersionOutput('1.8.0extra')).toBeNull();
    expect(parseOpenSpecVersionOutput('OpenSpec 1.8.0.4')).toBeNull();
  });

  it('flujo completo: extracción + clasificación para basura pegada clasifica unknown', () => {
    const rawOutput = 'OpenSpec 1.8.0basura';
    const extracted = parseOpenSpecVersionOutput(rawOutput);
    expect(extracted).toBeNull();
    const versionClass = classifyOpenSpecVersion(extracted);
    expect(versionClass).toBe('unknown');
  });

  it('flujo completo: extracción + clasificación para 1.8.0 clasifica supported', () => {
    const rawOutput = 'OpenSpec 1.8.0';
    const extracted = parseOpenSpecVersionOutput(rawOutput);
    expect(extracted).toBe('1.8.0');
    const versionClass = classifyOpenSpecVersion(extracted);
    expect(versionClass).toBe('supported');
  });
});

describe('discoverOpenSpecCli', () => {
  const runtime: AuthorizedOpenSpecRuntime = {
    executablePath: 'C:\\nvm4w\\nodejs\\openspec.cmd',
    command: 'openspec.cmd',
    shell: true,
    displayPath: 'C:\\nvm4w\\nodejs\\openspec.cmd',
    provenance: 'global',
  };

  it('descubre versión, procedencia y displayPath', async () => {
    const result = await discoverOpenSpecCli({
      userDataDir: 'C:\\userData',
      repoPath: 'C:\\www\\gitCronos',
      resolve: () => runtime,
      realpath: (p) => p,
      probePathState: () => 'exists',
      runVersion: async (rt) => {
        expect(rt.executablePath).toBe(runtime.executablePath);
        return { stdout: '1.5.0\n', stderr: '' };
      },
    });
    expect(result.installed).toBe(true);
    expect(result.runtimeVersion).toBe('1.5.0');
    expect(result.provenance).toBe('global');
    expect(result.displayPath).toBe(runtime.displayPath);
    expect(result.versionClass).toBe('supported');
    expect(result.evidenceStatus).toBe('confirmed');
  });

  it('declara too-new para 1.9.0', async () => {
    const result = await discoverOpenSpecCli({
      resolve: () => runtime,
      realpath: (p) => p,
      probePathState: () => 'exists',
      runVersion: async () => ({ stdout: '1.9.0', stderr: '' }),
    });
    expect(result.versionClass).toBe('too-new');
  });

  it('declara el motor ausente cuando no resuelve ejecutable', async () => {
    const result = await discoverOpenSpecCli({ resolve: () => null });
    expect(result.installed).toBe(false);
    expect(result.runtimeVersion).toBeNull();
    expect(result.provenance).toBe('unknown');
    expect(result.displayPath).toBeNull();
    expect(result.versionClass).toBe('unknown');
    expect(result.diagnostics.join(' ')).toMatch(/not found/i);
  });
});

describe('readOpenSpecChangeMetadata (contrato completo)', () => {
  it('metadata válida con schema y skip_specs: true => skipSpecs: true', async () => {
    const yaml = `schema: spec-driven\nskip_specs: true`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: 'spec-driven', skipSpecs: true });
  });

  it('metadata válida con schema y skip_specs: false => skipSpecs: false', async () => {
    const yaml = `schema: spec-driven\nskip_specs: false`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: 'spec-driven', skipSpecs: false });
  });

  it('ausencia real de skip_specs con schema válido => skipSpecs: false', async () => {
    const yaml = `schema: spec-driven`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: 'spec-driven', skipSpecs: false });
  });

  it('archivo ausente => schemaName: null y skipSpecs: null', async () => {
    const res = await readOpenSpecChangeMetadata('C:/repo', 'no-file', async () => {
      throw new Error('ENOENT');
    });
    expect(res).toEqual({ schemaName: null, skipSpecs: null });
  });

  it('metadata inválida por skip_specs no-booleano (yes, 1, string) => ambos null', async () => {
    for (const val of ['yes', '1', 'maybe', '[]']) {
      const yaml = `schema: spec-driven\nskip_specs: ${val}`;
      const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
      expect(res).toEqual({ schemaName: null, skipSpecs: null });
    }
  });

  it('schema desconocido pero sintácticamente válido => transportado', async () => {
    const yaml = `schema: custom-schema-v2`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: 'custom-schema-v2', skipSpecs: false });
  });

  it('schema sintácticamente inválido (mayúsculas, puntos, guiones dobles/finales) => ambos null', async () => {
    const invalidSchemas = ['Spec-Driven', '1.8.0.basura', 'a--b', 'a-', '-a', 'a_b', 'a b'];
    for (const schema of invalidSchemas) {
      const yaml = `schema: ${schema}`;
      const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
      expect(res).toEqual({ schemaName: null, skipSpecs: null });
    }
  });

  it('clave reconocida anidada con sangría (p. ej. bajo goal) se ignora como top-level', async () => {
    const yaml = `title: "Mi Cambio"\ngoal:\n  schema: spec-driven\n  skip_specs: true`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: null, skipSpecs: null });
  });

  it('claves duplicadas reconocidas => considerado ambiguo -> ambos null', async () => {
    const yaml1 = `schema: spec-driven\nschema: custom-schema`;
    expect(await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml1)).toEqual({ schemaName: null, skipSpecs: null });

    const yaml2 = `schema: spec-driven\nskip_specs: true\nskip_specs: false`;
    expect(await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml2)).toEqual({ schemaName: null, skipSpecs: null });
  });

  it('comentarios y campos adicionales oficiales => tolerados correctamente', async () => {
    const yaml = `# Comentario inicial\ntitle: "Un cambio genial"\nschema: spec-driven # comentario alineado\ncreated: 2026-08-12\nskip_specs: true`;
    const res = await readOpenSpecChangeMetadata('C:/repo', 'c1', async () => yaml);
    expect(res).toEqual({ schemaName: 'spec-driven', skipSpecs: true });
  });
});
