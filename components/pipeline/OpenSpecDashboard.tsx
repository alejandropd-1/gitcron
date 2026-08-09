'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BookOpen,
  Check,
  CheckCircle2,
  Circle,
  Code2,
  FileCode2,
  FileText,
  ChevronDown,
  ChevronLeft,
  FolderOpen,
  MinusSquare,
  PlusSquare,
  GitBranch,
  GitCompare,
  Loader2,
  Pause,
  Play,
  ShieldCheck,
  User,
  Wrench,
  MessageSquareText,
  PowerOff,
  BrainCircuit,
} from 'lucide-react';
import { useGitStore, type GitFile } from '@/lib/git-store';
import { useGitActions } from '@/hooks/use-git-actions';
import { archivedChangeId, deriveRepoCommitScope, fileKind, soleChangeId, suggestCommitMessage, type ChangeAttribution, type CommitFileOrigin } from '@/lib/change-commit-scope';
import { changeIdFromBranch } from '@/lib/change-branch';
import { DraftingThought } from './DraftingThought';
import { AiElapsed } from './AiElapsed';
import type { LocalModel } from '@/types/commit-message-ai';
import { useT } from '@/hooks/use-translation';
import type { RuntimeProjection } from '@/types/pipeline';
import { ActivityFeed } from './ActivityFeed';
import { DecisionInbox } from './DecisionInbox';
import { PipelineDetails, type DetailTab } from './PipelineDetails';
import { PipelineRuntimeLauncher } from './PipelineRuntimeLauncher';
import { PipelineNextStepGuide } from './PipelineNextStepGuide';
import { motion, useReducedMotion } from 'motion/react';
import { ChangeBranchNotice } from './ChangeBranchNotice';
import { ChangeTimestampLabel } from './ChangeTimestampLabel';
import { OpenSpecReadiness, OpenSpecToolList } from './OpenSpecReadiness';
import { SpecificationViewer } from './SpecificationViewer';
import { TaskConfirmToast } from './TaskConfirmToast';
import { PipelineNewChangeFlow, type PipelineNewChangeMode } from './PipelineNewChangeFlow';
import { useNewChangeDraft, useNewChangeDraftStore } from '@/lib/new-change-draft-store';
import {
  composeArchiveInstruction,
  deriveArchiveAvailability,
  derivePipelineNextAction,
  hasDiffEvidence,
  resolveTaskLabel,
  resolveTaskText,
  type PipelineActionIntent,
} from './pipeline-next-action';
import { groupActivity, runtimeDisplayName, type ActivityChannel } from './pipeline-domain';
import { sortActiveChangesByProgress } from './pipeline-view-state';
import type { OpenSpecChangeSummary, PipelineSnapshot } from './pipeline-view-state';
import styles from './OpenSpecDashboard.module.css';

type OpenSpecDashboardProps = {
  snapshot: PipelineSnapshot;
  repoPath: string;
  currentBranch: string;
  workingTreeClean: boolean;
  leftOpen: boolean;
  rightOpen: boolean;
  leftWidth: number;
  rightWidth: number;
  onResizeLeft: (event: React.MouseEvent) => void;
  onResizeRight: (event: React.MouseEvent) => void;
  projection: RuntimeProjection | null;
  runtimeHistory: RuntimeProjection[];
  /** Hay datos de vista previa en pantalla: nada ejecutable puede habilitarse. */
  fixtureActive?: boolean;
  /**
   * Hay una relectura de evidencia en curso.
   *
   * Se declara en el ciclo de vida, que es el elemento que va a cambiar cuando
   * termine: un indicador sólo global queda lejos de donde ocurre y la espera se
   * lee como que la aplicación no respondió.
   */
  revalidating?: boolean;
  /** Relee la evidencia del repo. Es el fallback explícito del watcher. */
  onRefresh?: () => void;
  /**
   * Se avisa cuando el renderer selecciona un change manualmente, para que el
   * backend transporte el contenido de sus artefactos sin depender de la rama.
   */
  onSelectChange?: (changeId: string) => void;
  onPauseAfterTask: () => void;
  onRespondDecision: (decisionId: string, optionId: string) => void;
};

type CenterTab = 'work' | 'activity' | 'artifacts';

/**
 * Estado de un archivo, dicho con palabra.
 *
 * Era un recuadro con la inicial, con la palabra sólo en el `title`. Un dato que
 * aparece al pasar el mouse no está presentado: es el mismo criterio por el que
 * el control de tarea dejó de ser un elemento sin señal. El color se conserva,
 * que es lo que permite barrer la lista de un vistazo.
 *
 * El estado sale del store, no del alcance derivado: la derivación responde de
 * dónde viene el archivo, no en qué estado está.
 */
function FileStatusBadge({ path, files }: { path: string; files: GitFile[] }) {
  const t = useT();
  const status = files.find((file) => file.path === path)?.status ?? 'modified';
  const label = t(`pipeline.openspec.prepare.state.${status}`);
  return (
    <span className={styles.fileStatus} data-status={status}>{label}</span>
  );
}

const ACTIVITY_ICONS: Record<ActivityChannel, React.ComponentType<{ size?: number }>> = {
  narrative: MessageSquareText,
  reasoning: BrainCircuit,
  tool: Wrench,
  file: FileCode2,
  system: CheckCircle2,
};

function taskProgress(change: OpenSpecChangeSummary): { completed: number; total: number; percent: number } {
  const total = change.tasks.length;
  const completed = change.tasks.filter((task) => task.completed).length;
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) };
}

function formatTime(value: string | null): string {
  if (!value) return '--:--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--:--';
  return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date);
}

