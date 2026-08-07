import { ipcMain } from 'electron';
import { PipelineService } from '../pipeline/pipeline-service';
import { initOpenSpecWithCli } from '../pipeline/openspec-cli';
import { safeReadRepoFile } from '../pipeline/repo-paths';
import { errMsg } from './shared';

/**
 * Lectura del contenido de una especificación consolidada.
 *
 * Va por su propio canal y no dentro del snapshot, y eso se decidió midiendo:
 * las especificaciones de este repositorio pesan 145 KB en quince archivos, con
 * una sola de 84,9 KB, y el snapshot se rearma en cada refresco que dispara el
 * watcher con cada guardado. Una spec consolidada cambia cuando se archiva un
 * cambio, no cuando se guarda un archivo, así que atarla al refresco paga un
 * costo continuo por algo que casi nunca cambia y casi nunca se mira.
 *
 * **Sólo lee.** No escribe nada: lo que hay bajo `openspec/specs/` lo produce
 * `openspec archive`.
 */

/**
 * Mismo alfabeto acotado que el lector de evidencia exige al listar
 * `openspec/specs`. El canal recibe el identificador y compone la ruta acá: no
 * acepta rutas del renderer, ni siquiera la referencia de origen que el snapshot
 * ya expone, porque el proceso principal no recibe paths sin validar.
 */
const SPECIFICATION_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;

/** Tope de lectura. La más grande hoy son 84,9 KB; 512 KB deja margen sin ser ilimitado. */
const MAX_SPECIFICATION_BYTES = 512 * 1024;

export type ReadSpecificationResult =
  | { success: true; content: string }
  | { success: false; error: string };

function validRepoPath(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 32_768;
}

function validSpecificationId(value: unknown): value is string {
  return typeof value === 'string' && SPECIFICATION_ID_PATTERN.test(value);
}

/**
 * Resuelve la lectura sin depender de Electron, para poder probarla.
 *
 * Distingue los tres estados que piden respuestas distintas: contenido leído,
 * archivo vacío —que es un dato real del repositorio— y fallo de lectura, que
 * hay que reportar en vez de disfrazar de contenido vacío.
 */
export async function readSpecificationContent(
  repoPath: string,
  specificationId: unknown,
  resolveBinding: (repoPath: string) => Promise<{ canonicalPath: string }>,
): Promise<ReadSpecificationResult> {
  if (!validSpecificationId(specificationId)) return { success: false, error: 'invalid_specification_id' };
  try {
    const { canonicalPath } = await resolveBinding(repoPath);
    const file = await safeReadRepoFile(
      canonicalPath,
      `openspec/specs/${specificationId}/spec.md`,
      { maxBytes: MAX_SPECIFICATION_BYTES },
    );
    // El motivo real, no uno normalizado: "no existe", "la ruta fue rechazada" y
    // "supera el límite" piden respuestas distintas de quien lo lee. Un archivo
    // vacío llega como contenido vacío, que es un dato del repositorio y no un
    // fallo.
    if (file.content === null) return { success: false, error: file.status };
    return { success: true, content: file.content };
  } catch (error) {
    return { success: false, error: errMsg(error) };
  }
}

/**
 * Inicializa OpenSpec en el repositorio abierto.
 *
 * Escribe, así que va detrás de una acción humana explícita en el panel. Está
 * medido que el comando no pisa `openspec/config.yaml` y que es incremental —en
 * un repositorio ya inicializado sólo agrega la herramienta que falta—, pero eso
 * lo hace seguro, no invisible: lo que se va a escribir se enumera antes.
 *
 * Sin herramientas, el CLI las detecta por los directorios del repositorio. La
 * lista sólo se pasa cuando el comando no encontró ninguna y la persona eligió.
 */
export async function initOpenSpec(
  repoPath: unknown,
  tools: unknown,
  resolveBinding: (repoPath: string) => Promise<{ canonicalPath: string }>,
) {
  if (!validRepoPath(repoPath)) return { success: false, error: 'invalid_repo_path', needsTool: false };
  // Sólo un arreglo de cadenas o nada: cualquier otra cosa se rechaza antes de
  // llegar al CLI, que en Windows corre con shell.
  if (tools !== undefined && (!Array.isArray(tools) || tools.some((tool) => typeof tool !== 'string'))) {
    return { success: false, error: 'invalid_tools', needsTool: false };
  }
  try {
    const { canonicalPath } = await resolveBinding(repoPath);
    const result = await initOpenSpecWithCli(canonicalPath, tools as string[] | undefined);
    return result.ok
      ? { success: true, needsTool: false }
      : { success: false, error: result.error, needsTool: result.needsTool };
  } catch (error) {
    return { success: false, error: errMsg(error), needsTool: false };
  }
}

export function registerPipelineSpecHandlers(service = new PipelineService()): void {
  ipcMain.handle('pipeline:init-openspec', async (_event, repoPath: unknown, tools: unknown) =>
    initOpenSpec(repoPath, tools, (path) => service.resolveBinding(path)));

  ipcMain.handle('pipeline:read-specification', async (_event, repoPath: unknown, specificationId: unknown) => {
    if (!validRepoPath(repoPath)) return { success: false, error: 'invalid_repo_path' };
    return readSpecificationContent(repoPath, specificationId, (path) => service.resolveBinding(path));
  });
}
