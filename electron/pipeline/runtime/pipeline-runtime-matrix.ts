import { isAbsolute, join } from 'path';

export interface RuntimeSupportEntry {
  runtimeId: 'claude' | 'codex' | 'agy' | 'opencode' | 'lmstudio';
  isAvailable: boolean;
  executablePath: string | null;
  degradedReason?: string;
}

export class PipelineRuntimeMatrix {
  /**
   * Resuelve el nombre del ejecutable respetando extensiones de Windows (.cmd, .exe, .bat).
   */
  public resolveWindowsExecutable(cmdName: string, isWin: boolean = process.platform === 'win32'): string {
    if (!isWin) return cmdName;
    if (cmdName.endsWith('.cmd') || cmdName.endsWith('.exe') || cmdName.endsWith('.bat')) {
      return cmdName;
    }
    // En Windows, los CLI de npm suelen ser .cmd (p. ej. npx.cmd, pnpm.cmd, agy.cmd)
    return `${cmdName}.cmd`;
  }

  /**
   * Evalúa la matriz de compatibilidad declarando el estado de disponibilidad de cada runtime sin tirar excepciones.
   */
  public evaluateRuntimeMatrix(availableExecutables: Record<string, string | null>): RuntimeSupportEntry[] {
    const runtimes: Array<RuntimeSupportEntry['runtimeId']> = ['claude', 'codex', 'agy', 'opencode', 'lmstudio'];

    return runtimes.map((runtimeId) => {
      const execPath = availableExecutables[runtimeId];
      if (execPath && (isAbsolute(execPath) || execPath.length > 0)) {
        return {
          runtimeId,
          isAvailable: true,
          executablePath: execPath,
        };
      }
      return {
        runtimeId,
        isAvailable: false,
        executablePath: null,
        degradedReason: `Ejecutable '${runtimeId}' no encontrado en el PATH del sistema. Modo degradado activo.`,
      };
    });
  }

  /**
   * Garantiza que GitCron únicamente interactúe con procesos asociados a su propio PID o hijos directo.
   */
  public isProcessOwnedByGitCron(processPid: number, spawnedPids: Set<number>): boolean {
    return spawnedPids.has(processPid);
  }
}
