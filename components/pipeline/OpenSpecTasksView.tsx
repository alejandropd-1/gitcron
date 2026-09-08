'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Check,
  CheckCircle2,
  Circle,
  Edit2,
  FileCode2,
  FileText,
  GitCompare,
  GripVertical,
  ListOrdered,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { findMalformedTaskLines, type MalformedTaskLine } from '@/lib/malformed-tasks';
import { resolveTaskErrorMessage, type TaskErrorMessage } from '@/lib/task-errors';
import type { OpenSpecChangeEvidence, TaskEvidence } from '@/types/pipeline';
import styles from './OpenSpecDashboard.module.css';
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

type ViewMode = 'list' | 'raw';

type PendingConfirm =
  | { type: 'uncheck'; task: TaskEvidence }
  | { type: 'delete'; task: TaskEvidence }
  | { type: 'switch-dirty'; targetMode: ViewMode };

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
  const [tasks, setTasks] = useState<TaskEvidence[]>(selectedChange.tasks ?? []);
  const [taskError, setTaskError] = useState<TaskErrorMessage | null>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null);

  // Estados de adición
  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [isAddBusy, setIsAddBusy] = useState(false);

  // Estados de edición inline
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [isEditBusy, setIsEditBusy] = useState(false);

  // Estados de arrastre (Drag & Drop)
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);
  const [dragOverTaskId, setDragOverTaskId] = useState<string | null>(null);
  const [isMoving, setIsMoving] = useState(false);

  // Estados del editor Markdown crudo (Tarea 8.2)
  const diskRawTasks = selectedChange.artifacts?.tasks ?? '';
  const [rawText, setRawText] = useState<string>(diskRawTasks);
  const [isRawDirty, setIsRawDirty] = useState(false);
  const [isRawSaving, setIsRawSaving] = useState(false);

  // Sincronizar tareas de disco cuando cambia selectedChange.tasks y no hay arrastre en curso
  const [prevTasksProp, setPrevTasksProp] = useState(selectedChange.tasks);
  if (selectedChange.tasks !== prevTasksProp) {
    setPrevTasksProp(selectedChange.tasks);
    if (!isMoving) {
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

  // Detección de tareas mal formadas (Tareas 8.3 y 8.4)
  const malformedLines: MalformedTaskLine[] = useMemo(() => {
    const source = viewMode === 'raw' ? rawText : diskRawTasks;
    return findMalformedTaskLines(source);
  }, [viewMode, rawText, diskRawTasks]);

  // Control de cambio de modo con guardia de cambios sin guardar
  const handleRequestSwitchMode = (next: ViewMode) => {
    if (next === viewMode) return;
    if (viewMode === 'raw' && isRawDirty) {
      setPendingConfirm({ type: 'switch-dirty', targetMode: next });
      return;
    }
    setViewMode(next);
  };

  // --- Operaciones de lista ---

  /** Cambiar estado de casilla (Tarea 8.1) */
  const handleToggleTask = (task: TaskEvidence) => {
    if (fixtureActive) return;
    setTaskError(null);

    // Si ya está marcada, desmarcar exige confirmación
    if (task.completed) {
      setPendingConfirm({ type: 'uncheck', task });
      return;
    }

    // Marcar como completada se ejecuta inmediatamente sin confirmación
    void executeSetChecked(task, true);
  };

  const executeSetChecked = async (task: TaskEvidence, completed: boolean) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineSetTaskChecked) return;
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
    }
  };

  /** Agregar tarea (Tarea 8.1) */
  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newTaskText.trim();
    if (!clean || isAddBusy || fixtureActive) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineAddTask) return;

    setIsAddBusy(true);
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
      setIsAddBusy(false);
    }
  };

  /** Editar texto de tarea (Tarea 8.1) */
  const handleStartEdit = (task: TaskEvidence) => {
    setEditingTaskId(task.id);
    setEditText(resolveText(task));
    setTaskError(null);
  };

  const handleSaveEdit = async (task: TaskEvidence) => {
    const clean = editText.trim();
    if (!clean || isEditBusy || fixtureActive) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineEditTask) return;

    setIsEditBusy(true);
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
      setIsEditBusy(false);
    }
  };

  /** Eliminar tarea (Tarea 8.1 - exige confirmación) */
  const handleDeleteTask = (task: TaskEvidence) => {
    if (fixtureActive) return;
    setPendingConfirm({ type: 'delete', task });
  };

  const executeDeleteTask = async (task: TaskEvidence) => {
    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineRemoveTask) return;

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
    }
  };

  /** Mover tarea: por Drag & Drop o teclado (Tarea 8.8) */
  const executeMoveTask = async (sourceTask: TaskEvidence, targetTask: TaskEvidence) => {
    if (sourceTask.id === targetTask.id) return;

    const api = typeof window !== 'undefined' ? window.api : undefined;
    if (!api?.pipelineMoveTask) return;

    // Guardar copia previa para rollback en caso de fallo
    const previousTasks = [...tasks];
    const sourceIdx = previousTasks.findIndex((t) => t.id === sourceTask.id);
    const targetIdx = previousTasks.findIndex((t) => t.id === targetTask.id);
    if (sourceIdx < 0 || targetIdx < 0) return;

    // Reordenamiento optimista
    const updated = [...previousTasks];
    const [moved] = updated.splice(sourceIdx, 1);
    updated.splice(targetIdx, 0, moved);

    setIsMoving(true);
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
        // Rollback al orden anterior
        setTasks(previousTasks);
        setTaskError(resolveTaskErrorMessage(res?.error, t));
      }
    } catch (err) {
      setTasks(previousTasks);
      setTaskError(resolveTaskErrorMessage(err instanceof Error ? err.message : 'failed', t));
    } finally {
      setIsMoving(false);
    }
  };

  const handleKeyboardMove = (task: TaskEvidence, direction: 'up' | 'down') => {
    const idx = tasks.findIndex((t) => t.id === task.id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= tasks.length) return;
    void executeMoveTask(task, tasks[targetIdx]);
  };

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, task: TaskEvidence) => {
    e.dataTransfer.setData('text/plain', task.id);
    e.dataTransfer.effectAllowed = 'move';
    setDraggingTaskId(task.id);
  };

  const handleDragOver = (e: React.DragEvent, task: TaskEvidence) => {
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
    if (!sourceId) return;
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
    if (!api?.pipelineWriteArtifact || isRawSaving || fixtureActive) return false;

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
      {/* Barra superior de tareas: conteo, botón agregar y selector de vista */}
      <div className={styles.tasksHeader}>
        <div className={styles.tasksHeaderInfo}>
          <span className={styles.tasksCountBadge}>
            {completedCount} / {tasks.length} {t('pipeline.openspec.task.progress')}
          </span>
          {viewMode === 'list' && (
            <button
              type="button"
              className={styles.addTaskToggleBtn}
              onClick={() => setIsAddingTask((prev) => !prev)}
              disabled={fixtureActive}
            >
              <Plus size={13} />
              <span>{t('pipeline.openspec.task.add')}</span>
            </button>
          )}
        </div>

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
              aria-pressed={viewMode === 'raw'}
              data-active={viewMode === 'raw'}
              className={styles.viewModeBtn}
              onClick={() => handleRequestSwitchMode('raw')}
            >
              <FileCode2 size={13} />
              <span>{t('pipeline.openspec.task.viewRaw')}</span>
            </button>
          </div>
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
                  disabled={isAddBusy}
                />
              </div>
              <div className={styles.taskAddActions}>
                <button
                  type="button"
                  onClick={() => setIsAddingTask(false)}
                  disabled={isAddBusy}
                  className={styles.secondaryAction}
                >
                  {t('pipeline.openspec.task.addCancel')}
                </button>
                <button
                  type="submit"
                  disabled={isAddBusy || !newTaskText.trim()}
                  className={styles.primaryAction}
                >
                  {isAddBusy ? <Loader2 size={13} className={styles.spin} /> : <Plus size={13} />}
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
                  draggable={!isEditing && !fixtureActive}
                  onDragStart={(e) => handleDragStart(e, task)}
                  onDragOver={(e) => handleDragOver(e, task)}
                  onDrop={(e) => handleDrop(e, task)}
                  onDragEnd={handleDragEnd}
                >
                  {/* Columna 1: Casilla (marcar / desmarcar) */}
                  <button
                    type="button"
                    className={styles.taskStatus}
                    disabled={fixtureActive}
                    aria-pressed={task.completed}
                    title={t(task.completed ? 'pipeline.openspec.task.uncheck' : 'pipeline.openspec.task.check')}
                    aria-label={t(task.completed ? 'pipeline.openspec.task.uncheck' : 'pipeline.openspec.task.check')}
                    onClick={() => handleToggleTask(task)}
                  >
                    {task.completed ? <CheckCircle2 size={16} /> : <Circle size={16} />}
                  </button>

                  {/* Columna 2: Rótulo / identificador */}
                  <strong>{resolveLabel(task)}</strong>

                  {/* Columna 3: Contenido o edición inline */}
                  {isEditing ? (
                    <div className={styles.taskInlineEdit}>
                      <input
                        type="text"
                        autoFocus
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') void handleSaveEdit(task);
                          if (e.key === 'Escape') setEditingTaskId(null);
                        }}
                        disabled={isEditBusy}
                      />
                      <button
                        type="button"
                        className={styles.taskActionBtn}
                        onClick={() => void handleSaveEdit(task)}
                        disabled={isEditBusy || !editText.trim()}
                        title={t('pipeline.openspec.task.editSave')}
                        aria-label={t('pipeline.openspec.task.editSave')}
                      >
                        {isEditBusy ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
                      </button>
                      <button
                        type="button"
                        className={styles.taskActionBtn}
                        onClick={() => setEditingTaskId(null)}
                        disabled={isEditBusy}
                        title={t('pipeline.openspec.task.editCancel')}
                        aria-label={t('pipeline.openspec.task.editCancel')}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <span>{resolveText(task)}</span>
                  )}

                  {/* Columna 4: Acciones (arrastrar, mover teclado, editar, eliminar) */}
                  {!isEditing && (
                    <div className={styles.taskActions}>
                      <div
                        className={styles.taskDragHandle}
                        title={t('pipeline.openspec.task.dragHandle')}
                        aria-label={t('pipeline.openspec.task.dragHandle')}
                      >
                        <GripVertical size={13} />
                      </div>
                      <button
                        type="button"
                        disabled={idx === 0 || fixtureActive}
                        onClick={() => handleKeyboardMove(task, 'up')}
                        title={t('pipeline.openspec.task.moveUp')}
                        aria-label={t('pipeline.openspec.task.moveUp')}
                        className={styles.taskActionBtn}
                      >
                        <ArrowUp size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={idx === tasks.length - 1 || fixtureActive}
                        onClick={() => handleKeyboardMove(task, 'down')}
                        title={t('pipeline.openspec.task.moveDown')}
                        aria-label={t('pipeline.openspec.task.moveDown')}
                        className={styles.taskActionBtn}
                      >
                        <ArrowDown size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={fixtureActive}
                        onClick={() => handleStartEdit(task)}
                        title={t('pipeline.openspec.task.edit')}
                        aria-label={t('pipeline.openspec.task.edit')}
                        className={styles.taskActionBtn}
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={fixtureActive}
                        onClick={() => handleDeleteTask(task)}
                        title={t('pipeline.openspec.task.delete')}
                        aria-label={t('pipeline.openspec.task.delete')}
                        className={`${styles.taskActionBtn} ${styles.taskActionBtnDanger}`}
                      >
                        <Trash2 size={13} />
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

      {/* VISTA 2: Editor Markdown crudo (Tarea 8.2) */}
      {viewMode === 'raw' && (
        <div className={styles.rawEditorContainer}>
          <div className={styles.rawEditorHeader}>
            <div className="flex items-center gap-2">
              <span>{selectedChange.changeId}/tasks.md</span>
              {isRawDirty && (
                <span className={styles.rawDirtyBadge}>
                  {t('pipeline.openspec.task.rawDirtyWarning')}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => void handleSaveRawContent()}
              disabled={isRawSaving || fixtureActive || !isRawDirty}
              className={styles.primaryAction}
            >
              {isRawSaving ? <Loader2 size={13} className={styles.spin} /> : <Check size={13} />}
              <span>{isRawSaving ? t('pipeline.openspec.task.rawSaving') : t('pipeline.openspec.task.rawSave')}</span>
            </button>
          </div>
          <textarea
            value={rawText}
            onChange={(e) => {
              setRawText(e.target.value);
              setIsRawDirty(e.target.value !== diskRawTasks);
            }}
            spellCheck={false}
            className={styles.rawTextarea}
            placeholder="## 1. Grupo\n\n- [ ] 1.1 Tarea..."
          />
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
            const task = pendingConfirm.task;
            setPendingConfirm(null);
            void executeSetChecked(task, false);
          }}
          onCancel={() => setPendingConfirm(null)}
        />
      )}

      {/* Toast de confirmación de eliminación */}
      {pendingConfirm?.type === 'delete' && (
        <TaskConfirmToast
          title={t('pipeline.openspec.task.deleteTitle', { task: resolveLabel(pendingConfirm.task) })}
          description={t('pipeline.openspec.task.deleteHelp')}
          confirmLabel={t('pipeline.openspec.task.deleteConfirm')}
          cancelLabel={t('pipeline.openspec.archive.cancel')}
          onConfirm={() => {
            const task = pendingConfirm.task;
            setPendingConfirm(null);
            void executeDeleteTask(task);
          }}
          onCancel={() => setPendingConfirm(null)}
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
              setViewMode(pendingConfirm.targetMode);
              setPendingConfirm(null);
            }
          }}
          onCancel={() => {
            // Descartar cambios: restablecer a la versión de disco y cambiar
            setRawText(diskRawTasks);
            setIsRawDirty(false);
            setViewMode(pendingConfirm.targetMode);
            setPendingConfirm(null);
          }}
        />
      )}
    </div>
  );
}
