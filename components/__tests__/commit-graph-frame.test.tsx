// @vitest-environment jsdom
import fs from 'fs';
import path from 'path';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CommitGraph } from '../CommitGraph';
import type { Commit } from '@/lib/git-store';

vi.mock('@/hooks/use-translation', () => ({
  useT: () => (key: string) => key,
  tNow: () => 'ahora',
}));

afterEach(cleanup);

function makeCommit(hash: string, refs: string[] = []): Commit {
  return {
    hash,
    shortHash: hash.slice(0, 7),
    message: `Commit ${hash}`,
    authorName: 'Ale Delgado',
    authorEmail: 'ale@example.com',
    date: '2026-08-19T12:00:00.000Z',
    refs,
    parents: [],
  } as unknown as Commit;
}

describe('CommitGraph · bordes de maqueta vs datos', () => {
  it('el contenedor de filas no declara bordes divisorios de maqueta', () => {
    const commits = [
      makeCommit('1111111', ['refs/heads/main']),
      makeCommit('2222222', ['refs/heads/feature']),
    ];

    const { container } = render(
      <CommitGraph
        commits={commits}
        selectedHash="1111111"
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
        currentBranch="main"
      />
    );

    const rowsContainer = container.firstChild as HTMLElement;
    expect(rowsContainer).not.toBeNull();
    expect(rowsContainer.className).not.toContain('border-b');
    expect(rowsContainer.className).not.toContain('border-t');
    expect(rowsContainer.className).not.toContain('border-r');
    expect(rowsContainer.className).not.toContain('border-l');

    // Filas no tienen bordes de layout
    const rows = container.querySelectorAll('.flex.items-center.cursor-pointer');
    expect(rows.length).toBe(2);
    rows.forEach((row) => {
      expect(row.className).not.toContain('border-b');
      expect(row.className).not.toContain('border-t');
    });
  });

  it('conserva bordes de datos: fila WIP para cambios sin confirmar y chips de ref', () => {
    const commits = [makeCommit('1111111', ['refs/heads/main'])];

    const { container } = render(
      <CommitGraph
        commits={commits}
        selectedHash={undefined}
        onSelect={vi.fn()}
        onContextMenu={vi.fn()}
        currentBranch="main"
        workingTreeFiles={[
          { path: 'file1.ts', staged: true, status: 'M' } as any,
          { path: 'file2.ts', staged: false, status: 'M' } as any,
        ]}
      />
    );

    // Fila WIP: border-l-2 border-git-add/40 comunica dato (trabajo en curso)
    const wipRow = container.querySelector('.bg-git-add\\/5');
    expect(wipRow).not.toBeNull();
    expect(wipRow?.className).toContain('border-l-2');
    expect(wipRow?.className).toContain('border-git-add/40');

    // Badge + 1 staged en WIPRow
    const stagedBadge = screen.getByText('+ 1');
    expect(stagedBadge.className).toContain('border-git-add/50');
  });
});

