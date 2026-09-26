import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

/**
 * Ubica el paquete @fission-ai/openspec del motor del sistema siguiendo
 * la decisión 2 del diseño.
 */
function findSystemPackageDir() {
  // 1. Buscar el ejecutable openspec en PATH y en ubicaciones típicas de gestores globales
  const pathEnv = process.env.PATH ?? process.env.Path ?? '';
  const isWin = process.platform === 'win32';
  const sep = isWin ? ';' : ':';
  const dirs = pathEnv.split(sep).filter(Boolean);

  const candidates = [];
  const extensions = isWin ? ['.cmd', '.exe', '.bat', ''] : [''];

  for (const dir of dirs) {
    for (const ext of extensions) {
      const candidate = path.join(dir, `openspec${ext}`);
      try {
        if (existsSync(candidate) && statSync(candidate).isFile()) {
          candidates.push(candidate);
        }
      } catch {
        // Ignorar errores de acceso
      }
    }
  }

  // Si no se encontró en PATH en Windows, probar la ruta por defecto de pnpm
  if (candidates.length === 0 && isWin && process.env.LOCALAPPDATA) {
    const pnpmBin = path.join(process.env.LOCALAPPDATA, 'pnpm', 'bin', 'openspec.cmd');
    if (existsSync(pnpmBin)) {
      candidates.push(pnpmBin);
    }
  }

  for (const execPath of candidates) {
    const pkgDir = resolvePackageFromExecutable(execPath);
    if (pkgDir) return pkgDir;
  }

  return null;
}

/**
 * Resuelve el directorio del paquete a partir de la ruta del ejecutable o lanzador.
 */
export function resolvePackageFromExecutable(executablePath) {
  let canonicalExec = null;
  try {
    canonicalExec = realpathSync.native ? realpathSync.native(executablePath) : realpathSync(executablePath);
  } catch {
    canonicalExec = executablePath;
  }

  // Si el realpath apunta directamente a bin/openspec.js
  const normExec = canonicalExec.replace(/\\/g, '/');
  if (normExec.endsWith('/bin/openspec.js')) {
    const pkgDir = path.dirname(path.dirname(canonicalExec));
    if (isValidOpenSpecPackage(pkgDir)) return pkgDir;
  }

  // Si no, leer el lanzador (hasta 64 KB)
  try {
    const fd = readFileSync(executablePath);
    const content = fd.subarray(0, 64 * 1024).toString('utf8');

    // Buscar patrones de ruta que terminen en @fission-ai/openspec/bin/openspec.js
    const regex = /(?:["']|^|(?<=\s))([^\r\n"']*?@fission-ai[/\\]openspec[/\\]bin[/\\]openspec\.js)(?:["']|$|(?=\s))/gi;
    const matches = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
      matches.push(match[1].trim());
    }

    const execDir = path.dirname(executablePath);
    const resolvedTargets = new Set();

    for (const rawTarget of matches) {
      let cleaned = rawTarget.replace(/^%~dp0[/\\]?/, '').replace(/^\$basedir[/\\]?/, '');
      let fullPath;
      if (rawTarget.includes('%~dp0') || rawTarget.includes('$basedir')) {
        fullPath = path.resolve(execDir, cleaned);
      } else if (path.isAbsolute(cleaned)) {
        fullPath = path.resolve(cleaned);
      } else {
        fullPath = path.resolve(execDir, cleaned);
      }

      try {
        const canonicalTarget = realpathSync.native ? realpathSync.native(fullPath) : realpathSync(fullPath);
        if (canonicalTarget && existsSync(canonicalTarget)) {
          resolvedTargets.add(path.normalize(canonicalTarget));
        }
      } catch {
        if (existsSync(fullPath)) {
          resolvedTargets.add(path.normalize(fullPath));
        }
      }
    }

    if (resolvedTargets.size === 1) {
      const [singleTarget] = resolvedTargets;
      const pkgDir = path.dirname(path.dirname(singleTarget));
      if (isValidOpenSpecPackage(pkgDir)) return pkgDir;
    }
  } catch {
    // Error al leer lanzador
  }

  return null;
}

function isValidOpenSpecPackage(dirPath) {
  try {
    const pkgJsonPath = path.join(dirPath, 'package.json');
    if (!existsSync(pkgJsonPath)) return false;
    const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
    return pkg.name === '@fission-ai/openspec';
  } catch {
    return false;
  }
}

