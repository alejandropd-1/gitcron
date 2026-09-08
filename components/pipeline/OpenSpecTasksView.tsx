'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Copy,
  Eye,
  FileCode2,
  FileText,
  GitCompare,
  GripVertical,
  ListOrdered,
  Loader2,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  User,
  X,
} from 'lucide-react';
import { TaskContextMenu } from '@/components/ContextMenus';
import { useT } from '@/hooks/use-translation';
import { findMalformedTaskLines, type MalformedTaskLine } from '@/lib/malformed-tasks';
import { resolveTaskErrorMessage, type TaskErrorMessage } from '@/lib/task-errors';
import type { OpenSpecChangeEvidence, TaskEvidence } from '@/types/pipeline';
import styles from './OpenSpecDashboard.module.css';
import { SafeMarkdown } from './SafeMarkdown';
import { TaskConfirmToast } from './TaskConfirmToast';

export interface OpenSpecTasksViewProps {
  repoPath: string;
  selectedChange: OpenSpecChangeEvidence;
  fixtureActive?: boolean;
  runtimeActive?: boolean;
  runningName?: string;
  nextTask?: TaskEvidence | null;
  changeSession?: any;
  gitDelta?: any;
  lastObservedActivity?: string | null;
  onRefresh?: () => void;
  setSuccess?: (msg: string) => void;
  resolveTaskLabel?: (task: TaskEvidence) => string;
  resolveTaskText?: (task: TaskEvidence) => string;
}

export type ViewMode = 'list' | 'markdown';
export type MarkdownMode = 'formatted' | 'raw';

export type TaskBusyOp = 'add' | 'edit' | 'move' | 'delete' | 'check';

export interface TaskBusyState {
  op: TaskBusyOp;
  taskId?: string;
}

type PendingConfirm =
  | { type: 'uncheck'; task: TaskEvidence }
  | { type: 'delete'; task: TaskEvidence }
  | { type: 'switch-dirty'; targetMode: ViewMode; targetMarkdownMode?: MarkdownMode };

const MARKDOWN_VIEW_PREF_KEY = 'gitcron:openspec:tasks-markdown-view-mode';