/** Cuándo corrió una sesión, con día y hora. Sin esto, una vieja se lee como actual. */
function formatSessionMoment(startedAt: string): string {
  const date = new Date(startedAt);
  if (Number.isNaN(date.getTime())) return startedAt;
  return new Intl.DateTimeFormat(undefined, {
    month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(date);
}

function formatSessionOption(session: RuntimeProjection): string {
  const runtime = runtimeDisplayName(session.runtime) ?? session.runtime;
  const context = [session.changeId, session.taskId].filter(Boolean).join(' · ');
  const date = new Date(session.startedAt);
  const started = Number.isNaN(date.getTime())
    ? session.startedAt
    : new Intl.DateTimeFormat(undefined, { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
  return [runtime, context, started].filter(Boolean).join(' · ');
}

export function OpenSpecDashboard({
  snapshot,
  repoPath,
  currentBranch,
  workingTreeClean,
  leftOpen,
  rightOpen,
  leftWidth,
  rightWidth,
  onResizeLeft,
  onResizeRight,
  projection,
  runtimeHistory,
  fixtureActive = false,
  revalidating = false,
  onRefresh,
  onSelectChange,
  onPauseAfterTask,
  onRespondDecision,
}: OpenSpecDashboardProps) {
  const t = useT();
  /**
   * Texto con cantidad, concordando en número.
   *
   * Un texto que no concuerda —«Ver las 1 que faltan»— delata que nadie miró el
   * caso de uno, y el caso de uno es el más frecuente al final de cualquier
   * trabajo: la última tarea, el único archivo preparado. Se resuelve acá y no
   * en cada punto de uso, porque son cinco lugares y el sexto se olvidaría.
   *
   * El chino no concuerda en número: su variante `.one` existe igual con el
   * texto que corresponde, para que la ausencia no se lea como un olvido.
   */
  const tCount = (key: string, count: number, params?: Record<string, string | number>): string =>
    t(count === 1 ? `${key}.one` : key, { count, ...params });
  const setSuccess = useGitStore((state) => state.setSuccess);
  const modifiedFiles = useGitStore((state) => state.modifiedFiles);
  const commitMessage = useGitStore((state) => state.commitMessage);
  const setCommitMessage = useGitStore((state) => state.setCommitMessage);
  const { stageFiles } = useGitActions();
  const openSpec = snapshot.openSpec;
  const [selection, setSelection] = useState<string | null>(null);
  const [centerTab, setCenterTab] = useState<CenterTab>('work');
  const [evidenceTab, setEvidenceTab] = useState<DetailTab>('proposal');
  /**
   * Cambios desplegados. Sin entrada, un cambio va plegado.
   *
   * Antes seguía a la selección, y desplegado ocupa varias veces el alto de un
   * ítem plegado: al cambiar de cambio se plegaba el anterior, se liberaba
   * espacio y aparecía otro que hasta entonces estaba fuera de vista. Desplegar
   * es una acción que se pide con su control, no un efecto de seleccionar.
   */
  const [expandedChanges, setExpandedChanges] = useState<Record<string, boolean>>({});
  /**
   * Instrucción a lanzar y su destino.
   *
   * El `taskId` viaja con la instrucción en vez de volver a derivarse de la
   * próxima tarea pendiente al renderizar el lanzador. Re-derivarlo permitía que
   * lo ejecutado dejara de coincidir con lo confirmado: un archivado con tareas
   * pendientes arrancaba atado a una de ellas y quedaba registrado como un
   * intento sobre esa tarea, que es justo lo que traba un change.
   */
  const [launchTarget, setLaunchTarget] = useState<{ instruction: string; taskId: string | null } | null>(null);
  /**
   * El launcher descubre los runtimes de forma asíncrona. Mientras no resolvió,
   * su interior está vacío; el panel contenedor no pinta su marco hasta que haya
   * algo para ver, para no ofrecer un recuadro vacío.
   */
  const [launcherLoading, setLauncherLoading] = useState(false);
  /**
   * Archivado pendiente de confirmación humana.
   *
   * Archivar escribe en el repositorio —mueve el change y consolida sus specs—,
   * así que no se dispara con el click del control: primero se muestra el
   * comando exacto y recién al confirmarlo se ejecuta.
   */
  const [archiveRequest, setArchiveRequest] = useState<{ changeId: string; command: string } | null>(null);
  const [archiveBusy, setArchiveBusy] = useState(false);
  /**
   * Archivos elegidos para preparar. Vacío por defecto y para todos los grupos:
   * sin un cambio de referencia no hay criterio para que ninguno entre solo, y
   * preseleccionar el que estuviera enfocado en la lista lateral produciría un
   * commit distinto según dónde estuviera el foco.
   */
  const [chosenFiles, setChosenFiles] = useState<string[]>([]);
  const [prepareBusy, setPrepareBusy] = useState(false);
  /**
   * Panel de preparación abierto. Se abre a pedido desde el estado del árbol y
   * no al detectar que hay algo sin confirmar: abrirse solo taparía lo que se
   * estaba mirando sin que nadie lo pidiera.
   */
  const [prepareOpen, setPrepareOpen] = useState(false);
  /**
   * Cambios desplegados en la pantalla de entrada, y si la lista de archivados
   * está abierta. Plegados por defecto: con cuatro cambios de veintiocho tareas,
   * una pantalla de estado desplegada sería una lista de tareas.
   */
  const [expandedStart, setExpandedStart] = useState<Record<string, boolean>>({});
  const [archivedOpen, setArchivedOpen] = useState(false);
  /**
   * Cuántos archivos se enviaron en la última preparación.
   *
   * El toast se va solo y deja el panel sin rastro de lo que pasó. Esto
   * sostiene el resultado a la vista hasta que haya algo nuevo que preparar.
   */
  const [lastPreparedCount, setLastPreparedCount] = useState<number | null>(null);
  /**
   * Cambio de casilla pendiente de confirmación, en cualquiera de las dos
   * direcciones.
   *
   * Antes sólo preguntaba el desmarcado, con el argumento de que marcar agrega
   * una afirmación que su autor hace en ese momento mientras que desmarcar borra
   * la constancia de algo que alguien afirmó antes. Eso distinguía bien el
   * contenido de cada acción y dejaba fuera lo que comparten: las dos escriben
   * en el repositorio con un clic que se puede errar, y marcar la última casilla
   * pendiente hace aparecer archivar como acción principal. Un clic accidental
   * podía dejar el cambio ofreciendo cerrarse.
   *
   * Los textos siguen siendo distintos: lo que cada dirección hace no es lo
   * mismo, y el aviso tiene que decir cuál de las dos se está por hacer.
   */
  const [taskToggleRequest, setTaskToggleRequest] = useState<{
    line: number;
    text: string;
    label: string;
    completed: boolean;
  } | null>(null);
  /**
   * Especificación abierta en el centro, si hay alguna.
   *
   * Es una vista aparte y no una pestaña del cambio: una spec consolidada no
   * pertenece a ningún cambio activo, es el resultado acumulado de todos los
   * archivados.
   */
  const [openSpecificationId, setOpenSpecificationId] = useState<string | null>(null);
  /**
   * Solapa del rail. Arranca en actividad: es lo que cambia mientras se trabaja,
   * y el estado de las herramientas se consulta cuando hace falta.
   */
  const [railTab, setRailTab] = useState<'activity' | 'tools'>('activity');
  const [initBusy, setInitBusy] = useState(false);
  /** Motivo real informado por el CLI. No se normaliza a un mensaje propio. */
  const [initError, setInitError] = useState<string | null>(null);
  /**
   * El CLI no pudo detectar ninguna herramienta y hay que elegir una.
   *
   * Se guarda aparte del error porque no es un fallo: es el único caso en que el
   * comando exige `--tools`, y la respuesta que pide es una elección, no leer un
   * mensaje.
   */
  const [initNeedsTool, setInitNeedsTool] = useState(false);
  /**
   * Preferencia del sistema por menos movimiento.
   *
   * El panel ya la respeta en CSS para la banda de relectura; acá hace falta en
   * JavaScript porque el movimiento lo produce la animación de layout, que no
   * pasa por una hoja de estilos.
   */
  const reducedMotion = useReducedMotion();
  const [taskError, setTaskError] = useState<string | null>(null);
  /** Motivo real informado por el CLI. No se normaliza a un mensaje propio. */
  const [archiveError, setArchiveError] = useState<string | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  /**
   * Que el flujo esté abierto es parte del borrador y no estado local.
   *
   * Vivía en un `useState` acá, y cambiar de solapa desmonta el panel entero: al
   * volver, la pantalla no estaba. Es lo primero que se pierde y lo que más
   * desconcierta, porque no queda ni rastro de que había algo empezado.
   */
  const draft = useNewChangeDraft(repoPath);
  const patchDraft = useNewChangeDraftStore((state) => state.patchDraft);
  const clearDraft = useNewChangeDraftStore((state) => state.clearDraft);
  const flowMode: PipelineNewChangeMode | null = draft.open ? draft.mode : null;
  /**
   * Cerrar sin descartar: elegir un cambio o lanzar una tarea sacan el
   * formulario de la vista, pero no son la persona diciendo que ya no lo quiere.
   * Sólo «cerrar sin empezar» y arrancar la sesión descartan lo escrito.
   */
  const closeFlow = () => patchDraft(repoPath, { open: false });
  const openFlow = (mode: PipelineNewChangeMode) => patchDraft(repoPath, { open: true, mode });
  /** «Cerrar sin empezar» sí descarta: es la persona diciendo que no lo quiere. */
  const dismissFlow = () => clearDraft(repoPath);
  const attentionRef = useRef<HTMLElement>(null);

  const activeChanges = openSpec?.activeChanges ?? [];
  const archivedChanges = openSpec?.archivedChanges ?? [];
  const specifications = openSpec?.specifications ?? [];
  const openSpecPresent = openSpec?.openSpecPresent;
  const openSpecTools = openSpec?.openSpecTools;
  const pendingToolCount = (openSpecTools ?? []).filter((tool) => !tool.configured).length;
  const selectableIds = new Set([
    ...activeChanges.map((change) => change.changeId),
    ...archivedChanges.map((change) => change.changeId),
  ]);
  /**
   * Sólo la elección explícita. Sin ella no hay cambio seleccionado y el panel
   * muestra el estado del repositorio.
   *
   * Antes había una cadena de descartes que terminaba en `activeChanges[0]`, y
   * eso hacía que abrir Pipeline entrara al primero de la lista mostrando sus
   * tareas como si fueran el asunto del momento. Un cambio elegido por orden de
   * lista no es información, y nada lo distinguía de uno elegido a propósito.
   *
   * `openSpec.selectedChangeId` tampoco entra acá: cuando el backend deriva una
   * correspondencia entre la rama y un cambio, se señala en la pantalla de
   * entrada. Gastarla en saltar adentro la volvía invisible.
   */
  const selectedId = selection && selectableIds.has(selection) ? selection : null;
  const selectedChange = activeChanges.find((change) => change.changeId === selectedId) ?? null;
  const selectedArchive = archivedChanges.find((change) => change.changeId === selectedId) ?? null;
  /** El que la rama identifica, si el backend pudo derivarlo. Se señala, no se abre. */
  const branchChangeId = openSpec?.selectedChangeId ?? null;
  /**
   * Cambios de la pantalla de entrada, por avance descendente: adelante lo que
   * está por cerrarse. Queda para validación visual si conviene este orden o el
   * de última actividad.
   */
  const startChanges = activeChanges
    .map((change) => ({ change, progress: taskProgress(change) }))
    .sort((left, right) => right.progress.percent - left.progress.percent);
  /** Lo que falta de un cambio. El avance ya está en la barra; esto es qué queda. */
  const pendingOf = (change: OpenSpecChangeSummary) => change.tasks.filter((task) => !task.completed);
  const nextTask = selectedChange?.tasks.find((task) => !task.completed) ?? null;
  // Archivar responde "¿qué me está permitido hacer?", no "¿qué conviene ahora?".
  // Por eso vive fuera de la derivación del siguiente paso.
  const archive = deriveArchiveAvailability(selectedChange, selectedArchive !== null);
  const runtimeActive = projection?.active === true;
  /**
   * Sesiones que corresponden a lo que se está mirando.
   *
   * Con un cambio abierto, sólo las suyas. El resto del panel central es de ese
   * cambio —tareas, artefactos, validación—, así que una columna al lado con
   * otro criterio se lee como si fuera de él: antes caía a la más reciente del
   * repositorio, y ver la actividad de otro cambio sin que nada lo declarara era
   * un modo de fallo silencioso.
   *
   * Una sesión sin `changeId` no entra: el nulo significa que no se pudo
   * atribuir, no que sea de todos.
   *
   * Sin cambio abierto pasan todas, porque el contexto es el repositorio entero
   * y no hay contra qué restringir.
   */
  const openChangeId = selectedChange?.changeId ?? selectedArchive?.changeId ?? null;
  const runtimeSessions = [projection, ...runtimeHistory]
    .filter((entry): entry is RuntimeProjection => entry !== null)
    .filter((entry, index, list) => list.findIndex((candidate) => candidate.sessionId === entry.sessionId) === index)
    .filter((entry) => openChangeId === null || entry.changeId === openChangeId)
    .sort((left, right) => right.startedAt.localeCompare(left.startedAt));
  // La proyección activa deja de privilegiarse por estar corriendo: si es de
  // otro cambio, no está en el conjunto y no puede pisar la lectura de éste.
  const effectiveSessionId = selectedSessionId && runtimeSessions.some((entry) => entry.sessionId === selectedSessionId)
    ? selectedSessionId
    : runtimeSessions.find((entry) => entry.sessionId === projection?.sessionId)?.sessionId
      ?? runtimeSessions[0]?.sessionId
      ?? null;
  const selectedSession = runtimeSessions.find((entry) => entry.sessionId === effectiveSessionId) ?? null;
  /**
   * Con un cambio abierto y sin sesiones suyas no se cae a la actividad suelta
   * del snapshot: sería la de otro trabajo, que es el defecto que se corrige.
   */
  const visibleActivity = selectedSession?.activity ?? (openChangeId === null ? snapshot.activity : []);
  const activityGroups = groupActivity(visibleActivity);
  const selectedReasoningAvailable = selectedSession
    ? selectedSession.reasoningVisibility === 'emitted' || selectedSession.reasoningVisibility === 'summary'
      ? true
      : selectedSession.reasoningVisibility === 'unavailable'
        ? false
        : null
    : snapshot.economy.reasoningAvailable;
  const sessionStatusKey = selectedSession?.outcome
    ?? (visibleActivity.length > 0 ? 'latest' : 'none');
  const runningAgent = snapshot.agents.find((agent) => agent.state === 'running') ?? snapshot.agents[0] ?? null;
  const runningName = runtimeDisplayName(selectedSession?.runtime ?? runningAgent?.runtime ?? null) ?? t('pipeline.openspec.activity.agentUnknown');
  const totalRequirements = specifications.reduce((total, item) => total + (item.requirements ?? 0), 0);
  const totalTasks = activeChanges.reduce((total, change) => total + change.tasks.length, 0);
  const completedTasks = activeChanges.reduce((total, change) => total + change.tasks.filter((task) => task.completed).length, 0);
  const taskPercent = totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

  const nextAction = derivePipelineNextAction({
    fixtureActive,
    selectedChange,
    selectedArchivedChangeId: selectedArchive?.changeId ?? null,
    decisions: snapshot.decisions,
    projection,
    hasActiveChanges: activeChanges.length > 0,
    hasDiffs: hasDiffEvidence(snapshot),
  });
  // Se resuelve contra la lista para que un identificador que ya no exista
  // —porque el repositorio cambió— no deje la vista abierta sobre la nada.
  const openSpecification = openSpecificationId
    ? specifications.find((entry) => entry.specificationId === openSpecificationId) ?? null
    : null;
  // Se sacan a constantes para que el render no repita el chequeo de nulos ni
  // necesite aserciones: si existen, son válidas.
  const primaryAction = nextAction.primary;
  const secondaryAction = nextAction.secondary;

  /**
   * Evidencia observada de la sesión ligada al cambio seleccionado.
   *
   * Es evidencia **de sesión**, no de tarea: ningún runtime atribuye archivos ni
   * líneas a una tarea concreta de `tasks.md`. Mostrarla como si fuera por tarea
   * sería inventar la atribución, así que se rotula por lo que realmente es y
   * queda `null` cuando el stream no la reportó.
   */
  const changeSession = projection && selectedChange && projection.changeId === selectedChange.changeId
    ? projection
    : null;
  const gitDelta = (() => {
    const entry = changeSession?.activity.find((item) => item.text.startsWith('git.changed '));
    const match = entry ? /^git\.changed files=(\d+) additions=(\d+|unknown) deletions=(\d+|unknown)$/.exec(entry.text) : null;
    return match ? { files: match[1], additions: match[2], deletions: match[3] } : null;
  })();
  const lastObservedActivity = changeSession?.activity
    .filter((item) => item.channel === 'narrative' || item.channel === 'tool')
    .at(-1)?.text ?? null;

  /**
   * Abre un artefacto en la columna central.
   *
   * Selecciona el cambio primero: el markdown sólo viaja para el seleccionado,
   * así que abrir un archivo de otro cambio exige traerlo antes.
   */
  const openArtifact = (changeId: string, tab: DetailTab | null) => {
    if (tab === null) return;
    setSelection(changeId);
    onSelectChange?.(changeId);
    setCenterTab('artifacts');
    setEvidenceTab(tab);
    // Igual que al elegir un cambio: lo que ocupa el centro es uno solo.
    setOpenSpecificationId(null);
  };

  /**
   * Alcance del repositorio: todo lo modificado, agrupado por procedencia.
   *
   * No depende del cambio seleccionado. El commit describe el estado del árbol,
   * y atarlo a la selección dejaba estados reales sin ninguna superficie desde
   * la cual prepararse —los restos de un archivado sobre un repositorio sin
   * cambios activos—.
   */
  // Sin `useMemo`: la derivación es recorrer un array y agruparlo, y el
  // compilador de React memoiza por su cuenta. Memoizarlo a mano acá le impedía
  // optimizar el componente entero, que sale más caro que recalcular esto.
  //
  // Los ya preparados salen del cálculo: si siguieran, la lista mostraría como
  // pendiente lo que se acaba de enviar, y el conteo no bajaría nunca.
  /**
   * Lo que la rama declara sobre el trabajo del árbol.
   *
   * Es la fuente primaria de atribución que Ale eligió: una rama es una
   * afirmación deliberada, mientras que observar qué rutas cambiaron mientras
   * una sesión estaba abierta es una correlación temporal. Parado en cualquier
   * otra rama no hay nada que atribuir, y el archivo queda sin atribuir en vez
   * de heredar el cambio que esté seleccionado en la pantalla.
   */
  /**
   * Redactar el asunto con un modelo local.
   *
   * El catálogo se pide una vez al abrir la preparación: es un GET barato y sin
   * generar nada. Redactar, en cambio, es explícito —medido: 25 a 98 segundos y
   * 7 GB de VRAM—, así que nada de esto ocurre en un refresco.
   */
  // El idioma sale del mismo store que el traductor, para que las frases de la
  // espera cambien junto con el resto del panel.
  const uiLanguage = useGitStore((state) => state.language);
  const [aiModels, setAiModels] = useState<LocalModel[]>([]);
  const [aiModel, setAiModel] = useState('');
  /**
   * En qué está la IA: quieta, cargando un modelo, o redactando.
   *
   * Era un solo booleano para las dos operaciones, y por eso las frases de
   * espera arrancaban durante la carga —Ale lo marcó: tienen que aparecer al
   * apretar «Redactar con IA», no antes—. Un booleano tampoco permite mostrar
   * una barra durante la carga y un contador durante la redacción, que son cosas
   * distintas y se ven en momentos distintos.
   */
  const [aiPhase, setAiPhase] = useState<'idle' | 'loading' | 'drafting'>('idle');
  /** Cuándo arrancó lo que está corriendo, para contar los segundos. */
  const [aiStartedAt, setAiStartedAt] = useState<number | null>(null);
  /** Ocupada en cualquiera de las dos: es lo que deshabilita los controles. */
  const aiBusy = aiPhase !== 'idle';
  const setAiBusy = (busy: boolean) => {
    setAiPhase(busy ? 'drafting' : 'idle');
    setAiStartedAt(busy ? Date.now() : null);
  };
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  /**
   * Contexto y minutos de inactividad, elegidos antes de cargar.
   *
   * Los dos se fijan **en la carga** y no se pueden cambiar después, así que
   * tienen que estar antes del botón. El TTL es lo que hace que el modelo se
   * cierre solo; media hora es un punto de partida, no una imposición.
   */
  const [aiContext, setAiContext] = useState(65_536);
  const [aiTtlMinutes, setAiTtlMinutes] = useState(30);
  const aiAbort = useRef<AbortController | null>(null);

  const branchAttribution: ChangeAttribution | null = (() => {
    const changeId = changeIdFromBranch(currentBranch);
    return changeId ? { changeId, source: 'branch' } : null;
  })();
  const commitScope = deriveRepoCommitScope(
    modifiedFiles.filter((file) => !file.staged).map((file) => file.path),
    branchAttribution,
  );
  const nothingLeftToPrepare = commitScope.files.length === 0;
  /** La otra mitad: lo que ya viajó al stage y el panel deja de listar. */
  const stagedFiles = modifiedFiles.filter((file) => file.staged);
  /** Etiqueta de un grupo. El del cambio nombra cuál, que es la atribución real. */
  const groupLabel = (origin: CommitFileOrigin): string => (
    origin.kind === 'change'
      ? origin.source === 'branch'
        // La fuente va en el rótulo, no sólo en la ayuda: es la diferencia entre
        // "vive en la carpeta de este cambio" y "lo editaste parado en su rama".
        ? t('pipeline.openspec.prepare.groupBranch', { change: origin.changeId })
        : t('pipeline.openspec.prepare.groupChange', { change: origin.changeId })
      : origin.kind === 'archived'
        ? t('pipeline.openspec.prepare.groupArchived')
        : t('pipeline.openspec.prepare.groupUnattributed')
  );
  /**
   * Qué contiene el grupo, en una línea. Un rótulo solo no permite auditarlo:
   * sumando todo de una, un archivo que no correspondía queda declarado apenas
   * como sin atribución y ahí se agota la información.
   *
   * El del archivado nombra qué se archivó cuando la carpeta lo declara; sin
   * prefijo de fecha no hay identificador y se dice lo genérico en vez de
   * inventar uno.
   */
  const groupHelp = (group: { origin: CommitFileOrigin; entries: Array<{ path: string }> }): string => {
    if (group.origin.kind === 'change') {
      // El punto ciego se declara donde se atribuye, no en un reporte que nadie
      // abre al confirmar: la rama afirma sobre el archivo por dónde se lo
      // editó, no por lo que el archivo es.
      return group.origin.source === 'branch'
        ? t('pipeline.openspec.prepare.groupBranchHelp', { branch: currentBranch || 'change/…' })
        : t('pipeline.openspec.prepare.groupChangeHelp');
    }
    if (group.origin.kind === 'unattributed') return t('pipeline.openspec.prepare.groupUnattributedHelp');
    const archived = group.entries.map((entry) => archivedChangeId(entry.path)).find(Boolean);
    return archived
      ? t('pipeline.openspec.prepare.groupArchivedHelp', { change: archived })
      : t('pipeline.openspec.prepare.groupArchivedHelpPlain');
  };
  /** Elegidos que siguen existiendo entre lo modificado, en el orden del árbol. */
  const chosen = commitScope.files
    .filter((entry) => chosenFiles.includes(entry.path))
    .map((entry) => entry.path);

  /** Suma o quita un conjunto entero: el total o un grupo. */
  const toggleMany = (paths: string[]) => {
    const allChosen = paths.every((path) => chosenFiles.includes(path));
    setChosenFiles((current) => (allChosen
      ? current.filter((path) => !paths.includes(path))
      : [...new Set([...current, ...paths])]
    ));
  };

  /**
   * Deja el commit listo: archivos preparados y mensaje sugerido escrito.
   *
   * **No confirma.** Confirmar es del flujo de commit, con el mensaje a la vista
   * y su botón propio: preparar es reversible y confirmar queda en la historia.
   */
  /**
   * El catálogo, una vez al abrir la preparación.
   *
   * Un GET barato que no genera nada. Si el servidor local no está, el
   * desplegable queda vacío y lo dice: la preparación sigue funcionando sin IA,
   * igual que Cartografía.
   */
  useEffect(() => {
    if (!prepareOpen || !repoPath) return;
    let alive = true;
    window.api?.commitAi?.catalog().then((result) => {
      if (!alive) return;
      // Los de embeddings no redactan nada; se filtran acá y no en el proveedor,
      // que los conserva con su tipo para poder explicar por qué no sirven.
      // Nada preseleccionado: elegir el modelo es de la persona, y eso es el
      // fundamento entero del selector —está medido que la función sirve o no
      // según cuál sea—. Dejar uno puesto convertiría esa decisión en un
      // descuido, que es el mismo motivo por el que no entra ningún archivo
      // tildado en este panel.
      setAiModels((result?.data ?? []).filter((model) => model.kind !== 'embeddings'));
    }).catch(() => { if (alive) setAiModels([]); });
    return () => { alive = false; };
  }, [prepareOpen, repoPath]);

  /**
   * El modelo elegido, para saber si hace falta cargarlo antes de redactar.
   *
   * Un modelo en disco no tiene contexto: el que se use lo decide LM Studio al
   * levantarlo. Por eso «no alcanza» y «no está cargado» se resuelven igual —hay
   * que cargarlo— y se ofrecen juntos.
   */
  const aiChosenModel = aiModels.find((model) => model.id === aiModel) ?? null;
  const aiNeedsLoad = Boolean(aiChosenModel)
    && !(aiChosenModel!.loaded && (aiChosenModel!.loadedContextLength ?? 0) >= 32_768);

  const confirmAiLoad = async () => {
    if (aiBusy || !aiModel) return;
    // Fase «cargando», no «redactando»: es lo que hace que las frases de espera
    // no arranquen acá, y lo que permite mostrar una barra en su lugar.
    setAiPhase('loading');
    setAiStartedAt(Date.now());
    setAiNotice(null);
    try {
      const result = await window.api?.commitAi?.load(aiModel, undefined, aiContext, aiTtlMinutes * 60);
      if (!result?.success) {
        setAiNotice(t('pipeline.openspec.prepare.aiFailed', { detail: result?.error ?? '—' }));
        return;
      }
      // Relee el catálogo: el modelo que se acaba de cargar tiene ahora un
      // contexto real, y el desplegable lo seguía mostrando «en disco».
      const catalog = await window.api?.commitAi?.catalog();
      setAiModels((catalog?.data ?? []).filter((model) => model.kind !== 'embeddings'));
    } finally {
      setAiBusy(false);
    }
  };

  /**
   * Cerrar el panel también corta lo que esté en vuelo.
   *
   * Antes cerraba la vista y dejaba al modelo trabajando: la persona ya declaró
   * que no lo quiere, y quedaba un aviso viejo esperando a que reabriera.
   */
  const closePrepare = () => {
    if (aiBusy) cancelAiDraft();
    setAiNotice(null);
    setPrepareOpen(false);
  };

  /**
   * Descargar el modelo a mano, sin esperar a que venza su TTL.
   *
   * Ale lo pidió: GitCron cargaba 7 GB en la placa y no daba ninguna salida.
   * Esperar los minutos del TTL no es una respuesta cuando querés la VRAM ahora.
   */
  const unloadAiModel = async () => {
    if (aiBusy || !aiModel) return;
    setAiPhase('loading');
    setAiStartedAt(Date.now());
    setAiNotice(null);
    try {
      const result = await window.api?.commitAi?.unload(aiModel);
      if (!result?.success) {
        setAiNotice(t('pipeline.openspec.prepare.aiFailed', { detail: result?.error ?? '—' }));
        return;
      }
      const catalog = await window.api?.commitAi?.catalog();
      setAiModels((catalog?.data ?? []).filter((model) => model.kind !== 'embeddings'));
    } finally {
      setAiPhase('idle');
      setAiStartedAt(null);
    }
  };

  const cancelAiDraft = () => {
    aiAbort.current?.abort();
    aiAbort.current = null;
    // Corta la petición del otro lado, no sólo descarta la respuesta: antes el
    // modelo seguía trabajando después de apretar «Cancelar».
    void window.api?.commitAi?.cancel();
    setAiBusy(false);
    setAiNotice(null);
  };

  const draftWithAi = async () => {
    if (aiBusy || !repoPath || !aiModel || chosen.length === 0) return;
    setAiBusy(true);
    setAiNotice(null);
    const controller = new AbortController();
    aiAbort.current = controller;
    try {
      const result = await window.api?.commitAi?.draft({
        repoPath,
        paths: chosen,
        changeId: soleChangeId(chosen, branchAttribution),
        intent: selectedChange?.intent ?? null,
        model: aiModel,
      });
      // Cancelar mientras estaba en vuelo: lo que llegue después ya no se aplica.
      if (controller.signal.aborted) return;
      const draft = result?.data;
      if (!result?.success || !draft) {
        setAiNotice(t('pipeline.openspec.prepare.aiFailed', { detail: result?.error ?? '—' }));
        return;
      }
      if (draft.status === 'drafted') {
        setCommitMessage(draft.subject);
        // Se nombra el modelo: quien confirma tiene que poder ver que esto lo
        // escribió un modelo y no la aplicación.
        setAiNotice(t('pipeline.openspec.prepare.aiWrote', { model: draft.model }));
        return;
      }
      if (draft.status === 'no-answer') {
        // «No contestó» y no «contestó vacío»: con el razonamiento comiéndose el
        // presupuesto, decir que devolvió un mensaje vacío haría pensar que la
        // función está rota cuando lo que falta es techo de tokens.
        setAiNotice(draft.reason === 'budget'
          ? t('pipeline.openspec.prepare.aiNoAnswerBudget', { model: draft.model })
          : t('pipeline.openspec.prepare.aiNoAnswer', { model: draft.model }));
        return;
      }
      if (draft.status === 'malformed') {
        // Contestó, pero sin la forma pedida. No se impone en el campo —eso
        // obligaría a corregirlo a mano— y se muestra igual: puede ser una buena
        // descripción a la que sólo le falta el prefijo, y tirarla diciendo que
        // no contestó sería mentir sobre lo que pasó.
        setAiNotice(t('pipeline.openspec.prepare.aiMalformed', {
          model: draft.model,
          subject: draft.subject,
        }));
        return;
      }
      setAiNotice(draft.detail);
    } finally {
      if (aiAbort.current === controller) aiAbort.current = null;
      if (!controller.signal.aborted) setAiBusy(false);
    }
  };

  const prepareCommit = async () => {
    if (prepareBusy || fixtureActive || chosen.length === 0) return;
    setPrepareBusy(true);
    try {
      const staged = await stageFiles(chosen, true);
      if (!staged) return;
      // El mensaje se compone sobre el conjunto que realmente se envía, no sobre
      // todo lo modificado: la sugerencia describe el commit que se va a hacer.
      if (!commitMessage.trim()) setCommitMessage(suggestCommitMessage(chosen, branchAttribution));
      setLastPreparedCount(chosen.length);
      // Lo elegido ya viajó: dejarlo marcado haría que una segunda preparación
      // volviera a incluir archivos que ya no están en la lista.
      setChosenFiles([]);
      setSuccess(tCount('pipeline.openspec.prepare.done', chosen.length));
    } finally {
      setPrepareBusy(false);
    }
  };

  /**
   * Cambia el estado de una tarea.
   *
   * El texto viaja para que el proceso principal verifique que sigue siendo la
   * misma tarea: con el watcher andando, el archivo puede haber cambiado entre
   * que se dibujó esta lista y llegó el clic.
   */
  const setTaskChecked = async (line: number, text: string, completed: boolean) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!selectedChange || fixtureActive || !api?.pipelineSetTaskChecked) return;
    setTaskError(null);
    const response = await api.pipelineSetTaskChecked(repoPath, selectedChange.changeId, line, text, completed);
    const result = response as { success?: boolean; error?: string } | null;
    if (result?.success) {
      // La lista se relee del disco: la casilla cambia porque el archivo lo
      // dice, no porque la llamada haya vuelto sin error.
      onRefresh?.();
      return;
    }
    setTaskError(result?.error === 'mismatch'
      ? t('pipeline.openspec.task.mismatch')
      : t('pipeline.openspec.task.failed'));
  };

  /**
   * Ejecuta el archivado ya confirmado.
   *
   * El resultado se lee de lo que devuelve el CLI, no del hecho de que la
   * llamada terminó: un fallo muestra el motivo real y el cambio sigue activo.
   */
  const confirmArchive = () => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!archiveRequest || archiveBusy || fixtureActive || !api?.pipelineArchiveChange) return;
    setArchiveBusy(true);
    setArchiveError(null);
    void api.pipelineArchiveChange(repoPath, archiveRequest.changeId)
      .then((response) => {
        const result = response as { success?: boolean; error?: string } | null;
        if (result?.success) {
          setArchiveRequest(null);
          // Por la superficie de notificaciones de la aplicación, no por una
          // propia: el éxito de archivar no es una clase de aviso distinta de
          // las demás, y el toast ya resuelve autocierre y cierre manual.
          setSuccess(t('pipeline.openspec.archive.done', { change: archiveRequest.changeId }));
          // La evidencia se relee: el cambio pasa a figurar entre los archivados
          // porque el disco lo dice, no porque la llamada haya vuelto sin error.
          onRefresh?.();
          return;
        }
        setArchiveError(result?.error || 'unknown');
      })
      .catch((error: unknown) => setArchiveError(error instanceof Error ? error.message : 'unknown'))
      .finally(() => setArchiveBusy(false));
  };

  /**
   * Inicializa OpenSpec en el repositorio abierto.
   *
   * No pasa por ninguna sesión de runtime: el proceso principal invoca el CLI,
   * por el mismo motivo que el archivado. Un agente puede no tener el comando y
   * devolver éxito sin haber hecho nada.
   *
   * La evidencia se relee al terminar: lo que el panel muestra después sale del
   * disco, no de suponer que el comando hizo lo que dijo.
   */
  const runOpenSpecInit = (tools?: string[]) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineInitOpenSpec || initBusy) return;
    setInitBusy(true);
    setInitError(null);
    void api.pipelineInitOpenSpec(repoPath, tools)
      .then((result) => {
        if (result?.success) {
          setInitNeedsTool(false);
          onRefresh?.();
          return;
        }
        // «No encontró herramientas» no es un fallo: es el único caso en que hay
        // que elegir a mano. Mostrarlo como error dejaría a la persona leyendo
        // un mensaje del CLI sin nada que hacer con él.
        if (result?.needsTool) {
          setInitNeedsTool(true);
          return;
        }
        setInitError(result?.error || 'unknown');
      })
      .catch((error: unknown) => setInitError(error instanceof Error ? error.message : 'unknown'))
      .finally(() => setInitBusy(false));
  };

  const selectChange = (changeId: string) => {
    setSelection(changeId);
    onSelectChange?.(changeId);
    setCenterTab('work');
    setLaunchTarget(null);
    closeFlow();
    // Elegir un cambio cierra la especificación abierta: las dos ocupan el
    // centro, así que dejarla puesta hacía que la barra lateral pareciera no
    // responder —se marcaba el cambio elegido y el centro seguía mostrando la
    // especificación, sin más salida que "ver el repositorio"—.
    setOpenSpecificationId(null);
    // La preparación no se reinicia acá: es del repositorio, no del cambio.
    // Borrarla al cambiar de selección perdería una elección de archivos que no
    // tiene nada que ver con qué cambio se está mirando.
  };

  /**
   * Traduce el intent ya resuelto por la derivación a un efecto de UI.
   *
   * No decide nada por su cuenta: si un intent llegó hasta acá, la función pura
   * ya determinó que corresponde en este estado.
   */
  const handleIntent = (intent: PipelineActionIntent) => {
    switch (intent.kind) {
      case 'open-propose-flow':
      case 'open-explore-flow':
        openFlow(intent.kind === 'open-propose-flow' ? 'propose' : 'explore');
        setLaunchTarget(null);
        setCenterTab('work');
        break;
      // Se usa la instrucción que la derivación ya compuso, que es exactamente la
      // que se muestra bajo "Ver instrucción". Recomponerla acá abriría la puerta
      // a que lo mostrado y lo ejecutado dejaran de coincidir.
      //
      // El destino sale del propio intent, no de la evidencia: `start-apply`
      // nombra su tarea y `start-archive` no tiene ninguna. Volver a derivarlo
      // del estado hacía que archivar con tareas pendientes arrancara atado a
      // una de ellas.
      case 'start-apply':
        closeFlow();
        setLaunchTarget(nextAction.instruction ? { instruction: nextAction.instruction, taskId: intent.taskId } : null);
        setCenterTab('work');
        break;
      // Archivar NO abre un runtime: lo ejecuta el proceso principal con el CLI.
      // Delegarlo en un agente agregaba un intermediario que podía no tener el
      // comando ni shell para correrlo, y devolver éxito sin hacer nada. Acá se
      // pide confirmación mostrando el comando exacto que se va a ejecutar.
      case 'start-archive': {
        closeFlow();
        setLaunchTarget(null);
        setArchiveError(null);
        setArchiveRequest({ changeId: intent.changeId, command: composeArchiveInstruction(intent.changeId) });
        setCenterTab('work');
        break;
      }
      case 'focus-decision':
        // El centro no duplica la decisión: lleva el foco al control real, que
        // vive en el panel de actividad.
        attentionRef.current?.focus();
        break;
      case 'view-activity':
        setCenterTab('activity');
        break;
      case 'view-evidence':
      case 'view-diff':
        // Los artefactos/diffs viven en su propia pestaña ahora.
        setCenterTab('artifacts');
        if (intent.kind === 'view-diff') setEvidenceTab('diffs');
        break;
      case 'refresh-validation':
        onRefresh?.();
        break;
      case 'pause-after-task':
        onPauseAfterTask();
        break;
    }
  };

  // Una sesión nueva pasa a estar seleccionada mientras corre: si la persona
  // estaba mirando una sesión vieja, quedarse ahí escondería la que arranca.
  const liveSessionId = projection?.active === true ? projection.sessionId : null;
  const [lastLiveSessionId, setLastLiveSessionId] = useState<string | null>(null);
  if (liveSessionId !== lastLiveSessionId) {
    setLastLiveSessionId(liveSessionId);
    if (liveSessionId) setSelectedSessionId(liveSessionId);
  }

  // Selección del change recién creado, sólo cuando puede identificarse de forma
  // verificable: exactamente un identificador nuevo respecto de la lectura
  // anterior. Con cero o con varios no se adivina.
  const [previousChangeIds, setPreviousChangeIds] = useState<string[] | null>(null);
  const activeChangeIds = activeChanges.map((change) => change.changeId);
  const changeIdsDiffer = previousChangeIds === null
    || previousChangeIds.length !== activeChangeIds.length
    || activeChangeIds.some((id, index) => previousChangeIds[index] !== id);
  if (changeIdsDiffer) {
    setPreviousChangeIds(activeChangeIds);
    if (previousChangeIds !== null) {
      const added = activeChangeIds.filter((id) => !previousChangeIds.includes(id));
      // Exactamente uno: con cero o con varios no hay forma verificable de saber
      // cual corresponde a la sesion que acaba de cerrar, y se deja la seleccion
      // como estaba en vez de adivinar.
      if (added.length === 1) {
        setSelection(added[0]);
        closeFlow();
        setLaunchTarget(null);
      }
    }
  }

  return (
    <div
      className={styles.dashboard}
      data-left-open={leftOpen}
      data-right-open={rightOpen}
      style={{
        '--openspec-left-width': `${Math.max(320, Math.min(leftWidth, 400))}px`,
        '--openspec-right-width': `${Math.max(300, Math.min(rightWidth, 460))}px`,
      } as React.CSSProperties}
    >
      <header className={styles.summaryBar}>
        {/* Dos líneas, no una frase que se parte sola: el salto es parte del
            rótulo y no puede depender del ancho de la ventana. El nombre dice
            el método —desarrollo guiado por especificación— en vez de la
            herramienta que lo implementa. */}
        <h2 className={styles.brand}>
          <span>Spec-Driven</span>
          <span>Development</span>
        </h2>
        <dl className={styles.summaryFacts}>
          <div><dd>{specifications.length}</dd><dt>{t('pipeline.openspec.summary.specifications')}</dt></div>
          <div><dd>{activeChanges.length}</dd><dt>{t('pipeline.openspec.summary.active')}</dt></div>
          <div><dd>{archivedChanges.length}</dd><dt>{t('pipeline.openspec.summary.completed')}</dt></div>
          <div><dd>{taskPercent}%</dd><dt>{t('pipeline.openspec.summary.tasks')}</dt></div>
        </dl>
        {/* El estado del árbol es la puerta a la preparación: el commit es del
            repositorio, y éste es el único lugar del panel que ya habla del
            repositorio entero. Es un control, no un rótulo, así que el área
            clickeable es toda la caja y no sólo el texto. */}
        <button
          type="button"
          className={styles.repoHealth}
          data-clean={workingTreeClean}
          aria-expanded={prepareOpen}
          title={t('pipeline.openspec.prepare.open')}
          onClick={() => setPrepareOpen((open) => !open)}
        >
          <span className={styles.healthDot} aria-hidden="true" />
          <strong>{workingTreeClean ? t('pipeline.openspec.repo.clean') : t('pipeline.openspec.repo.changed')}</strong>
          {/* La rama es el destino del commit, el mismo dato que el panel de
              preparación declara al lado del mensaje. Recibe el mismo
              tratamiento en los dos lugares para que no se lea como dos cosas
              distintas; antes iba debajo, en chico, como si fuera un detalle. */}
          <em className={styles.repoBranch}>{currentBranch || t('pipeline.openspec.repo.branchUnknown')}</em>
          <em className={styles.repoHealthCta}>{t('pipeline.openspec.prepare.open')}</em>
        </button>
      </header>

      <div className={styles.body}>
        {leftOpen && (
          <aside className={styles.navigator} aria-label={t('pipeline.openspec.navigator.label')}>
            <div className={styles.resizeHandleLeft} role="separator" aria-orientation="vertical" title={t('pipeline.openspec.resize.left')} onMouseDown={onResizeLeft} />
            <section className={styles.navSection} data-tone="active">
              <h3>{t('pipeline.openspec.active.title')} <span>{activeChanges.length}</span></h3>
              {/* La lista se desplaza dentro de su propio alto: sin esto crecía
                  sin tope, dejaba cambios fuera de vista sin señal y empujaba
                  las secciones de abajo detrás de toda la lista. */}
              <div className={styles.activeList}>
              {activeChanges.length === 0 ? (
                <p className={styles.navEmpty}>{t('pipeline.openspec.active.empty')}</p>
              ) : sortActiveChangesByProgress(activeChanges).map((change) => {
                const itemProgress = taskProgress(change);
                const isSelected = change.changeId === selectedId;
                // Plegado por defecto: desplegar es una acción que se pide, no
                // un efecto de seleccionar. Siguiendo a la selección, el
                // desplegado ocupaba varias veces el alto de un ítem plegado, y
                // al cambiar de cambio aparecía otro que estaba oculto.
                const isExpanded = expandedChanges[change.changeId] ?? false;
                const tasksDone = itemProgress.completed === itemProgress.total && itemProgress.total > 0;
                // Sólo el cambio seleccionado transporta el markdown: en los
                // demás el archivo se lista pero todavía no se puede abrir.
                const readable = change.artifacts;

                const artifactRow = (
                  label: string,
                  exists: boolean,
                  stateLabel: string,
                  tab: DetailTab | null,
                  icon: React.ReactNode,
                ) => (
                  <button
                    type="button"
                    className={styles.artifactRow}
                    disabled={!exists || tab === null || readable === null}
                    onClick={() => openArtifact(change.changeId, tab)}
                    title={exists ? t('pipeline.openspec.artifact.open', { file: label }) : undefined}
                  >
                    {icon} {label} <em data-done={exists}>{stateLabel}</em>
                  </button>
                );

                return (
                  /* La lista se reordena sola al tildar una casilla, así que un
                     ítem puede saltar de posición mientras se lo mira.
                     `layout` es lo que suaviza ese salto: el fade por sí solo no
                     lo haría, porque React reusa el nodo por su `key` y lo
                     reubica sin remontarlo. El fundido queda para cuando un
                     cambio entra o sale de la lista, que es el mismo patrón de
                     hidratación que ya usa el visor de diferencias.
                     Corto a propósito: acompaña el movimiento, no lo protagoniza. */
                  <motion.div
                    key={change.changeId}
                    layout={reducedMotion ? false : 'position'}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={reducedMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' }}
                    className={styles.activeChange}
                    data-selected={isSelected}
                  >
                    <div className={styles.changeHeadingRow}>
                      <button
                        type="button"
                        className={styles.changeSelect}
                        onClick={() => selectChange(change.changeId)}
                      >
                        <span className={styles.changeHeading}>
                          <span className={styles.changeDot} aria-hidden="true" />
                          <strong>{change.changeId}</strong>
                          <span>{itemProgress.percent}%</span>
                        </span>
                        <span className={styles.progressTrack} aria-label={t('pipeline.openspec.progress', { completed: itemProgress.completed, total: itemProgress.total })}>
                          <span style={{ width: `${itemProgress.percent}%` }} />
                        </span>
                      </button>
                      <button
                        type="button"
                        className={styles.changeToggle}
                        aria-expanded={isExpanded}
                        aria-label={t(isExpanded ? 'pipeline.openspec.change.collapse' : 'pipeline.openspec.change.expand', { change: change.changeId })}
                        onClick={() => setExpandedChanges((current) => ({ ...current, [change.changeId]: !isExpanded }))}
                      >
                        <ChevronDown size={14} data-expanded={isExpanded} />
                      </button>
                    </div>

                    {isExpanded && (
                      <>
                        <p className={styles.changeIntent}>{change.intent ?? t('pipeline.openspec.intentUnknown')}</p>
                        <div className={styles.artifactList}>
                          {artifactRow('proposal.md', change.proposalExists, change.proposalExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'proposal', <FileText size={13} />)}
                          {artifactRow('design.md', change.designExists, change.designExists ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'design', <FileText size={13} />)}
                          {artifactRow('specs/', change.specsCount > 0, change.specsCount > 0 ? t('pipeline.openspec.complete') : t('pipeline.openspec.pending'), 'specs', <FolderOpen size={13} />)}
                          {artifactRow('tasks.md', itemProgress.total > 0, tasksDone ? t('pipeline.openspec.complete') : t('pipeline.openspec.inProgress'), 'tasks', <FileText size={13} />)}
                        </div>
                      </>
                    )}
                  </motion.div>
                );
              })}
              </div>
            </section>

            <section className={styles.navSection} data-tone="completed">
              <h3>{t('pipeline.openspec.completed.title')} <span>{archivedChanges.length}</span></h3>
              <div className={styles.compactList}>
                {archivedChanges.slice(0, 8).map((change) => (
                  <button type="button" key={`${change.archivedAt}-${change.changeId}`} data-selected={selectedId === change.changeId} onClick={() => selectChange(change.changeId)}>
                    <CheckCircle2 size={13} />
                    <strong>{change.changeId}</strong>
                    <span>{change.archivedAt ?? t('pipeline.openspec.dateUnknown')}</span>
                  </button>
                ))}
                {archivedChanges.length === 0 && <p className={styles.navEmpty}>{t('pipeline.openspec.completed.empty')}</p>}
              </div>
            </section>

            <section className={styles.navSection} data-tone="specifications">
              <h3>{t('pipeline.openspec.specifications.title')} <span>{specifications.length}</span></h3>
              <div className={styles.specList}>
                {/* Botón y no `div`: ahora hay contenido que mostrar. Antes se
                    listaban como texto muerto porque el snapshot no traía nada
                    que abrir. */}
                {specifications.map((specification) => (
                  <button
                    type="button"
                    key={specification.specificationId}
                    title={specification.sourceRef}
                    data-selected={openSpecificationId === specification.specificationId}
                    onClick={() => setOpenSpecificationId(specification.specificationId)}
                  >
                    <BookOpen size={11} />
                    <strong>{specification.specificationId}</strong>
                    <span>{specification.requirements === null ? '—' : t('pipeline.openspec.requirements', { count: specification.requirements })}</span>
                  </button>
                ))}
                {specifications.length === 0 && <p className={styles.navEmpty}>{t('pipeline.openspec.specifications.empty')}</p>}
              </div>
            </section>
          </aside>
        )}

        <main className={styles.center}>
          {/* La preparación se resuelve antes que el cambio seleccionado: es del
              repositorio y tiene que alcanzarse sin ninguno, que es exactamente
              el estado que dejaba un archivado sin confirmar. */}
          {/* Una especificación abierta gana sobre el resto de la vista central,
              salvo la preparación: ésta es del repositorio y no puede quedar
              tapada por lo que se esté leyendo. */}
          {!prepareOpen && openSpecification ? (
            <SpecificationViewer
              repoPath={repoPath}
              specificationId={openSpecification.specificationId}
              requirements={openSpecification.requirements}
              sourceRef={openSpecification.sourceRef}
              onBack={() => setOpenSpecificationId(null)}
            />
          ) : prepareOpen ? (
            <section className={styles.prepareArea} aria-label={t('pipeline.openspec.prepare.title')}>
              {/* Las acciones comparten fila con el título, arriba y a la
                  derecha: al final de la lista quedaban fuera de vista con
                  veinte archivos y había que bajar para encontrarlas. */}
              <div className={styles.prepareHead}>
                <div className={styles.archiveConfirmHead}>
                  <strong>{t('pipeline.openspec.prepare.title')}</strong>
                  <span>{t('pipeline.openspec.prepare.help')}</span>
                  {/* Un commit lo definen tres cosas: qué archivos, con qué
                      mensaje y a qué rama. La tercera no estaba acá. Hoy pasa
                      desapercibido porque siempre es `main`; deja de pasarlo en
                      cuanto haya más de una. Es dato, no control: este panel no
                      ejecuta ninguna operación de Git. */}
                  <em className={styles.prepareBranch}>
                    <GitBranch size={11} />
                    {t('pipeline.openspec.prepare.toBranch', {
                      branch: currentBranch || t('pipeline.openspec.repo.branchUnknown'),
                    })}
                  </em>
                </div>
                <div className={styles.prepareActions}>
                  {!nothingLeftToPrepare && (
                    <>
                      <span className={styles.prepareCount}>
                        {t('pipeline.openspec.prepare.selected', {
                          count: chosen.length,
                          total: commitScope.files.length,
                        })}
                      </span>
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={prepareBusy}
                        onClick={() => toggleMany(commitScope.files.map((entry) => entry.path))}
                      >
                        {chosen.length === commitScope.files.length
                          ? t('pipeline.openspec.prepare.deselectAll')
                          : t('pipeline.openspec.prepare.selectAll')}
                      </button>
                      {/* `aria-disabled` y no `disabled`: el panel se abre sin
                          nada elegido, que es el estado más frecuente, y con el
                          `disabled` nativo la acción principal salía del orden de
                          foco. Quien recorre con teclado nunca se enteraba de que
                          existía. `prepareCommit` ya corta solo, así que apretarla
                          no prepara nada. */}
                      <button
                        type="button"
                        className={styles.primaryAction}
                        aria-disabled={prepareBusy || fixtureActive || chosen.length === 0}
                        onClick={() => void prepareCommit()}
                      >
                        {prepareBusy ? <Loader2 size={14} className={styles.spin} /> : <GitBranch size={14} />}
                        {t('pipeline.openspec.prepare.action')}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    className={styles.secondaryAction}
                    onClick={closePrepare}
                  >
                    {t('pipeline.openspec.prepare.close')}
                  </button>
                </div>
              </div>

              {nothingLeftToPrepare ? (
                /* El toast se va solo; esto deja el resultado a la vista hasta
                   que haya algo nuevo que preparar. */
                <p className={styles.prepareEmpty}>
                  {lastPreparedCount === null
                    ? t('pipeline.openspec.prepare.empty')
                    : tCount('pipeline.openspec.prepare.preparedSummary', lastPreparedCount)}
                </p>
              ) : (
                <>
                  {/* El mensaje se corrige acá, donde se decide qué entra. Era un
                      `code` de sólo lectura: obligaba a recordar la corrección
                      hasta la vista de Commit. El campo escribe directo en el
                      `commitMessage` del store, así que lo que se lee es lo que se
                      va a confirmar; con dos fuentes podrían no coincidir, que es
                      el modo de fallo que este panel existe para evitar. */}
                  {/* El campo ocupa su lugar desde el principio, vacío mientras
                      no haya nada elegido. Aparecer al tildar el primer archivo
                      empujaba toda la lista hacia abajo justo cuando se estaba
                      mirando dónde tildar. */}
                  <label className={styles.messageField}>
                    <strong>{t('pipeline.openspec.prepare.message')}</strong>
                    <input
                      type="text"
                      value={chosen.length === 0 ? commitMessage : (commitMessage || suggestCommitMessage(chosen, branchAttribution))}
                      disabled={prepareBusy || aiBusy}
                      placeholder={t('pipeline.openspec.prepare.messagePlaceholder')}
                      onChange={(event) => setCommitMessage(event.target.value)}
                    />
                  </label>
                  {/* La frase de espera va DEBAJO del campo.
                      Primero se probó encima, y con el campo vacío se leía
                      encimada con el texto de ayuda —Ale lo marcó—. Debajo no
                      tapa nada y sigue sin poder ser el mensaje: el valor del
                      input nunca la toca. Es un estado, no un valor. */}
                  {/* En su propio componente: el temporizador vivía acá y cada
                      2,8 s re-renderizaba el panel entero durante los 40 s de
                      una redacción. */}
                  {/* Los dos estados en un contenedor propio, y no sueltos.
                      Sueltos peleaban con los márgenes negativos de sus vecinos
                      —el campo de arriba y la fila del modelo de abajo, que se
                      pega con -0,75rem— y la barra terminaba encimada con el
                      borde del desplegable. Ale lo marcó. */}
                  {aiPhase !== 'idle' && (
                    <div className={styles.aiStatus}>
                      <DraftingThought active={aiPhase === 'drafting'} language={uiLanguage} />
                      {/* La marca de arranque como clave: cada corrida remonta el
                          contador, así no arrastra los segundos de la anterior. */}
                      <AiElapsed key={aiStartedAt ?? 'idle'} phase={aiPhase} startedAt={aiStartedAt} />
                    </div>
                  )}
                  {/* Redactar con un modelo local. Nunca se dispara solo: medido,
                      tarda entre 25 y 98 segundos y ocupa GPU. Un refresco del
                      panel no puede costar eso. */}
                  <div className={styles.aiRow}>
                    <select
                      value={aiModel}
                      disabled={aiBusy || aiModels.length === 0}
                      aria-label={t('pipeline.openspec.prepare.aiModel')}
                      onChange={(event) => setAiModel(event.target.value)}
                    >
                      {/* La opción vacía se queda siempre: es la que hace que el
                          desplegable arranque sin nada elegido. */}
                      <option value="">
                        {aiModels.length === 0
                          ? t('pipeline.openspec.prepare.aiNoModels')
                          : t('pipeline.openspec.prepare.aiChoose')}
                      </option>
                      {aiModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {/* Estado y contexto real a la vista: elegir uno en
                              disco significa esperar la carga, y el contexto con
                              el que quedó cargado no es su máximo teórico. */}
                          {model.loaded
                            ? `${model.id} · ${model.loadedContextLength ?? '?'}`
                            : `${model.id} · ${t('pipeline.openspec.prepare.aiNotLoaded')}`}
                        </option>
                      ))}
                    </select>
                    {/* Un modelo en disco no puede redactar: primero se carga.
                        Ofrecerlo acá evita el callejón sin salida de declarar
                        que falta contexto y no dar la salida. */}
                    {/* Contexto y TTL se eligen ANTES de cargar, porque los dos
                        se fijan en la carga y no se pueden cambiar después. El
                        TTL es lo que hace que el modelo se cierre solo. */}
                    {aiNeedsLoad && (
                      <>
                        <label className={styles.aiNumber}>
                          <span>{t('pipeline.openspec.prepare.aiContextLabel')}</span>
                          <input
                            type="number"
                            min={32768}
                            step={8192}
                            value={aiContext}
                            disabled={aiBusy}
                            onChange={(event) => setAiContext(Number(event.target.value) || 0)}
                          />
                        </label>
                        <label className={styles.aiNumber}>
                          <span>{t('pipeline.openspec.prepare.aiTtlLabel')}</span>
                          <input
                            type="number"
                            min={1}
                            step={1}
                            value={aiTtlMinutes}
                            disabled={aiBusy}
                            onChange={(event) => setAiTtlMinutes(Number(event.target.value) || 0)}
                          />
                        </label>
                      </>
                    )}
                    {/* La salida: si está cargado, se puede descargar acá mismo.
                        Antes GitCron tomaba la placa y no ofrecía cómo soltarla
                        salvo esperar el TTL o ir a LM Studio. */}
                    {!aiNeedsLoad && aiChosenModel?.loaded && (
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={aiBusy}
                        onClick={unloadAiModel}
                      >
                        <PowerOff size={13} aria-hidden="true" />
                        {t('pipeline.openspec.prepare.aiUnload')}
                      </button>
                    )}
                    {aiNeedsLoad ? (
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={aiBusy || !aiModel || aiContext < 32768 || aiTtlMinutes < 1}
                        onClick={confirmAiLoad}
                      >
                        {aiPhase === 'loading' ? t('pipeline.openspec.prepare.aiLoading') : t('pipeline.openspec.prepare.aiLoad')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className={styles.secondaryAction}
                        disabled={aiBusy || chosen.length === 0 || !aiModel}
                        onClick={draftWithAi}
                      >
                        {aiPhase === 'drafting' ? t('pipeline.openspec.prepare.aiBusy') : t('pipeline.openspec.prepare.aiDraft')}
                      </button>
                    )}
                    {aiBusy && (
                      <button type="button" className={styles.secondaryAction} onClick={cancelAiDraft}>
                        {t('pipeline.openspec.prepare.aiCancel')}
                      </button>
                    )}
                  </div>
                  {/* Quien confirma tiene que poder ver que esto lo escribió un
                      modelo y no la aplicación. */}
                  {aiNotice && <p className={styles.aiNotice}>{aiNotice}</p>}
                  {/* Las características del modelo elegido, una por línea.
                      Un párrafo con seis datos adentro no se lee: lo que hay que
                      poder hacer acá es comparar de un vistazo, sobre todo el
                      contexto y si razona —que es lo que decide si va a
                      contestar—. */}
                  {aiChosenModel && (
                    <ul className={styles.aiFacts}>
                      <li>
                        <span>{t('pipeline.openspec.prepare.aiFactState')}</span>
                        <strong>
                          {aiChosenModel.loaded
                            ? t('pipeline.openspec.prepare.aiFactLoaded', { context: aiChosenModel.loadedContextLength ?? '?' })
                            : t('pipeline.openspec.prepare.aiFactOnDisk', { context: 65536 })}
                        </strong>
                      </li>
                      {aiChosenModel.sizeBytes !== null && (
                        <li>
                          <span>{t('pipeline.openspec.prepare.aiFactSize')}</span>
                          <strong>{(aiChosenModel.sizeBytes / 1024 ** 3).toFixed(2)} GiB</strong>
                        </li>
                      )}
                      {aiChosenModel.params && (
                        <li>
                          <span>{t('pipeline.openspec.prepare.aiFactParams')}</span>
                          <strong>{aiChosenModel.params}{aiChosenModel.quantization ? ` · ${aiChosenModel.quantization}` : ''}</strong>
                        </li>
                      )}
                      {aiChosenModel.maxContextLength !== null && (
                        <li>
                          <span>{t('pipeline.openspec.prepare.aiFactMaxContext')}</span>
                          <strong>{aiChosenModel.maxContextLength}</strong>
                        </li>
                      )}
                      {/* Que razone es la explicación del modo de fallo más caro
                          que se midió: gasta el presupuesto pensando y devuelve
                          vacío. Decirlo acá evita que parezca roto. */}
                      {aiChosenModel.reasoningDefault && (
                        <li>
                          <span>{t('pipeline.openspec.prepare.aiFactReasoning')}</span>
                          <strong>
                            {aiChosenModel.reasoningDefault === 'on'
                              ? t('pipeline.openspec.prepare.aiFactReasons')
                              : t('pipeline.openspec.prepare.aiFactNoReasons')}
                          </strong>
                        </li>
                      )}
                    </ul>
                  )}
                  {/* Cada grupo declara de dónde viene lo que contiene. Ninguno
                      entra preseleccionado: sin un cambio de referencia,
                      privilegiar uno produciría un commit distinto según dónde
                      estuviera el foco de la lista lateral. */}
                  {commitScope.groups.map((group) => {
                    const paths = group.entries.map((entry) => entry.path);
                    const allChosen = paths.every((path) => chosenFiles.includes(path));
                    return (
                      <div key={group.key} className={styles.fileGroup}>
                        <p>
                          <strong>{groupLabel(group.origin)} ({group.entries.length})</strong>
                          <button
                            type="button"
                            className={styles.groupToggle}
                            disabled={prepareBusy}
                            onClick={() => toggleMany(paths)}
                          >
                            {allChosen ? <MinusSquare size={12} /> : <PlusSquare size={12} />}
                            {allChosen
                              ? t('pipeline.openspec.prepare.deselectAll')
                              : t('pipeline.openspec.prepare.selectAll')}
                          </button>
                        </p>
                        <p className={styles.groupHelp}>{groupHelp(group)}</p>
                        <ul className={styles.fileList}>
                          {group.entries.map((entry) => (
                            <li key={entry.path}>
                              {/* La etiqueta envuelve la fila entera: con el área
                                  del tamaño de la casilla había que apuntar. */}
                              <label className={styles.fileChoice}>
                                <input
                                  type="checkbox"
                                  checked={chosenFiles.includes(entry.path)}
                                  disabled={prepareBusy}
                                  onChange={(event) => setChosenFiles((current) => (
                                    event.target.checked
                                      ? [...current, entry.path]
                                      : current.filter((file) => file !== entry.path)
                                  ))}
                                />
                                <FileStatusBadge path={entry.path} files={modifiedFiles} />
                                <span>{entry.path}</span>
                                {/* El tipo sólo donde no hay otra información. En
                                    los demás grupos la procedencia ya está dicha
                                    arriba, y repetirlo por fila sería ruido. */}
                                {group.origin.kind === 'unattributed' && (
                                  <em className={styles.fileKind}>
                                    {t(`pipeline.openspec.prepare.kind.${fileKind(entry.path)}`)}
                                  </em>
                                )}
                              </label>
                            </li>
                          ))}
                        </ul>
                      </div>
                    );
                  })}
                </>
              )}
            </section>
          ) : selectedChange ? (
            <>
              {/* El indicador de relectura colgaba de la barra de fases por
                  estar ahí, no porque le perteneciera: informa que la evidencia
                  se está releyendo, que es del encabezado entero. */}
              <header
                className={styles.changeHeader}
                data-revalidating={revalidating || undefined}
                aria-busy={revalidating || undefined}
              >
                <div className={styles.changeTitle}>
                  {/* Volver al estado del repositorio: sin esto, entrar a un
                      cambio era un viaje de ida y la pantalla de entrada sólo se
                      vería al abrir el panel. */}
                  <button type="button" className={styles.backToStart} onClick={() => setSelection(null)}>
                    <ChevronLeft size={12} /> {t('pipeline.openspec.start.back')}
                  </button>
                  <h3>
                    {t('pipeline.openspec.change.active')}: <strong>{selectedChange.changeId}</strong>
                    {/* Junto al título: la antigüedad es lo primero que se
                        quiere saber al mirar un cambio, y hasta ahora obligaba
                        a salir a Git. */}
                    <ChangeTimestampLabel labelKey="pipeline.openspec.stamp.created" stamp={selectedChange.createdAt} />
                  </h3>
                  {/* El recorte visual es de tres líneas; el texto completo queda
                      accesible acá y sin recortar en el panel izquierdo. */}
                  <p title={selectedChange.intent ?? undefined}>
                    <span>{t('pipeline.openspec.intent')}:</span> {selectedChange.intent ?? t('pipeline.openspec.intentUnknown')}
                  </p>
                </div>
              </header>

              {/* Línea propia y arriba de todo lo que se hace con el cambio: es
                  lo que hay que saber antes de seguir trabajándolo, y en la
                  franja de evidencia —que ya muestra la rama— quedaba chico.
                  Sólo para un cambio activo: un archivado es de sólo lectura y
                  ya no tiene rama que le corresponda. */}
              <ChangeBranchNotice branch={currentBranch} changeId={selectedChange.changeId} />

              {/* Las acciones comparten fila con las pestañas: es el punto más
                  alto y estable del panel, así el CTA no se va con el scroll de
                  la lista de tareas. */}
              <div className={styles.tabsRow}>
                <div className={styles.tabs} role="tablist" aria-label={t('pipeline.openspec.tabs.label')}>
                  <button type="button" role="tab" aria-selected={centerTab === 'work'} onClick={() => setCenterTab('work')}>{t('pipeline.openspec.tabs.work')}</button>
                  {/* Sin pestaña de commit: el commit es del repositorio, no del
                      cambio, y su preparación vive en el encabezado. Sostener las
                      dos superficies daría dos caminos a la misma acción con
                      alcances distintos. */}
                  <button type="button" role="tab" aria-selected={centerTab === 'activity'} onClick={() => setCenterTab('activity')}>{t('pipeline.openspec.tabs.activity')}</button>
                  <button type="button" role="tab" aria-selected={centerTab === 'artifacts'} onClick={() => setCenterTab('artifacts')}>{t('pipeline.openspec.tabs.artifacts')}</button>
                </div>
                <div className={styles.actions}>
                  {primaryAction && (
                    <button
                      type="button"
                      className={styles.primaryAction}
                      disabled={fixtureActive && primaryAction.executable}
                      title={t(nextAction.helpKey, nextAction.helpParams)}
                      onClick={() => handleIntent(primaryAction.intent)}
                    >
                      {primaryAction.executable ? <Play size={14} /> : <Activity size={14} />}
                      {t(primaryAction.labelKey, primaryAction.labelParams)}
                    </button>
                  )}
                  {secondaryAction && (
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      disabled={fixtureActive && secondaryAction.executable}
                      onClick={() => handleIntent(secondaryAction.intent)}
                    >
                      {secondaryAction.intent.kind === 'pause-after-task' && <Pause size={14} />}
                      {t(secondaryAction.labelKey, secondaryAction.labelParams)}
                    </button>
                  )}
                  {/* Archivar siempre está a la vista mientras el cambio no esté
                      archivado: si no se puede, se dice por qué en vez de
                      desaparecer. Con tareas pendientes se declara cuántas, para
                      que archivar no sea una decisión tomada a ciegas.

                      Excepción: cuando la acción primaria derivada ya es archivar
                      (validación aprobada y sin tareas pendientes), este botón no
                      se renderiza. Renderizarlo duplicaría el control con el mismo
                      texto y el mismo efecto, lo que la guía prohíbe. En los demás
                      estados sí aporta: con tareas pendientes ofrece archivar
                      declarando cuántas, y con validación no aprobada muestra el
                      motivo por el que no se puede. */}
                  {selectedArchive === null && primaryAction?.intent.kind !== 'start-archive' && (
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      disabled={!archive.available || fixtureActive}
                      title={archive.reasonKey ? t(archive.reasonKey) : t('pipeline.openspec.archive.help')}
                      onClick={() => handleIntent({ kind: 'start-archive', changeId: selectedChange.changeId })}
                    >
                      <FolderOpen size={14} />
                      {archive.pendingTasks > 0
                        ? t('pipeline.openspec.archive.actionPending', { count: archive.pendingTasks })
                        : t('pipeline.openspec.archive.action')}
                    </button>
                  )}
                  <button type="button" className={styles.secondaryAction} disabled={!hasDiffEvidence(snapshot)} onClick={() => handleIntent({ kind: 'view-diff' })}>
                    <Code2 size={14} /> {t('pipeline.openspec.actions.diff')}
                  </button>
                </div>
              </div>

              {/* Pegada a la fila de acciones y FUERA del área con scroll.
                  Adentro, pedir el archivado con la lista de tareas desplazada
                  abría la confirmación fuera de pantalla: había que volver
                  arriba para encontrar lo que uno acababa de pedir. */}
              {archiveRequest && (
                <div className={styles.archiveConfirm}>
                  <div className={styles.archiveConfirmHead}>
                    <strong>{t('pipeline.openspec.archive.confirmTitle')}</strong>
                    <span>{t('pipeline.openspec.archive.confirmHelp')}</span>
                  </div>
                  <pre className={styles.archiveCommand}><code>{archiveRequest.command}</code></pre>
                  {archiveError && (
                    <p className={styles.archiveError} role="alert">
                      {t('pipeline.openspec.archive.failed')} {archiveError}
                    </p>
                  )}
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primaryAction}
                      disabled={archiveBusy || fixtureActive}
                      onClick={confirmArchive}
                    >
                      {archiveBusy
                        ? <Loader2 size={14} className={styles.spin} />
                        : <FolderOpen size={14} />}
                      {archiveBusy
                        ? t('pipeline.openspec.archive.running')
                        : t('pipeline.openspec.archive.confirmAction')}
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryAction}
                      disabled={archiveBusy}
                      onClick={() => { setArchiveRequest(null); setArchiveError(null); }}
                    >
                      {t('pipeline.openspec.archive.cancel')}
                    </button>
                  </div>
                </div>
              )}

              {/* Las dos direcciones escriben en el repositorio con un clic que
                  se puede errar, así que las dos preguntan. El texto cambia
                  porque lo que hacen no es lo mismo: marcar afirma que algo se
                  hizo, desmarcar borra esa constancia y lo deja anotado.

                  El aviso de marcado NO dice "irreversible": sería falso en el
                  momento en que se muestra, porque esta misma pantalla ofrece
                  desmarcar. Dice hasta cuándo se puede deshacer, que es lo
                  cierto y lo que hace falta saber. */}
              {taskToggleRequest && (
                <TaskConfirmToast
                  title={t(taskToggleRequest.completed
                    ? 'pipeline.openspec.task.checkTitle'
                    : 'pipeline.openspec.task.uncheckTitle', { task: taskToggleRequest.label })}
                  description={t(taskToggleRequest.completed
                    ? 'pipeline.openspec.task.checkHelp'
                    : 'pipeline.openspec.task.uncheckHelp')}
                  confirmLabel={t(taskToggleRequest.completed
                    ? 'pipeline.openspec.task.checkConfirm'
                    : 'pipeline.openspec.task.uncheckConfirm')}
                  cancelLabel={t('pipeline.openspec.archive.cancel')}
                  onConfirm={() => {
                    void setTaskChecked(taskToggleRequest.line, taskToggleRequest.text, taskToggleRequest.completed);
                    setTaskToggleRequest(null);
                  }}
                  onCancel={() => setTaskToggleRequest(null)}
                />
              )}
              {taskError && (
                <p className={styles.archiveError} role="alert">{taskError}</p>
              )}

              {centerTab === 'work' ? (
                <div className={styles.workArea}>
                  <p className={styles.nextStepInline}>{t(nextAction.helpKey, nextAction.helpParams)}</p>
                  {/* El lanzador aparece arriba, junto al botón que lo abrió, y no
                      al final de una lista que puede requerir scroll. */}
                  {launchTarget && (
                    <div
                      className={styles.launcherPanel}
                      data-launcher-loading={launcherLoading || undefined}
                    >
                      <PipelineRuntimeLauncher
                        key={`${selectedChange.changeId}:${launchTarget.taskId ?? 'archive'}`}
                        repoPath={repoPath}
                        projection={projection}
                        initialInstruction={launchTarget.instruction}
                        changeId={selectedChange.changeId}
                        taskId={launchTarget.taskId}
                        blockedByFixture={fixtureActive}
                        startLabelKey={launchTarget.taskId ? 'pipeline.launcher.startApply' : 'pipeline.launcher.startArchive'}
                        onStarted={() => setCenterTab('activity')}
                        onDiscoveringChange={setLauncherLoading}
                      />
                    </div>
                  )}
                  <h4>{t('pipeline.openspec.tasks.title')}</h4>
                  <ol className={styles.taskList}>
                    {selectedChange.tasks.map((task) => {
                      const current = task.id === nextTask?.id;
                      return (
                        <li key={task.id} data-completed={task.completed} data-current={current}>
                          {/* El estado deja de ser decorativo: se puede cambiar
                              desde acá. Un cambio archivado no se edita, y el
                              control lo declara en vez de desaparecer. */}
                          <button
                            type="button"
                            className={styles.taskStatus}
                            disabled={fixtureActive}
                            aria-pressed={task.completed}
                            title={t(task.completed
                              ? 'pipeline.openspec.task.uncheck'
                              : 'pipeline.openspec.task.check')}
                            onClick={() => setTaskToggleRequest({
                              line: task.line,
                              text: task.text,
                              label: resolveTaskLabel(task),
                              completed: !task.completed,
                            })}
                          >
                            {task.completed ? <Check size={14} /> : <Circle size={14} />}
                          </button>
                          {/* La numeración se toma del texto: `task.id` es un hash
                              estable, útil como clave pero ilegible como etiqueta. */}
                          <strong>{resolveTaskLabel(task)}</strong>
                          <span>{resolveTaskText(task)}</span>
                          {current && runtimeActive && <em>{t('pipeline.openspec.task.running')}</em>}
                          {current && (
                            <div className={styles.taskDetail}>
                              <dl>
                                <div>
                                  <span className={styles.taskDetailIcon} aria-hidden="true"><User size={13} /></span>
                                  <dt>{t('pipeline.openspec.task.agent')}</dt>
                                  <dd>{changeSession ? runningName : t('pipeline.openspec.task.noSession')}</dd>
                                </div>
                                <div>
                                  <span className={styles.taskDetailIcon} aria-hidden="true"><FileText size={13} /></span>
                                  <dt>{t('pipeline.openspec.task.source')}</dt>
                                  <dd>{task.sourceRef}</dd>
                                </div>
                                <div>
                                  {/* Lo que se mide es `git diff --numstat HEAD` al cerrar la
                                      sesión, no lo que escribió esta tarea. El rótulo dice eso:
                                      atribuir el delta a la tarea exigiría snapshots de
                                      contenido por tarea, que hoy no se capturan. */}
                                  <span className={styles.taskDetailIcon} aria-hidden="true"><GitCompare size={13} /></span>
                                  <dt>{t('pipeline.openspec.task.workingTree')}</dt>
                                  <dd>{gitDelta
                                    ? t('pipeline.openspec.task.workingTreeValue', {
                                      files: gitDelta.files,
                                      additions: gitDelta.additions === 'unknown' ? '—' : gitDelta.additions,
                                      deletions: gitDelta.deletions === 'unknown' ? '—' : gitDelta.deletions,
                                    })
                                    : t('pipeline.openspec.task.notReported')}</dd>
                                </div>
                                <div>
                                  <span className={styles.taskDetailIcon} aria-hidden="true"><Activity size={13} /></span>
                                  <dt>{t('pipeline.openspec.task.lastActivity')}</dt>
                                  <dd>{lastObservedActivity ?? t('pipeline.openspec.task.notReported')}</dd>
                                </div>
                              </dl>
                            </div>
                          )}
                        </li>
                      );
                    })}
                    {selectedChange.tasks.length === 0 && <li className={styles.taskEmpty}>{t('pipeline.openspec.tasks.empty')}</li>}
                  </ol>
                </div>
              ) : centerTab === 'artifacts' ? (
                /* Los artefactos del cambio seleccionado tienen su propia pestaña,
                   al lado de Trabajo y Actividad: antes colgaban al final del panel
                   de Trabajo, lo que hacía la lectura incómoda. */
                <div className={styles.evidencePanel}>
                  <PipelineDetails
                    snapshot={snapshot}
                    selectedChange={selectedChange}
                    tab={evidenceTab}
                    onTabChange={setEvidenceTab}
                  />
                </div>
              ) : (
                <div className={styles.fullActivity}>
                  <ActivityFeed
                    entries={visibleActivity}
                    reasoningAvailable={selectedReasoningAvailable}
                    runtimeAttached={selectedSession !== null || projection !== null}
                    agentRuntimes={Object.fromEntries(snapshot.agents.map((agent) => [agent.agentId, agent.runtime]))}
                  />
                </div>
              )}
            </>
          ) : selectedArchive ? (
            <section className={styles.completedSummary}>
              {/* La identidad del cambio queda fija arriba mientras se recorren
                  sus artefactos: al llegar el contenido, el resumen se iba de
                  vista con el scroll y se perdía de qué cambio se estaba
                  mirando. */}
              <div className={styles.completedHeader}>
                <CheckCircle2 size={38} />
                <p>{t('pipeline.openspec.change.completed')}</p>
                <h3>{selectedArchive.changeId}</h3>
                {/* Creación y archivado, ambas con hora: con la fecha sola no se
                    podía saber cuánto duró el trabajo.

                    Acá vivían tres filas que se retiraron. Dos eran texto
                    constante —"Especificaciones principales" y "Actividad y
                    evidencia" rendían siempre "Conservadas", sin consultar el
                    cambio— y la tercera mostraba una ruta cuya fecha ya estaba
                    impresa arriba. Una fila que siempre dice lo mismo enseña a
                    saltear el bloque entero, incluido lo que sí varía. */}
                <div className={styles.completedStamps}>
                  <ChangeTimestampLabel labelKey="pipeline.openspec.stamp.created" stamp={selectedArchive.createdAt} />
                  <ChangeTimestampLabel labelKey="pipeline.openspec.stamp.archived" stamp={selectedArchive.archivedOn} />
                  {!selectedArchive.archivedOn && (
                    <span className={styles.changeStamp}>
                      <span>{t('pipeline.openspec.stamp.archived')}</span> {selectedArchive.archivedAt ?? t('pipeline.openspec.dateUnknown')}
                    </span>
                  )}
                </div>
              </div>
              <PipelineNextStepGuide action={nextAction} onAct={handleIntent} executionBlocked={fixtureActive} dismiss={flowMode ? { labelKey: 'pipeline.newChange.close', onDismiss: dismissFlow } : undefined} />
              {/* Lo archivado es el registro de lo que se hizo, incluida la
                  firma humana. Revisarlo no debería obligar a salir de la
                  aplicación ni a leer el diff del commit de archivado. */}
              {/* La región existe desde el primer render, aunque el contenido
                  todavía no haya llegado: al seleccionar un archivado hay una
                  relectura de por medio, y sin reservar el espacio la vista
                  saltaba de una ficha corta a una pantalla entera. */}
              <div className={styles.archivedArtifacts} data-pending={!selectedArchive.artifacts || undefined}>
                {!selectedArchive.artifacts ? (
                  <p className={styles.archivedPending}>{t('pipeline.revalidating')}</p>
                ) : (
                  <PipelineDetails
                    snapshot={snapshot}
                    selectedChange={{
                      changeId: selectedArchive.changeId,
                      intent: null,
                      tasks: [],
                      proposalExists: selectedArchive.artifacts.proposal !== null,
                      designExists: selectedArchive.artifacts.design !== null,
                      specsCount: selectedArchive.artifacts.specs.length,
                      validation: 'unknown',
                      artifacts: selectedArchive.artifacts,
                    }}
                    tab={evidenceTab}
                    onTabChange={setEvidenceTab}
                  />
                )}
              </div>
              {flowMode && (
                <>
                  {/* Con un cambio abierto no hay pantalla de entrada que lo
                      haya declarado, y empezar otro cambio desde acá arranca
                      igual de a ciegas. El aviso acompaña al formulario, no a
                      una pantalla: lo que falta se sabe antes de escribir. */}
                  <OpenSpecReadiness
                    present={openSpecPresent}
                    tools={openSpecTools}
                    onShowDetail={rightOpen ? () => setRailTab('tools') : undefined}
                  />
                  <PipelineNewChangeFlow
                    repoPath={repoPath}
                    projection={projection}
                    blockedByFixture={fixtureActive}
                    onStarted={() => setCenterTab('activity')}
                    currentBranch={currentBranch}
                    divergence={snapshot.branchDivergence}
                    workingTreeClean={workingTreeClean}
                    onRefresh={onRefresh}
                  />
                </>
              )}
            </section>
          ) : (
            /* Pantalla de entrada del repositorio. Absorbe la vieja
               `noActiveChange`, que sólo aparecía sin cambios ni archivados:
               tener dos pantallas de repositorio según cuántos cambios haya daba
               dos lecturas del mismo estado. */
            <section className={styles.startScreen} aria-label={t('pipeline.openspec.start.title')}>
              <h3>{t('pipeline.openspec.start.title')}</h3>

              {/* La guía va primero, sin excepción de estado: es la acción que
                  esta pantalla existe para ofrecer, y al final quedaba empujada
                  fuera de vista por la lista de cambios. Una posición que cambia
                  según el contenido obliga a buscarla. */}
              {/* Va antes de la guía: si al repositorio le falta algo para que
                  el método funcione, eso se sabe antes de elegir por dónde
                  seguir, no después de haber empezado. */}
              {/* La salida sólo se ofrece si hay a dónde llevar: con el rail
                  cerrado, el botón abriría una solapa que nadie ve. */}
              <OpenSpecReadiness
                present={openSpecPresent}
                tools={openSpecTools}
                onShowDetail={rightOpen ? () => setRailTab('tools') : undefined}
              />

              <PipelineNextStepGuide action={nextAction} onAct={handleIntent} executionBlocked={fixtureActive} dismiss={flowMode ? { labelKey: 'pipeline.newChange.close', onDismiss: dismissFlow } : undefined} />
              {flowMode && (
                <PipelineNewChangeFlow
                  repoPath={repoPath}
                  projection={projection}
                  blockedByFixture={fixtureActive}
                  onStarted={() => setCenterTab('activity')}
                  currentBranch={currentBranch}
                  divergence={snapshot.branchDivergence}
                  workingTreeClean={workingTreeClean}
                  onRefresh={onRefresh}
                />
              )}

              <div className={styles.startBlock}>
                <h4>{t('pipeline.openspec.start.inProgress')} <span>{activeChanges.length}</span></h4>
                {activeChanges.length === 0 ? (
                  <p className={styles.startNote}>{t('pipeline.openspec.start.noActive')}</p>
                ) : (
                  <ul className={styles.startList}>
                    {startChanges.map(({ change, progress }) => (
                      <li key={change.changeId} data-branch={change.changeId === branchChangeId || undefined}>
                        <div className={styles.startItemHead}>
                          <strong>{change.changeId}</strong>
                          {/* La rama se señala, no navega: gastarla en saltar
                              adentro la volvía invisible. */}
                          {change.changeId === branchChangeId && (
                            <em className={styles.branchPill}>{t('pipeline.openspec.start.branchMatch')}</em>
                          )}
                          <button
                            type="button"
                            className={styles.secondaryAction}
                            onClick={() => selectChange(change.changeId)}
                          >
                            {t('pipeline.openspec.start.enter')}
                          </button>
                        </div>
                        <p title={change.intent ?? undefined}>{change.intent ?? t('pipeline.openspec.intentUnknown')}</p>
                        <div className={styles.startProgress}>
                          <span>
                            {progress.total === 0
                              ? t('pipeline.openspec.start.noTasks')
                              : t('pipeline.openspec.start.tasks', { done: progress.completed, total: progress.total })}
                          </span>
                          {progress.total > 0 && (
                            <span className={styles.startBar} aria-hidden="true">
                              <span style={{ width: `${progress.percent}%` }} />
                            </span>
                          )}
                          {/* Saber que van cinco de seis no dice cuál es la
                              sexta, que es con lo que se decide. Plegado por
                              defecto: con cuatro cambios de veintiocho tareas,
                              esta pantalla sería una lista de tareas. */}
                          {pendingOf(change).length > 0 && (
                            <button
                              type="button"
                              className={styles.startPendingToggle}
                              aria-expanded={expandedStart[change.changeId] ?? false}
                              onClick={() => setExpandedStart((current) => ({
                                ...current,
                                [change.changeId]: !(current[change.changeId] ?? false),
                              }))}
                            >
                              <ChevronDown size={12} />
                              {tCount('pipeline.openspec.start.pending', pendingOf(change).length)}
                            </button>
                          )}
                        </div>
                        {(expandedStart[change.changeId] ?? false) && (
                          /* Sólo lo pendiente: el avance ya está en la barra y
                             en el conteo, y lo que falta es lo que sirve. */
                          <ul className={styles.startPending}>
                            {pendingOf(change).map((task) => (
                              <li key={task.id}><Circle size={9} /> {task.text}</li>
                            ))}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Lo archivado no se cuenta como un cero más: un cero de
                  archivados es el estado normal antes del primer archivado, y un
                  cero de cambios activos significa lo contrario. Presentarlos
                  igual hacía leer como vacío un repositorio casi terminado. */}
              <div className={styles.startBlock}>
                <h4>{t('pipeline.openspec.start.closed')}</h4>
                {archivedChanges.length === 0 ? (
                  <p className={styles.startNote}>{t('pipeline.openspec.start.neverArchived')}</p>
                ) : (
                  <>
                    {/* La barra lateral corta en los ocho más recientes, que es
                        acceso rápido. El panorama del repositorio vive acá, así
                        que acá se puede llegar a todos. */}
                    <button
                      type="button"
                      className={styles.startPendingToggle}
                      aria-expanded={archivedOpen}
                      onClick={() => setArchivedOpen((open) => !open)}
                    >
                      <ChevronDown size={12} />
                      {tCount('pipeline.openspec.start.archivedCount', archivedChanges.length)}
                    </button>
                    {archivedOpen && (
                      <ul className={styles.startArchived}>
                        {archivedChanges.map((change) => (
                          <li key={`${change.archivedAt}-${change.changeId}`}>
                            <button type="button" onClick={() => selectChange(change.changeId)}>
                              <CheckCircle2 size={11} />
                              <strong>{change.changeId}</strong>
                              <span>{change.archivedAt ?? t('pipeline.openspec.dateUnknown')}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
                <p className={styles.startNote}>
                  {specifications.length === 0
                    ? t('pipeline.openspec.start.specsPending')
                    : t('pipeline.openspec.start.specificationsCount', { count: specifications.length })}
                </p>
              </div>

            </section>
          )}

          <footer className={styles.evidenceStrip}>
            <div data-status={selectedChange?.validation ?? 'unknown'}><ShieldCheck size={18} /><span><strong>{t('pipeline.openspec.evidence.validation')}</strong><em>{selectedChange ? t(`pipeline.openspec.validation.${selectedChange.validation}`) : t('pipeline.openspec.notApplicable')}</em></span></div>
            <div><GitBranch size={18} /><span><strong>{t('pipeline.openspec.evidence.branch')}</strong><em>{currentBranch || t('pipeline.openspec.repo.branchUnknown')}</em></span></div>
            <div data-status={workingTreeClean ? 'passed' : 'failed'}><CheckCircle2 size={18} /><span><strong>{t('pipeline.openspec.evidence.workingTree')}</strong><em>{workingTreeClean ? t('pipeline.openspec.repo.cleanShort') : t('pipeline.openspec.repo.changedShort')}</em></span></div>
          </footer>
        </main>

        {rightOpen && prepareOpen && (
          /* Mientras se prepara, la actividad de un runtime no interviene en la
             decisión. Lo que sí falta es la otra mitad del estado: el panel
             filtra los ya preparados para que el conteo baje, y eso los deja
             invisibles. Acá se ven. Mostrar los NO preparados sería repetir lo
             que el panel ya lista agrupado. */
          <aside className={styles.activityRail} aria-label={t('pipeline.openspec.prepare.stagedTitle')}>
            <div className={styles.resizeHandleRight} role="separator" aria-orientation="vertical" title={t('pipeline.openspec.resize.right')} onMouseDown={onResizeRight} />
            <h3><GitBranch size={14} /> {t('pipeline.openspec.prepare.stagedTitle')}</h3>
            {stagedFiles.length === 0 ? (
              <p className={styles.railEmpty}>{t('pipeline.openspec.prepare.stagedEmpty')}</p>
            ) : (
              /* Vista, no superficie de acción: quitar del stage ya vive en el
                 flujo de commit, y duplicarlo acá es lo que la guía prohíbe. */
              <ul className={styles.stagedList}>
                {stagedFiles.map((file) => (
                  <li key={file.path}>
                    <FileStatusBadge path={file.path} files={modifiedFiles} />
                    <span>{file.path}</span>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        )}

        {rightOpen && !prepareOpen && (
          <aside className={styles.activityRail} aria-label={t('pipeline.openspec.activity.title')}>
            <div className={styles.resizeHandleRight} role="separator" aria-orientation="vertical" title={t('pipeline.openspec.resize.right')} onMouseDown={onResizeRight} />
            {/* Dos solapas y no dos bloques apilados: el rail es angosto y alto,
                y lo que se consulta —el estado de las herramientas— no compite
                por espacio con lo que se mira mientras corre una sesión. */}
            <div className={styles.railTabs} role="tablist" aria-label={t('pipeline.openspec.rail.label')}>
              <button type="button" role="tab" aria-selected={railTab === 'activity'} onClick={() => setRailTab('activity')}>
                <Activity size={13} aria-hidden="true" /> {t('pipeline.openspec.activity.title')}
              </button>
              <button type="button" role="tab" aria-selected={railTab === 'tools'} onClick={() => setRailTab('tools')}>
                <Wrench size={13} aria-hidden="true" /> {t('pipeline.openspec.rail.tools')}
                {/* La cuenta va en la solapa: sin ella, saber que falta algo
                    exigiría abrirla, que es lo que un aviso no puede pedir. */}
                {pendingToolCount > 0 && <em className={styles.railTabBadge}>{pendingToolCount}</em>}
              </button>
            </div>

            {railTab === 'tools' ? (
              <OpenSpecToolList
                present={openSpecPresent}
                tools={openSpecTools}
                busy={initBusy}
                error={initError}
                needsTool={initNeedsTool}
                onInitialize={() => runOpenSpecInit()}
                onInitializeWith={(toolIds) => runOpenSpecInit(toolIds)}
              />
            ) : (
            <>
            {/* Sin `h3` con el mismo texto: la solapa activa ya dice qué se está
                viendo, y repetirlo debajo es el rótulo duplicado que la guía de
                este panel prohíbe. */}
            {/* Sin cambio abierto la columna cae a lo último del repositorio, que
                puede ser de otro día y de otro trabajo. Con un cambio abierto no
                hace falta decirlo: el panel entero ya declara de cuál es. */}
            {openChangeId === null && (
              <p className={styles.railScope}>{t('pipeline.openspec.activity.repoScope')}</p>
            )}
            <section className={styles.liveActivity}>
              <header>
                <span className={styles.sessionIdentity}>
                  <strong>{selectedSession || visibleActivity.length > 0 ? runningName : t('pipeline.openspec.activity.noSession')}</strong>
                  <span className={styles.liveDot} data-active={selectedSession?.active || undefined} />
                  <em>{t(`pipeline.openspec.activity.status.${sessionStatusKey}`)}</em>
                  {/* Cuándo corrió, siempre y no sólo en las opciones del
                      selector: el selector no se renderiza con una sola sesión,
                      que es justo el caso donde falta. Sin esta marca, una
                      sesión de días atrás se lee como actividad en curso. */}
                  {selectedSession && (
                    <em className={styles.sessionRanAt}>
                      {t('pipeline.openspec.activity.ranAt', { at: formatSessionMoment(selectedSession.startedAt) })}
                    </em>
                  )}
                </span>
                {runtimeSessions.length > 1 && (
                  <select
                    className={styles.sessionSelect}
                    aria-label={t('pipeline.openspec.activity.sessionPicker')}
                    value={effectiveSessionId ?? ''}
                    onChange={(event) => setSelectedSessionId(event.target.value)}
                  >
                    {runtimeSessions.map((session) => (
                      <option key={session.sessionId} value={session.sessionId}>{formatSessionOption(session)}</option>
                    ))}
                  </select>
                )}
              </header>
              {selectedSession && (
                <p className={styles.sessionContext}>
                  {[selectedSession.changeId, selectedSession.taskId].filter(Boolean).join(' · ') || t('pipeline.openspec.activity.noChange')}
                </p>
              )}
              {activityGroups.length === 0 ? (
                /* Un cambio sin sesiones lo declara: es un estado normal —recién
                   creado, o trabajado desde afuera de la aplicación— y mostrar
                   la sesión de otro para no dejar el espacio vacío es lo que
                   producía la lectura equivocada. */
                <p className={styles.railEmpty}>
                  {selectedSession
                    ? t('pipeline.activity.empty')
                    : openChangeId !== null
                      ? t('pipeline.openspec.activity.noneForChange')
                      : t('pipeline.activity.noRuntime')}
                </p>
              ) : (
                <ol>
                  {activityGroups.slice(-12).map((entry) => {
                    const Icon = ACTIVITY_ICONS[entry.channel];
                    const localized = ['session.started', 'session.completed', 'session.failed', 'session.interrupted'].includes(entry.text);
                    const gitEvidence = /^git\.changed files=(\d+) additions=(\d+|unknown) deletions=(\d+|unknown)$/.exec(entry.text);
                    const validationEvidence = /^openspec\.validation\.(passed|failed|unknown)$/.exec(entry.text);
                    const displayText = gitEvidence
                      ? t('pipeline.openspec.activity.event.gitChanged', {
                        files: gitEvidence[1],
                        additions: gitEvidence[2] === 'unknown' ? '—' : gitEvidence[2],
                        deletions: gitEvidence[3] === 'unknown' ? '—' : gitEvidence[3],
                      })
                      : validationEvidence
                        ? t(`pipeline.openspec.activity.event.validation.${validationEvidence[1]}`)
                        : localized
                          ? t(`pipeline.openspec.activity.event.${entry.text}`)
                          : entry.text;
                    return (
                      <li key={entry.key} data-channel={entry.channel}>
                        <time>{formatTime(entry.at)}</time>
                        <span className={styles.activityIcon}><Icon size={12} /></span>
                        <div><strong>{t(`pipeline.channel.${entry.channel}`)}</strong><p>{displayText}</p></div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </section>
            <section
              className={styles.attention}
              data-needed={snapshot.decisions.length > 0}
              ref={attentionRef}
              tabIndex={-1}
              aria-label={t('pipeline.openspec.attention.title')}
            >
              <h4>{t('pipeline.openspec.attention.title')}</h4>
              <DecisionInbox decisions={snapshot.decisions} onRespondDecision={onRespondDecision} />
            </section>
            </>
            )}
            <footer className={styles.railMeta}>
              <span>{totalRequirements} {t('pipeline.openspec.summary.requirements')}</span>
              <span>{openSpec?.reports.length ?? 0} {t('pipeline.openspec.summary.reports')}</span>
            </footer>
          </aside>
        )}
      </div>
    </div>
  );
}