describe('OpenSpecDashboard (cuerpo SDD) · bordes de maqueta vs excepciones', () => {
  const cssPath = path.resolve(__dirname, '../pipeline/OpenSpecDashboard.module.css');
  const cssContent = fs.readFileSync(cssPath, 'utf8');

  it('no declara líneas divisorias de maqueta en las secciones, encabezados ni filas del cuerpo', () => {
    // 1. Encabezado de especificación
    expect(cssContent).not.toMatch(/\.specificationHead\s*\{[^}]*border-bottom:/);
    // 2. Encabezado del cambio
    expect(cssContent).not.toMatch(/\.changeHeader\s*\{[^}]*border-bottom:/);
    // 3. Barra de solapas
    expect(cssContent).not.toMatch(/\.tabsRow\s*\{[^}]*border-bottom:/);
    // 4. Título del área de trabajo
    expect(cssContent).not.toMatch(/\.workArea\s*>\s*h4\s*\{[^}]*border-bottom:/);
    // 5. Filas de la lista de tareas
    expect(cssContent).not.toMatch(/\.taskList\s*>\s*li\s*\{[^}]*border-bottom:/);
    // 6. Detalle expandido de tarea
    expect(cssContent).not.toMatch(/\.taskDetail\s*\{[^}]*border-top:/);
    // 7. Texto explicativo de grupo de archivos
    expect(cssContent).not.toMatch(/\.groupHelp\s*\{[^}]*border-block-end:/);
    // 8. Confirmación de archivo
    expect(cssContent).not.toMatch(/\.archiveConfirm\s*\{[^}]*border-bottom:/);
    // 9. Franja de evidencia
    expect(cssContent).not.toMatch(/\.evidenceStrip\s*\{[^}]*border-top:/);
    expect(cssContent).not.toMatch(/\.evidenceStrip\s*>\s*div\s*\{[^}]*border-right:/);
    // 10. Título de pantalla de inicio
    expect(cssContent).not.toMatch(/\.startScreen\s*>\s*h3\s*\{[^}]*border-bottom:/);
    // 11. Lista de pendientes en pantalla de inicio
    expect(cssContent).not.toMatch(/\.startPending\s*\{[^}]*border-top:/);
    // 12. Encabezado de cambio archivado
    expect(cssContent).not.toMatch(/\.completedHeader\s*\{[^}]*border-bottom:/);
    // 13. Secciones internas de la tarjeta del motor
    expect(cssContent).not.toMatch(/\.outputInventorySection\s*\{[^}]*border-top:/);
    expect(cssContent).not.toMatch(/\.advancedDiagnosticsContainer\s*\{[^}]*border-top:/);
    expect(cssContent).not.toMatch(/\.absentOutputsSection\s*\{[^}]*border-top:/);
    // 14. Encabezado y pie de revisión
    expect(cssContent).not.toMatch(/\.reviewHead\s*\{[^}]*border-bottom:/);
    expect(cssContent).not.toMatch(/\.reviewFooterRow\s*\{[^}]*border-top:/);
  });

  it('todos los bordes declarados en el módulo pertenecen a las tres clases de excepción permitidas', () => {
    // Parser de reglas y propiedades border
    const ruleRegex = /([^{}]+)\{([^}]+)\}/g;
    let match: RegExpExecArray | null;

    // Lista exhaustiva de excepciones permitidas en OpenSpecDashboard.module.css:
    // Excepción 1: Controles interactivos, botones, inputs y estados de foco (necesitan contorno o respuesta de foco)
    // Excepción 2: Tarjetas y contenedores de información dentro del contenido (agrupan unidades de datos)
    // Excepción 3: Bordes que comunican DATO / estado (tarea activa, rama, advertencia, divergencia, badges)
    // Resets: border: 0 / none / transparent
    const allowedPatterns: RegExp[] = [
      /\.activeChange/,
      /\.changeSelect/,
      /\.changeToggle/,
      /\.artifactRow/,
      /\.compactList/,
      /\.specList/,
      /\.tabs/,
      /\.taskList\s*>\s*li\[data-current='true'\]/, // DATO: tarea activa
      /\.taskList\s*>\s*li\[data-completed='true'\]/,
      /\.taskStatus/,
      /\.primaryAction/, // CONTROL: acción principal
      /\.secondaryAction/, // CONTROL: acción secundaria
      /\.fileGroup/, // TARJETA: agrupa archivos
      /\.groupToggle/, // CONTROL: botón de nivel 3
      /\.fileKind/, // DATO: badge de tipo de archivo
      /\.flowCheck/, // TARJETA / CONTROL: selección de flujo
      /\.prepareBranch/, // DATO: badge de rama destino
      /\.messageField/, // CONTROL / FOCO: input de mensaje
      /\.aiRow/, // CONTROL / FOCO: select de IA
      /\.aiIconAction/, // CONTROL: botón expulsar modelo
      /\.aiNumber/, // CONTROL / FOCO: campo numérico
      /\.aiPanel/, // TARJETA: agrupa sector de IA
      /\.aiFacts/, // DATO: acento de columna de hechos de IA
      /\.aiNotice/, // DATO: aviso de redacción por IA
      /\.linkAction/, // RESET
      /\.launcherPanel/, // TARJETA: panel de runtime
      /\.evidencePanel/, // TARJETA: panel de evidencia
      /\.archiveCommand/, // TARJETA: bloque de comando
      /\.activityRail/, // PANEL DERECHO
      /\.draftLog/, // TARJETA / CONTROL en panel derecho
      /\.liveActivity/, // TARJETA en panel derecho
      /\.sessionSelect/, // CONTROL en panel derecho
      /\.attention/, // TARJETA / CALLOUT en panel derecho
      /\.startList\s*>\s*li/, // TARJETA / DATO: items de pantalla inicial
      /\.branchPill/, // DATO: píldora de coincidencia de rama
      /\.startPendingToggle/, // CONTROL: desplegable de pendientes
      /\.startArchived/, // RESET
      /\.backToStart/, // CONTROL: botón de retorno
      /\.readiness/, // TARJETA / DATO / CONTROL: aviso del repositorio
      /\.branchBase/, // DATO: advertencia de rama base
      /\.railInitAction/, // CONTROL en panel derecho
      /\.railChoose/, // CONTROL / TARJETA en panel derecho
      /\.nextStep/, // TARJETA / DATO: banner de siguiente paso
      /\.disclosureToggle/, // RESET
      /\.instructionPreview/, // TARJETA: vista previa de instrucción
      /\.flowNature/, // DATO: acento de naturaleza del flujo
      /\.intentOption/, // CONTROL / DATO: opciones de intención
      /\.flowField/, // CONTROL / DATO: inputs de formulario
      /\.engineCard/, // TARJETA: tarjeta de integración del motor
      /\.compactEngineBadge/, // DATO: badge de motor
      /\.divergenceNotice/, // DATO: indicador de divergencia
      /\.generalStatusBadge/, // DATO: insignia de estado
      /\.toggleAdvancedBtn/, // CONTROL: botón de diagnósticos
      /\.centerAttention/, // TARJETA / DATO / CONTROL: aviso central
      /\.toggleAbsentBtn/, // RESET
      /\.reviewSafetyBanner/, // TARJETA / DATO: banner de seguridad
      /\.reviewSection/, // TARJETA: sección de revisión
      /\.reviewCommandPre/, // TARJETA: bloque de código
      /\.reviewCopyBtn/, // CONTROL: botón de copiado
      /\.reviewWarningAlert/, // TARJETA / DATO: alerta de advertencia
      /\.reviewCoexistenceCol/, // TARJETA: columna de convivencia
      /\.reviewSkillTag/, // DATO: chip de skill
      /\.reviewPrimaryActionBtn/, // CONTROL: acción de revisión
      /\.branchNoticeBadge/, // DATO: badge compacto de discrepancia de rama
      /\.glossaryToggleBtn/, // CONTROL: botón de acceso a glosario
      /\.glossaryDrawer/, // TARJETA / PANEL: drawer lateral de glosario
      /\.startNewChangeModal/, // TARJETA / MODAL: contenedor de alta de nuevo cambio
      /pipeline-details/, // TARJETA / CONTROL: evidencia migrada de globals.css
      /pipeline-artifact-graph/, // DATO: grafo de artefactos migrado de globals.css
      /:root/, // TOKENS (--os-border)
      /\.openspecScope/, // SCOPE
      /\.dashboard/, // ROOT
    ];

    const unexpectedBorderRules: { selector: string; props: string[] }[] = [];

    while ((match = ruleRegex.exec(cssContent)) !== null) {
      const selector = match[1].trim().replace(/\s+/g, ' ');
      const body = match[2];
      const borderProps = body
        .split(';')
        .map((s) => s.trim())
        .filter(
          (s) =>
            s &&
            /^(border|border-top|border-bottom|border-left|border-right|border-color|border-block|border-inline)/i.test(s) &&
            !s.startsWith('border-radius')
        );

      if (borderProps.length > 0) {
        const isAllowed = allowedPatterns.some((pattern) => pattern.test(selector));
        if (!isAllowed) {
          unexpectedBorderRules.push({ selector, props: borderProps });
        }
      }
    }

    expect(unexpectedBorderRules).toEqual([]);
  });

  it('conserva explícitamente los bordes de datos y tarjetas requeridos', () => {
    // 1. DATO: Fila de tarea actual en curso lleva acento cian
    expect(cssContent).toMatch(/\.taskList\s*>\s*li\[data-current='true'\]\s*\{[^}]*border-left:\s*3px\s+solid\s+var\(--color-primary\)/);

    // 2. TARJETA: Grupo de archivos encapsulado
    expect(cssContent).toMatch(/\.fileGroup\s*\{[^}]*border:\s*1px\s+solid\s+var\(--color-border-subtle\)/);

    // 3. TARJETA: Tarjeta de sector de IA
    expect(cssContent).toMatch(/\.aiPanel\s*\{[^}]*border:\s*1px\s+solid\s+var\(--color-border-subtle\)/);

    // 4. DATO: Aviso de autoría por IA lleva acento ámbar
    expect(cssContent).toMatch(/\.aiNotice\s*\{[^}]*border-left:\s*2px\s+solid\s+var\(--color-warning\)/);

    // 5. DATO: Advertencia sobre rama base lleva acento ámbar
    expect(cssContent).toMatch(/\.branchBase\s*\{[^}]*border-left:\s*2px\s+solid\s+var\(--color-warning\)/);

    // 6. DATO: Siguiente paso lleva acento cian
    expect(cssContent).toMatch(/\.nextStep\s*\{[^}]*border-left:\s*2px\s+solid\s+var\(--color-primary\)/);

    // 7. TARJETA: Tarjeta del motor OpenSpec
    expect(cssContent).toMatch(/\.engineCard\s*\{[^}]*border:\s*1px\s+solid\s+var\(--color-border-subtle\)/);

    // 8. DATO: Divergencia en rojo
    expect(cssContent).toMatch(/\.divergenceNotice\[data-status='divergent'\]\s*\{[^}]*border:\s*1px\s+solid\s+color-mix\(in srgb,\s*var\(--color-error\)/);

    // 9. TARJETA / DATO: Banner de seguridad en revisión
    expect(cssContent).toMatch(/\.reviewSafetyBanner\s*\{[^}]*border-left:\s*3px\s+solid\s+var\(--color-primary\)/);
  });
});