export function OpenSpecTasksView({
  repoPath,
  selectedChange,
  fixtureActive = false,
  runtimeActive = false,
  runningName,
  nextTask,
  changeSession,
  gitDelta,
  lastObservedActivity,
  onRefresh,
  setSuccess,
  resolveTaskLabel: customResolveLabel,
  resolveTaskText: customResolveText,
}: OpenSpecTasksViewProps) {
  const t = useT();

  const resolveLabel = (task: TaskEvidence): string => {
    if (customResolveLabel) return customResolveLabel(task);
    const match = task.text.match(/^(\d+[a-z]?(?:\.\d+[a-z]?)*\.?\s+)/i);
    return match ? match[1].trim() : task.id;
  };

  const resolveText = (task: TaskEvidence): string => {
    if (customResolveText) return customResolveText(task);
    const match = task.text.match(/^(\d+[a-z]?(?:\.\d+[a-z]?)*\.?\s+)(.*)$/i);
    return match ? match[2].trim() : task.text;
  };

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [markdownMode, setMarkdownMode] = useState<MarkdownMode>(() => {
    try {
      const saved = typeof localStorage !== 'undefined' ? localStorage.getItem(MARKDOWN_VIEW_PREF_KEY) : null;
      return saved === 'raw' ? 'raw' : 'formatted';
    } catch {
      return 'formatted';
    }
  });
  const [tasks, setTasks] = useState<TaskEvidence[]>(selectedChange.tasks ?? []);
  const [taskError, setTaskError] = useState<TaskErrorMessage | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // Estado unificado de ocupado (Bloque B)
  const [busyState, setBusyState] = useState<TaskBusyState | null>(null);
  const isTaskBusy = (op?: TaskBusyOp, taskId?: string): boolean => {
    if (!busyState) return false;
    if (op && busyState.op !== op) return false;
    if (taskId && busyState.taskId !== taskId) return false;
    return true;
  };
  const isAnyBusy = busyState !== null;

  // Estados de adición
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');

  // Estados de edición inline con textarea auto-expandible (Bloque A)
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Estados de arrastre (Drag & Drop)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);

  // Menú contextual de fila (Bloque C)
  const [openMenuTaskId, setOpenMenuTaskId] = useState<string | null>(null);
  const [menuCoords, setMenuCoords] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Estados del editor Markdown (Tareas 8.2 y 8.12)
  const diskRawTasks = selectedChange.artifacts?.tasks ?? '';
  const [rawText, setRawText] = useState<string>(diskRawTasks);
  const [isRawDirty, setIsRawDirty] = useState(false);
  const [isRawSaving, setIsRawSaving] = useState(false);
  const [copiedMarkdown, setCopiedMarkdown] = useState(false);

  // Sincronizar tareas de disco cuando cambia selectedChange.tasks y no hay arrastre/movimiento en curso
  const [prevTasksProp, setPrevTasksProp] = useState(selectedChange.tasks);
  if (selectedChange.tasks !== prevTasksProp) {
    setPrevTasksProp(selectedChange.tasks);
    if (!isTaskBusy('move')) {
      setTasks(selectedChange.tasks ?? []);
    }
  }

  // Sincronizar texto crudo si el disco cambia y no tenemos cambios sin guardar
  const [prevArtifactTasks, setPrevArtifactTasks] = useState(selectedChange.artifacts?.tasks);
  if (selectedChange.artifacts?.tasks !== prevArtifactTasks) {
    setPrevArtifactTasks(selectedChange.artifacts?.tasks);
    if (!isRawDirty) {
      setRawText(selectedChange.artifacts?.tasks ?? '');
    }
  }

  // Auto-ajustar alto de textarea al comenzar edición
  useEffect(() => {
    if (editingTaskId && editTextareaRef.current) {
      const el = editTextareaRef.current;
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
      el.focus();
      el.selectionStart = el.value.length;
      el.selectionEnd = el.value.length;
    }
  }, [editingTaskId]);

  // Detección de tareas mal formadas (Tareas 8.3 y 8.4)
  const malformedLines: MalformedTaskLine[] = useMemo(() => {
    const source = (viewMode === 'markdown' && markdownMode === 'raw') ? rawText : diskRawTasks;
    return findMalformedTaskLines(source);
  }, [viewMode, markdownMode, rawText, diskRawTasks]);

  // Copiar markdown (Bloque D)
  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(rawText);
      setCopiedMarkdown(true);
      setTimeout(() => setCopiedMarkdown(false), 2000);
    } catch {
      // noop
    }
  };

  // Control de cambio de solapa principal (Ajuste 3)
  const handleRequestSwitchMode = (next: ViewMode) => {
    if (next === viewMode) return;
    if (viewMode === 'markdown' && markdownMode === 'raw' && isRawDirty && next === 'list') {
      setPendingConfirm({ type: 'switch-dirty', targetMode: next });
      return;
    }
    if (next === 'markdown') {
      try {
        localStorage.setItem(MARKDOWN_VIEW_PREF_KEY, markdownMode);
      } catch {
        // noop
      }
    }
    setViewMode(next);
  };

  // Conmutación entre formato y editor crudo dentro de la solapa Markdown
  const handleSwitchMarkdownMode = (next: MarkdownMode) => {
    if (next === markdownMode) return;
    if (markdownMode === 'raw' && isRawDirty && next === 'formatted') {
      setPendingConfirm({ type: 'switch-dirty', targetMode: 'markdown', targetMarkdownMode: 'formatted' });
      return;
    }
    try {
      localStorage.setItem(MARKDOWN_VIEW_PREF_KEY, next);
    } catch {
      // noop
    }
    setMarkdownMode(next);
  };

  const handleToggleMarkdownMode = () => {
    handleSwitchMarkdownMode(markdownMode === 'formatted' ? 'raw' : 'formatted');
  };

  // --- Operaciones de lista ---

  /** Cambiar estado de casilla (Tarea 8.1 y Bloque B) */
  const handleToggleTask = (task: TaskEvidence) => {
    if (fixtureActive || isAnyBusy) return;
    setTaskError(null);

    if (task.completed) {
      setPendingConfirm({ type: 'uncheck', task });
      return;
    }

    void executeSetChecked(task, true);
  };

  const executeSetChecked = async (task: TaskEvidence, completed: boolean) => {
    if (isAnyBusy) return;
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineSetTaskChecked) return;

    setBusyState({ op: 'check', taskId: task.id });
    setTaskError(null);
    try {
      const res = (await api.pipelineSetTaskChecked(
        repoPath,
        selectedChange.changeId,
        task.line,
        task.text,
        completed,
        'persona',
      )) as { success?: boolean; error?: string };

      if (res?.success) {
        onRefresh?.();
      } else {
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setBusyState(null);
    }
  };

  /** Agregar tarea (Tarea 8.1 y Bloque B) */
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTaskText.trim();
    if (!clean || isAnyBusy || fixtureActive) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineAddTask) return;

    setBusyState({ op: 'add' });
    setTaskError(null);
    try {
      const res = (await api.pipelineAddTask(
        repoPath,
        selectedChange.changeId,
        clean,
        { position: 'end' },
        'persona',
      )) as { success?: boolean; error?: string };

      if (res?.success) {
        setNewTaskText('');
        setIsAddingTask(false);
        setSuccess?.(t('pipeline.openspec.task.addSubmit'));
        onRefresh?.();
      } else {
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setBusyState(null);
    }
  };

  /** Editar texto de tarea (Tarea 8.1 y Bloques A y B) */
  const handleStartEdit = (task: TaskEvidence) => {
    setEditingTaskId(task.id);
    setEditText(resolveText(task));
    setTaskError(null);
  };

  const handleSaveEdit = async (task: TaskEvidence) => {
    const clean = editText.trim();
    if (!clean || isAnyBusy || fixtureActive) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineEditTask) return;

    setBusyState({ op: 'edit', taskId: task.id });
    setTaskError(null);
    try {
      const res = (await api.pipelineEditTask(
        repoPath,
        selectedChange.changeId,
        task.line,
        task.text,
        clean,
        'persona',
      )) as { success?: boolean; error?: string };

      if (res?.success) {
        setEditingTaskId(null);
        setEditText('');
        onRefresh?.();
      } else {
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setBusyState(null);
    }
  };

  /** Eliminar tarea (Tarea 8.1 y Bloque B - exige confirmación y bloquea concurrencia) */
  const handleDeleteTask = (task: TaskEvidence) => {
    if (fixtureActive || isAnyBusy) return;
    setPendingConfirm({ type: 'delete', task });
  };

  const executeDeleteTask = async (task: TaskEvidence) => {
    if (isAnyBusy) return;
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineRemoveTask) return;

    setBusyState({ op: 'delete', taskId: task.id });
    setTaskError(null);
    try {
      const res = (await api.pipelineRemoveTask(
        repoPath,
        selectedChange.changeId,
        task.line,
        task.text,
        'persona',
      )) as { success?: boolean; error?: string };

      if (res?.success) {
        onRefresh?.();
      } else {
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setBusyState(null);
    }
  };

  /** Mover tarea: por Drag & Drop o teclado (Tarea 8.8 y Bloque B) */
  const executeMoveTask = async (sourceTask: TaskEvidence, targetTask: TaskEvidence) => {
    if (isAnyBusy || sourceTask.id === targetTask.id) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineMoveTask) return;

    const previousTasks = [...tasks];
    const sourceIdx = previousTasks.findIndex((t) => t.id === sourceTask.id);
    const targetIdx = previousTasks.findIndex((t) => t.id === targetTask.id);
    if (sourceIdx < 0 || targetIdx < 0) return;

    const updated = [...previousTasks];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);

    setBusyState({ op: 'move', taskId: sourceTask.id });
    setTasks(updated);
    setTaskError(null);

    try {
      const res = (await api.pipelineMoveTask(
        repoPath,
        selectedChange.changeId,
        sourceTask.line,
        targetTask.line,
        sourceTask.text,
        'persona',
      )) as { success?: boolean; error?: string };

      if (res?.success) {
        onRefresh?.();
      } else {
        setTasks(previousTasks);
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTasks(previousTasks);
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setBusyState(null);
    }
  };

  const handleKeyboardMove = (task: TaskEvidence, direction: 'up' | 'down') => {
    if (isAnyBusy) return;
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;
    void executeMoveTask(task, tasks[targetIdx]);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: TaskEvidence) => {
    if (isAnyBusy) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(task.id);
  };

  const handleDragOver = (e: React.DragEvent, task: TaskEvidence) => {
    if (isAnyBusy) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverTaskId !== task.id) {
      setDragOverTaskId(task.id);
    }
  };

  const handleDrop = (e: React.DragEvent, targetTask: TaskEvidence) => {
    e.preventDefault();
    const sourceId = e.dataTransfer.getData('text/plain') || draggingTaskId;
    setDraggingTaskId(null);
    setDragOverTaskId(null);
    if (isAnyBusy || !sourceId) return;
    const sourceTask = tasks.find((t) => t.id === sourceId);
    if (sourceTask) {
      void executeMoveTask(sourceTask, targetTask);
    }
  };

  const handleDragEnd = () => {
    setDraggingTaskId(null);
    setDragOverTaskId(null);
  };

  // --- Operaciones de editor Markdown crudo (Tarea 8.2) ---

  const handleSaveRawContent = async (): Promise<boolean> => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineWriteArtifact || isRawSaving || isAnyBusy || fixtureActive) return false;

    setIsRawSaving(true);
    setTaskError(null);
    try {
      const res = await api.pipelineWriteArtifact(
        repoPath,
        selectedChange.changeId,
        'tasks',
        rawText,
        { overwrite: true, actor: 'persona' },
      );

      if (res?.success) {
        setIsRawDirty(false);
        setSuccess?.(t('pipeline.openspec.task.rawSaved'));
        onRefresh?.();
        return true;
      }
      setTaskError(resolveTaskErrorMessage(res?.error, t));
      return false;
    } catch (err) {
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
      return false;
    } finally {
      setIsRawSaving(false);
    }
  };

  const completedCount = tasks.filter((task) => task.completed).length;

  return (
    <div className={styles.centerBlock}>
      {/* Barra superior de tareas: solapas a la izquierda, conteo y agregar a la derecha (Bloque F) */}
      <div className={styles.tasksHeader}>
        <div className={styles.tasksHeaderControls}>
          <div className={styles.viewModeToggle} role="group" aria-label={t('pipeline.openspec.tasks.title')}>
            <button
              type="button"
              aria-pressed={viewMode === 'list'}
              data-active={viewMode === 'list'}
              className={styles.viewModeBtn}
              onClick={() => handleRequestSwitchMode('list')}
            >
              <ListOrdered size={13} />
              <span>{t('pipeline.openspec.task.viewList')}</span>
            </button>
            <button
              type="button"
              aria-pressed={viewMode === 'markdown'}
              data-active={viewMode === 'markdown'}
              className={styles.viewModeBtn}
              onClick={() => handleRequestSwitchMode('markdown')}
            >
              <FileText size={13} />
              <span>Markdown</span>
            </button>
          </div>
        </div>

        <div className={styles.tasksHeaderInfo}>
          <span className={styles.tasksCountBadge}>
            {completedCount} / {tasks.length} {t('pipeline.openspec.task.progress')}
          </span>
          {viewMode === 'list' && (
            <button
              type="button"
              className={styles.addTaskToggleBtn}
              onClick={() => setIsAddingTask((prev) => !prev)}
              disabled={fixtureActive || isAnyBusy}
            >
              <Plus size={13} />
              <span>{t('pipeline.openspec.task.add')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Aviso no bloqueante de tareas mal formadas (Tarea 8.4) */}
      {malformedLines.length > 0 && (
        <div className={styles.malformedWarning} role="status">
          <div className={styles.malformedHeader}>
            <AlertTriangle size={15} />
            <span>{t('pipeline.openspec.task.malformedTitle')}</span>
          </div>
          <p className={styles.malformedDesc}>{t('pipeline.openspec.task.malformedDesc')}</p>
          <ul className={styles.malformedList}>
            {malformedLines.map((m) => (
              <li key={m.line} className={styles.malformedItem}>
                {t('pipeline.openspec.task.malformedLine', {
                  line: m.line,
                  raw: m.raw.trim(),
                  reason: m.reason,
                })}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Cartel de error con opción de recargar si es mismatch */}
      {taskError && (
        <div className={styles.taskErrorAlert} role="alert">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <AlertCircle size={15} className="shrink-0" />
            <span>{taskError.message}</span>
          </div>
          {taskError.isMismatch && (
            <button
              type="button"
              className={styles.secondaryAction}
              onClick={() => {
                setTaskError(null);
                onRefresh?.();
              }}
            >
              <RefreshCw size={13} />
              <span>{t('pipeline.openspec.task.reload')}</span>
            </button>
          )}
        </div>
      )}

      {/* VISTA 1: Lista interactiva de tareas */}
      {viewMode === 'list' && (
        <>
          {/* Formulario para agregar tarea */}
          {isAddingTask && (
            <form onSubmit={handleAddTask} className={styles.taskAddTaskBox}>
              <div className={styles.taskAddInputRow}>
                <input
                  type="text"
                  autoFocus
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  placeholder={t('pipeline.openspec.task.addPlaceholder')}
                  className={styles.taskInput}
                  disabled={isTaskBusy('add')}
                />
              </div>
              <div className={styles.taskAddActions}>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  disabled={isTaskBusy('add')}
                  className={styles.secondaryAction}
                >
                  {t('pipeline.openspec.task.addCancel')}
                </button>
                <button
                  type="submit"
                  disabled={isTaskBusy('add') || !newTaskText.trim()}
                  className={styles.primaryAction}
                >
                  {isTaskBusy('add') ? <Loader2 size={13} className={styles.spin} /> : <Plus size={13} />}
                  <span>{t('pipeline.openspec.task.addSubmit')}</span>
                </button>
              </div>
            </form>
          )}

          <ol className={styles.taskList}>
            {tasks.map((task, idx) => {
              const current = task.id === nextTask?.id;
              const isEditing = editingTaskId === task.id;
              const isDragging = draggingTaskId === task.id;
              const isDropTarget = dragOverTaskId === task.id;

              return (
                <li
                  key={task.id}
                  data-completed={task.completed}
                  data-current={current}
                  data-dragging={isDragging || undefined}
                  data-drop-target={isDropTarget || undefined}
                  draggable={!isEditing && !fixtureActive && !isAnyBusy}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragOver={(e) => handleDragOver(e, task)}
                  onDrop={(e) => handleDrop(e, task)}
                  onDragEnd={handleDragEnd}
                  onKeyDown={(e) => {
                    if (e.altKey && e.key === 'ArrowUp') {
                      e.preventDefault();
                      if (idx > 0 && !isAnyBusy && !fixtureActive) {
                        handleKeyboardMove(task, 'up');
                      }
                    } else if (e.altKey && e.key === 'ArrowDown') {
                      e.preventDefault();
                      if (idx < tasks.length - 1 && !isAnyBusy && !fixtureActive) {
                        handleKeyboardMove(task, 'down');
                      }
                    }
                  }}
                >
                  {/* Columna 1: Asa en canaleta propia alineada con icono de cabecera (Ajuste 1) */}
                  <div
                    className={styles.taskDragHandle}
                    title={t('pipeline.openspec.task.dragHandle')}
                    aria-label={t('pipeline.openspec.task.dragHandle')}
                    tabIndex={0}
                  >
                    <GripVertical size={13} />
                  </div>

                  {/* Columna 2: Casilla a plomo con título y controles superiores (Ajuste 1) */}
                  <button
                    type="button"
                    className={styles.taskStatus}
                    disabled={fixtureActive || isAnyBusy}
                    aria-pressed={task.completed}
                    title={t(task.completed ? 'pipeline.openspec.task.uncheck' : 'pipeline.openspec.task.check')}
                    aria-label={t(task.completed ? 'pipeline.openspec.task.uncheck' : 'pipeline.openspec.task.check')}
                    onClick={() => handleToggleTask(task)}
                  >
                    {isTaskBusy('check', task.id) ? (
                      <Loader2 size={16} className={styles.spin} />
                    ) : task.completed ? (
                      <CheckCircle2 size={16} />
                    ) : (
                      <Circle size={16} />
                    )}
                  </button>

                  {/* Columna 2: Rótulo / identificador */}
                  <strong>{resolveLabel(task)}</strong>

                  {/* Columna 3: Contenido o edición inline con textarea (Bloque A) */}
                  {isEditing ? (
                    <div className={styles.taskInlineEdit}>
                      <textarea
                        ref={editTextareaRef}
                        rows={1}
                        autoFocus
                        value={editText}
                        onChange={(e) => {
                          setEditText(e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            e.preventDefault();
                            void handleSaveEdit(task);
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTaskId(null);
                          }
                        }}
                        disabled={isTaskBusy('edit', task.id)}
                      />
                      <div className={styles.taskInlineEditFooter}>
                        <span className={styles.taskEditHint}>
                          {t('pipeline.openspec.task.editHint')}
                        </span>
                        <div className={styles.taskInlineEditButtons}>
                          <button
                            type="button"
                            className={styles.taskActionBtn}
                            onClick={() => void handleSaveEdit(task)}
                            disabled={isTaskBusy('edit', task.id) || !editText.trim()}
                            title={t('pipeline.openspec.task.editSave')}
                            aria-label={t('pipeline.openspec.task.editSave')}
                          >
                            {isTaskBusy('edit', task.id) ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
                          </button>
                          <button
                            type="button"
                            className={styles.taskActionBtn}
                            onClick={() => setEditingTaskId(null)}
                            disabled={isTaskBusy('edit', task.id)}
                            title={t('pipeline.openspec.task.editCancel')}
                            aria-label={t('pipeline.openspec.task.editCancel')}
                          >
                            <X size={13} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <span>{resolveText(task)}</span>
                  )}

                  {/* Columna 5: Acciones con lápiz y tres puntos horizontales (Ajuste 2) */}
                  {!isEditing && (
                    <div className={styles.taskActions}>
                      <button
                        type="button"
                        className={styles.taskActionBtn}
                        disabled={fixtureActive || isAnyBusy}
                        onClick={() => handleStartEdit(task)}
                        title={t('pipeline.openspec.task.edit')}
                        aria-label={t('pipeline.openspec.task.edit')}
                      >
                        {isTaskBusy('edit', task.id) ? (
                          <Loader2 size={13} className={styles.spin} />
                        ) : (
                          <Pencil size={13} />
                        )}
                      </button>
                      <button
                        type="button"
                        className={styles.taskActionBtn}
                        disabled={fixtureActive || isAnyBusy}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          setMenuCoords({ x: rect.right, y: rect.bottom + 4 });
                          setOpenMenuTaskId(openMenuTaskId === task.id ? null : task.id);
                        }}
                        title={t('pipeline.openspec.task.moreActions')}
                        aria-label={t('pipeline.openspec.task.moreActions')}
                      >
                        {isTaskBusy('delete', task.id) || isTaskBusy('move', task.id) ? (
                          <Loader2 size={13} className={styles.spin} />
                        ) : (
                          <MoreHorizontal size={14} />
                        )}
                      </button>
                    </div>
                  )}

                  {current && runtimeActive && <em>{t('pipeline.openspec.task.running')}</em>}

                  {/* Ficha de detalles si es la tarea actual con sesión activa */}
                  {current && changeSession && (
                    <div className={styles.taskDetail}>
                      <dl>
                        <div>
                          <span className={styles.taskDetailIcon} aria-hidden="true"><User size={13} /></span>
                          <dt>{t('pipeline.openspec.task.agent')}</dt>
                          <dd>{runningName}</dd>
                        </div>
                        <div>
                          <span className={styles.taskDetailIcon} aria-hidden="true"><FileText size={13} /></span>
                          <dt>{t('pipeline.openspec.task.source')}</dt>
                          <dd>{task.sourceRef}</dd>
                        </div>
                        <div>
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
            {tasks.length === 0 && <li className={styles.taskEmpty}>{t('pipeline.openspec.tasks.empty')}</li>}
          </ol>
        </>
      )}

      {/* Capa de menú contextual de tarea (Bloque C) */}
      {openMenuTaskId && (() => {
        const task = tasks.find((t) => t.id === openMenuTaskId);
        if (!task) return null;
        const idx = tasks.findIndex((t) => t.id === task.id);
        return (
          <TaskContextMenu
            x={menuCoords.x}
            y={menuCoords.y}
            canMoveUp={idx > 0}
            canMoveDown={idx < tasks.length - 1}
            onEdit={() => handleStartEdit(task)}
            onMoveUp={() => handleKeyboardMove(task, 'up')}
            onMoveDown={() => handleKeyboardMove(task, 'down')}
            onDelete={() => handleDeleteTask(task)}
            onClose={() => setOpenMenuTaskId(null)}
          />
        );
      })()}

      {/* VISTA 2: Vista Markdown unificada (Ajuste 3) */}
      {viewMode === 'markdown' && (
        <div className={markdownMode === 'formatted' ? styles.markdownFormattedContainer : styles.rawEditorContainer}>
          <div className={markdownMode === 'formatted' ? styles.markdownFormattedHeader : styles.rawEditorHeader}>
            <div className="flex items-center gap-2">
              <span>{selectedChange.changeId}/tasks.md</span>
              {markdownMode === 'raw' && isRawDirty && (
                <span className={styles.rawDirtyBadge}>
                  {t('pipeline.openspec.task.rawDirtyWarning')}
                </span>
              )}
            </div>
            <div className={styles.markdownFormattedActions}>
              {/* 1. Alternar entre ver con formato y ver crudo */}
              <button
                type="button"
                onClick={handleToggleMarkdownMode}
                className={styles.markdownCopyBtn}
                title={markdownMode === 'formatted' ? t('pipeline.openspec.task.viewRaw') : t('pipeline.openspec.task.viewFormatted')}
                aria-label={markdownMode === 'formatted' ? t('pipeline.openspec.task.viewRaw') : t('pipeline.openspec.task.viewFormatted')}
              >
                {markdownMode === 'formatted' ? <FileCode2 size={13} /> : <Eye size={13} />}
                <span>{markdownMode === 'formatted' ? t('pipeline.openspec.task.viewRaw') : t('pipeline.openspec.task.viewFormatted')}</span>
              </button>

              {/* 2. Guardar (visible y funcional en modo crudo / con cambios) */}
              <button
                type="button"
                onClick={() => void handleSaveRawContent()}
                disabled={isRawSaving || fixtureActive || !isRawDirty}
                className={styles.primaryAction}
                title={t('pipeline.openspec.task.rawSave')}
                aria-label={t('pipeline.openspec.task.rawSave')}
              >
                {isRawSaving ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
                <span>{isRawSaving ? t('pipeline.openspec.task.rawSaving') : t('pipeline.openspec.task.rawSave')}</span>
              </button>

              {/* 3. Copiar */}
              <button
                type="button"
                onClick={handleCopyMarkdown}
                className={styles.markdownCopyBtn}
                data-copied={copiedMarkdown ? 'true' : undefined}
                title={t('pipeline.openspec.task.copyMarkdown')}
                aria-label={t('pipeline.openspec.task.copyMarkdown')}
              >
                {copiedMarkdown ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedMarkdown ? t('pipeline.openspec.task.copiedMarkdown') : t('pipeline.openspec.task.copyMarkdown')}</span>
              </button>

              {/* 4. Editar (aparece sólo cuando se está viendo con formato) */}
              {markdownMode === 'formatted' && (
                <button
                  type="button"
                  onClick={() => handleSwitchMarkdownMode('raw')}
                  className={styles.secondaryAction}
                  title={t('pipeline.openspec.task.editInRaw')}
                  aria-label={t('pipeline.openspec.task.editInRaw')}
                >
                  <Pencil size={12} />
                  <span>{t('pipeline.openspec.task.editInRaw')}</span>
                </button>
              )}
            </div>
          </div>

          {markdownMode === 'formatted' ? (
            <div className={styles.markdownFormattedBody}>
              <SafeMarkdown content={rawText} />
            </div>
          ) : (
            <textarea
              value={rawText}
              onChange={(e) => {
                setRawText(e.target.value);
                setIsRawDirty(e.target.value !== diskRawTasks);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void handleSaveRawContent();
                }
              }}
              spellCheck={false}
              className={styles.rawTextarea}
              placeholder="## 1. Grupo&#10;&#10;- [ ] 1.1 Tarea..."
              aria-label={t('pipeline.openspec.task.viewRaw')}
            />
          )}
        </div>
      )}

      {/* Toast de confirmación de desmarcado */}
      {pendingConfirm?.type === 'uncheck' && (
        <TaskConfirmToast
          title={t('pipeline.openspec.task.uncheckTitle', { task: resolveLabel(pendingConfirm.task) })}
          description={t('pipeline.openspec.task.uncheckHelp')}
          confirmLabel={t('pipeline.openspec.task.uncheckConfirm')}
          cancelLabel={t('pipeline.openspec.archive.cancel')}
          onConfirm={() => {
            if (isAnyBusy) return;
            const task = pendingConfirm.task;
            setPendingConfirm(null);
            void executeSetChecked(task, false);
          }}
          onCancel={() => {
            if (isAnyBusy) return;
            setPendingConfirm(null);
          }}
        />
      )}

      {/* Toast de confirmación de eliminación (Bloque B: concurrencia bloqueada) */}
      {pendingConfirm?.type === 'delete' && (
        <TaskConfirmToast
          title={t('pipeline.openspec.task.deleteTitle', { task: resolveLabel(pendingConfirm.task) })}
          description={t('pipeline.openspec.task.deleteHelp')}
          confirmLabel={t('pipeline.openspec.task.deleteConfirm')}
          cancelLabel={t('pipeline.openspec.archive.cancel')}
          onConfirm={() => {
            if (isAnyBusy) return;
            const task = pendingConfirm.task;
            setPendingConfirm(null);
            void executeDeleteTask(task);
          }}
          onCancel={() => {
            if (isAnyBusy) return;
            setPendingConfirm(null);
          }}
        />
      )}

      {/* Toast de confirmación de cambio de vista con cambios sin guardar */}
      {pendingConfirm?.type === 'switch-dirty' && (
        <TaskConfirmToast
          title={t('pipeline.openspec.task.rawDirtyWarning')}
          description={t('pipeline.openspec.task.rawDirtyHelp')}
          confirmLabel={t('pipeline.openspec.task.rawSaveAndSwitch')}
          cancelLabel={t('pipeline.openspec.task.rawDiscard')}
          onConfirm={async () => {
            const ok = await handleSaveRawContent();
            if (ok) {
              const target = pendingConfirm.targetMode;
              const targetMd = pendingConfirm.targetMarkdownMode;
              if (targetMd) {
                try {
                  localStorage.setItem(MARKDOWN_VIEW_PREF_KEY, targetMd);
                } catch {
                  // noop
                }
                setMarkdownMode(targetMd);
              }
              setViewMode(target);
              setPendingConfirm(null);
            }
          }}
          onCancel={() => {
            const target = pendingConfirm.targetMode;
            const targetMd = pendingConfirm.targetMarkdownMode;
            setRawText(diskRawTasks);
            setIsRawDirty(false);
            if (targetMd) {
              try {
                localStorage.setItem(MARKDOWN_VIEW_PREF_KEY, targetMd);
              } catch {
                // noop
              }
              setMarkdownMode(targetMd);
            }
            setViewMode(target);
            setPendingConfirm(null);
          }}
        />
      )}
    </div>
  );
}
