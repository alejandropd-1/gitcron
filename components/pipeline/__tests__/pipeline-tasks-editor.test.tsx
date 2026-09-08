// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { OpenSpecTasksView } from '../OpenSpecTasksView';
import type { OpenSpecChangeEvidence } from '@/types/pipeline';

describe('OpenSpecTasksView (Grupo 8: Tareas 8.1, 8.2, 8.4, 8.8)', () => {
  const pipelineSetTaskChecked = vi.fn().mockResolvedValue({ success: true });
  const pipelineAddTask = vi.fn().mockResolvedValue({ success: true });
  const pipelineEditTask = vi.fn().mockResolvedValue({ success: true });
  const pipelineMoveTask = vi.fn().mockResolvedValue({ success: true });
  const pipelineRemoveTask = vi.fn().mockResolvedValue({ success: true });
  const pipelineWriteArtifact = vi.fn().mockResolvedValue({ success: true });
  const onRefresh = vi.fn();
  const setSuccess = vi.fn();

  const mockChange: OpenSpecChangeEvidence = {
    changeId: 'demo-change',
    intent: 'Probar tareas',
    proposalExists: true,
    designExists: true,
    specsCount: 1,
    validation: 'passed',
    tasks: [
      { id: '1.1', text: '1.1 Primera tarea', completed: false, line: 3, sourceRef: 'tasks.md' },
      { id: '1.2', text: '1.2 Segunda tarea', completed: true, line: 4, sourceRef: 'tasks.md' },
      { id: '1.3', text: '1.3 Tercera tarea', completed: false, line: 5, sourceRef: 'tasks.md' },
    ],
    artifacts: {
      proposal: '# Propuesta',
      design: '# Diseño',
      tasks: [
        '## 1. Grupo',
        '',
        '- [ ] 1.1 Primera tarea',
        '- [x] 1.2 Segunda tarea',
        '- [ ] 1.3 Tercera tarea',
      ].join('\n'),
      specs: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'api', {
      configurable: true,
      value: {
        pipelineSetTaskChecked,
        pipelineAddTask,
        pipelineEditTask,
        pipelineMoveTask,
        pipelineRemoveTask,
        pipelineWriteArtifact,
      },
    });
  });

  afterEach(() => {
    cleanup();
  });

  function renderView(change: OpenSpecChangeEvidence = mockChange) {
    return render(
      <OpenSpecTasksView
        repoPath="C:/repo"
        selectedChange={change}
        onRefresh={onRefresh}
        setSuccess={setSuccess}
      />,
    );
  }

  // --- Tarea 8.1: Agregar, editar, eliminar y errores ---
  describe('Operaciones de lista (Tarea 8.1)', () => {
    it('agrega una nueva tarea al final consumiendo pipelineAddTask', async () => {
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /Nueva tarea/i }));
      const input = screen.getByPlaceholderText(/Descripción de la nueva tarea/i);
      fireEvent.change(input, { target: { value: '1.4 Nueva tarea agregada' } });

      fireEvent.click(screen.getByRole('button', { name: /^Agregar$/i }));

      await waitFor(() => {
        expect(pipelineAddTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          '1.4 Nueva tarea agregada',
          { position: 'end' },
          'persona',
        );
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('edita el texto de una tarea consumiendo pipelineEditTask', async () => {
      renderView();

      const [firstEditBtn] = screen.getAllByRole('button', { name: /Editar tarea/i });
      fireEvent.click(firstEditBtn);

      const input = screen.getByDisplayValue('Primera tarea');
      fireEvent.change(input, { target: { value: 'Primera tarea editada' } });

      fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

      await waitFor(() => {
        expect(pipelineEditTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          3,
          '1.1 Primera tarea',
          'Primera tarea editada',
          'persona',
        );
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('eliminar una tarea exige confirmación y llama a pipelineRemoveTask tras confirmar', async () => {
      renderView();

      const [firstDeleteBtn] = screen.getAllByRole('button', { name: /Eliminar tarea/i });
      fireEvent.click(firstDeleteBtn);

      expect(pipelineRemoveTask).not.toHaveBeenCalled();

      // Se muestra el diálogo de confirmación con botón Eliminar
      const confirmBtn = await screen.findByRole('button', { name: /^Eliminar$/i });
      fireEvent.click(confirmBtn);

      await waitFor(() => {
        expect(pipelineRemoveTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          3,
          '1.1 Primera tarea',
          'persona',
        );
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('cancelar la eliminación deja la tarea intacta', async () => {
      renderView();

      const [firstDeleteBtn] = screen.getAllByRole('button', { name: /Eliminar tarea/i });
      fireEvent.click(firstDeleteBtn);

      const cancelBtn = await screen.findByRole('button', { name: /Cancelar/i });
      fireEvent.click(cancelBtn);

      expect(pipelineRemoveTask).not.toHaveBeenCalled();
    });

    it('muestra error de mismatch con opción de recargar tareas', async () => {
      pipelineAddTask.mockResolvedValueOnce({ success: false, error: 'mismatch' });
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /Nueva tarea/i }));
      const input = screen.getByPlaceholderText(/Descripción de la nueva tarea/i);
      fireEvent.change(input, { target: { value: 'Tarea con choque' } });
      fireEvent.click(screen.getByRole('button', { name: /^Agregar$/i }));

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByText(/El archivo cambió en disco/i)).toBeTruthy();

      const reloadBtn = screen.getByRole('button', { name: /Recargar tareas/i });
      fireEvent.click(reloadBtn);
      expect(onRefresh).toHaveBeenCalled();
    });

    it('traduce los códigos de error conocidos (not-found, archived, not-a-task, empty-text, out-of-bounds)', async () => {
      pipelineEditTask.mockResolvedValueOnce({ success: false, error: 'archived' });
      renderView();

      const [firstEditBtn] = screen.getAllByRole('button', { name: /Editar tarea/i });
      fireEvent.click(firstEditBtn);
      fireEvent.click(screen.getByRole('button', { name: /Guardar/i }));

      expect(await screen.findByRole('alert')).toBeTruthy();
      expect(screen.getByText(/El cambio está archivado/i)).toBeTruthy();
    });
  });

  // --- Tarea 8.8: Reordenar por teclado y Drag & Drop con rollback ---
  describe('Reordenamiento de tareas (Tarea 8.8)', () => {
    it('mueve una tarea hacia abajo usando el botón de teclado', async () => {
      renderView();

      const [firstDownBtn] = screen.getAllByRole('button', { name: /Bajar tarea/i });
      fireEvent.click(firstDownBtn);

      await waitFor(() => {
        expect(pipelineMoveTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          3,
          4,
          '1.1 Primera tarea',
          'persona',
        );
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('mueve una tarea hacia arriba usando el botón de teclado', async () => {
      renderView();

      const upButtons = screen.getAllByRole('button', { name: /Subir tarea/i });
      // El segundo botón Subir corresponde a la tarea 1.2
      fireEvent.click(upButtons[1]);

      await waitFor(() => {
        expect(pipelineMoveTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          4,
          3,
          '1.2 Segunda tarea',
          'persona',
        );
      });
    });

    it('soporta reordenar por Drag & Drop HTML5 sin layout shift', async () => {
      renderView();

      const listItems = screen.getAllByRole('listitem');
      // Los primeros 3 li en la lista corresponden a las tareas (si no hay warning)
      const taskList = screen.getByRole('list');
      const taskItems = taskList.querySelectorAll('li');
      const firstItem = taskItems[0];
      const secondItem = taskItems[1];

      // Iniciar arrastre
      const dataTransfer = {
        setData: vi.fn(),
        getData: vi.fn(() => '1.1'),
        effectAllowed: 'none',
        dropEffect: 'none',
      };
      fireEvent.dragStart(firstItem, { dataTransfer });
      expect(dataTransfer.setData).toHaveBeenCalledWith('text/plain', '1.1');

      // Arrastrar sobre el segundo elemento
      fireEvent.dragOver(secondItem, { dataTransfer });

      // Soltar
      fireEvent.drop(secondItem, { dataTransfer });

      await waitFor(() => {
        expect(pipelineMoveTask).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          3,
          4,
          '1.1 Primera tarea',
          'persona',
        );
      });
    });

    it('revierte el orden optimista en caso de fallo al mover y muestra error', async () => {
      pipelineMoveTask.mockResolvedValueOnce({ success: false, error: 'mismatch' });
      renderView();

      const [firstDownBtn] = screen.getAllByRole('button', { name: /Bajar tarea/i });
      fireEvent.click(firstDownBtn);

      await waitFor(() => {
        expect(screen.getByRole('alert')).toBeTruthy();
      });
      expect(screen.getByText(/El archivo cambió en disco/i)).toBeTruthy();
    });
  });

  // --- Tarea 8.2: Vista de texto Markdown editable y guardia de cambios ---
  describe('Vista de texto Markdown crudo (Tarea 8.2)', () => {
    it('permite cambiar a la vista de editor Markdown y guardar los cambios', async () => {
      renderView();

      const rawTab = screen.getByRole('button', { name: /Editor Markdown/i });
      fireEvent.click(rawTab);

      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeTruthy();
      expect((textarea as HTMLTextAreaElement).value).toContain('Primera tarea');

      fireEvent.change(textarea, {
        target: { value: '## 1. Grupo\n\n- [ ] 1.1 Tarea modificada a mano' },
      });

      const saveBtn = screen.getByRole('button', { name: /Guardar archivo/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(pipelineWriteArtifact).toHaveBeenCalledWith(
          'C:/repo',
          'demo-change',
          'tasks',
          '## 1. Grupo\n\n- [ ] 1.1 Tarea modificada a mano',
          { overwrite: true, actor: 'persona' },
        );
      });
      expect(onRefresh).toHaveBeenCalled();
    });

    it('protege cambios sin guardar al intentar volver a la lista (guardar y cambiar)', async () => {
      renderView();

      // Cambiar a raw
      fireEvent.click(screen.getByRole('button', { name: /Editor Markdown/i }));

      // Modificar texto
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Texto no guardado' } });

      // Intentar cambiar a lista
      fireEvent.click(screen.getByRole('button', { name: /Lista interactiva/i }));

      // Diálogo de guardia
      const saveAndSwitchBtn = await screen.findByRole('button', {
        name: /Guardar y cambiar/i,
      });
      expect(saveAndSwitchBtn).toBeTruthy();

      fireEvent.click(saveAndSwitchBtn);

      await waitFor(() => {
        expect(pipelineWriteArtifact).toHaveBeenCalled();
      });
    });

    it('protege cambios sin guardar al intentar volver a la lista (descartar cambios)', async () => {
      renderView();

      fireEvent.click(screen.getByRole('button', { name: /Editor Markdown/i }));

      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'Texto para descartar' } });

      fireEvent.click(screen.getByRole('button', { name: /Lista interactiva/i }));

      const discardBtn = await screen.findByRole('button', {
        name: /Descartar cambios/i,
      });
      fireEvent.click(discardBtn);

      expect(pipelineWriteArtifact).not.toHaveBeenCalled();
      // Vuelve a la lista
      expect(screen.getByRole('list')).toBeTruthy();
    });
  });

  // --- Tarea 8.4: Detección de tareas mal formadas ---
  describe('Detección y señalamiento de tareas mal formadas (Tarea 8.4)', () => {
    it('señala tareas mal formadas en la vista de lista sin bloquear operaciones', async () => {
      const malformedChange: OpenSpecChangeEvidence = {
        ...mockChange,
        artifacts: {
          ...mockChange.artifacts!,
          tasks: [
            '## 1. Grupo',
            '- [ ] 1.1 Tarea ok',
            '- [] 1.2 Tarea rota corchetes vacíos',
            '-[ ] 1.3 Tarea rota guion pegado',
          ].join('\n'),
        },
      };

      renderView(malformedChange);

      const warning = await screen.findByRole('status');
      expect(warning).toBeTruthy();
      expect(screen.getByText(/Líneas de tarea mal formadas/i)).toBeTruthy();
      expect(screen.getByText(/- \[\] 1\.2 Tarea rota/)).toBeTruthy();
      expect(screen.getByText(/-\[ \] 1\.3 Tarea rota/)).toBeTruthy();

      // Las operaciones de lista siguen funcionando (no bloqueante)
      const [checkBtn] = screen.getAllByRole('button', { name: /Marcar esta tarea/i });
      expect((checkBtn as HTMLButtonElement).disabled).toBe(false);
    });

    it('señala tareas mal formadas en la vista de texto sin bloquear el guardado', async () => {
      const malformedChange: OpenSpecChangeEvidence = {
        ...mockChange,
        artifacts: {
          ...mockChange.artifacts!,
          tasks: '## 1. Grupo\n- [] 1.1 Tarea rota',
        },
      };

      renderView(malformedChange);

      fireEvent.click(screen.getByRole('button', { name: /Editor Markdown/i }));

      expect(await screen.findByRole('status')).toBeTruthy();
      expect(screen.getByText(/Líneas de tarea mal formadas/i)).toBeTruthy();

      // El botón de guardar NO se bloquea
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '## 1. Grupo\n- [] 1.1 Tarea rota editada' } });
      const saveBtn = screen.getByRole('button', { name: /Guardar archivo/i });
      expect((saveBtn as HTMLButtonElement).disabled).toBe(false);
    });
  });
});