async function main() {
  const arg = process.argv[2];
  let packageDir = null;

  if (arg) {
    const resolvedArg = path.resolve(arg);
    if (isValidOpenSpecPackage(resolvedArg)) {
      packageDir = resolvedArg;
    } else if (existsSync(resolvedArg) && statSync(resolvedArg).isFile()) {
      packageDir = resolvePackageFromExecutable(resolvedArg);
    } else {
      // Podría ser un symlink o enlace pnpm como en odontoPau/node_modules/@fission-ai/openspec
      try {
        const real = realpathSync(resolvedArg);
        if (isValidOpenSpecPackage(real)) {
          packageDir = real;
        }
      } catch {
        // Ignorar
      }
    }
  } else {
    packageDir = findSystemPackageDir();
    // Respaldo secundario: si no se encuentra en el sistema, revisar odontoPau local si existe
    if (!packageDir) {
      const odontoPauCandidate = 'C:\\www\\odontoPau\\node_modules\\@fission-ai\\openspec';
      if (existsSync(odontoPauCandidate)) {
        try {
          const real = realpathSync(odontoPauCandidate);
          if (isValidOpenSpecPackage(real)) {
            packageDir = real;
          }
        } catch {
          // Ignorar
        }
      }
    }
  }

  if (!packageDir) {
    console.error('Error: no se pudo ubicar el paquete @fission-ai/openspec del motor.');
    process.exit(1);
  }

  const pkgJsonPath = path.join(packageDir, 'package.json');
  const pkg = JSON.parse(readFileSync(pkgJsonPath, 'utf8'));
  const version = pkg.version;

  const configPath = path.join(packageDir, 'dist', 'core', 'config.js');
  if (!existsSync(configPath)) {
    console.error(`Error: no se encontró ${configPath}`);
    process.exit(1);
  }

  const configUrl = pathToFileURL(configPath).href;
  const { AI_TOOLS, OPENSPEC_SKILL_NAMES } = await import(configUrl);

  if (!Array.isArray(AI_TOOLS) || !Array.isArray(OPENSPEC_SKILL_NAMES)) {
    console.error('Error: config.js no exporta AI_TOOLS u OPENSPEC_SKILL_NAMES esperados.');
    process.exit(1);
  }

  const tools = AI_TOOLS.map((t) => {
    const item = {
      id: t.value,
      label: t.name,
    };
    if (t.skillsDir !== undefined) item.skillsDir = t.skillsDir;
    if (t.legacySkillsDirs !== undefined) item.legacySkillsDirs = t.legacySkillsDirs;
    if (t.detectionPaths !== undefined) item.detectionPaths = t.detectionPaths;
    if (t.globalSkillsDir !== undefined) item.globalSkillsDir = t.globalSkillsDir;
    return item;
  });

  const snapshot = {
    version,
    tools,
    skillNames: OPENSPEC_SKILL_NAMES,
  };

  const outputPath = path.resolve('electron', 'pipeline', 'openspec-tools-snapshot.json');
  writeFileSync(outputPath, JSON.stringify(snapshot, null, 2) + '\n', 'utf8');

  console.log(`Copia propia guardada en: ${outputPath}`);
  console.log(`Versión: ${version}`);
  console.log(`Herramientas capturadas: ${tools.length}`);
  console.log(`Skills: ${OPENSPEC_SKILL_NAMES.length}`);

  // Verificaciones automáticas del requerimiento 1.1
  const codex = tools.find((t) => t.id === 'codex');
  if (!codex || codex.skillsDir !== '.agents' || !codex.legacySkillsDirs?.includes('.codex')) {
    console.error('Error de verificación: Codex debe tener skillsDir: .agents y legacySkillsDirs: [.codex]');
    process.exit(1);
  }
  const github = tools.find((t) => t.id === 'github');
  if (github) {
    console.error('Error de verificación: ninguna herramienta debe tener id "github"');
    process.exit(1);
  }
  if (tools.length !== 40) {
    console.warn(`Aviso: se esperaban 40 herramientas, se encontraron ${tools.length}`);
  }
  console.log('Verificación 1.1 superada exitosamente.');
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve('scripts/capturar-herramientas-openspec.mjs')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
