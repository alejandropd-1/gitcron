import { describe, expect, it } from 'vitest';
import {
  archiveCommitPaths,
  deterministicChangePaths,
  markSignatureTask,
  parseCommitManifest,
  SIGNATURE_TASK_TEXT,
} from '../pipeline/change-commit-manifest';

describe('manifiesto de commit', () => {
  const manifest = `# Commit

## Mensaje

feat(pipeline): hacer algo

Con cuerpo.

## Archivos

- components/uno.tsx
- \`electron/dos.ts\`
`;

  it('lee mensaje y archivos', () => {
    const parsed = parseCommitManifest(manifest);
    expect(parsed?.message).toBe('feat(pipeline): hacer algo\n\nCon cuerpo.');
    expect(parsed?.files).toEqual(['components/uno.tsx', 'electron/dos.ts']);
  });

  // Un manifiesto a medias no se completa con defaults: el default sería
  // commitear de más o de menos, que es justo lo que no puede pasar sin verse.
  it('rechaza un manifiesto incompleto en vez de rellenarlo', () => {
    expect(parseCommitManifest('## Mensaje\n\nsolo mensaje\n')).toBeNull();
    expect(parseCommitManifest('## Archivos\n\n- a.ts\n')).toBeNull();
    expect(parseCommitManifest('')).toBeNull();
  });

  it('descarta rutas que escapan del repositorio o nombran un directorio', () => {
    const parsed = parseCommitManifest('## Mensaje\n\nm\n\n## Archivos\n\n- ok.ts\n- ../fuera.ts\n- carpeta/\n');
    expect(parsed?.files).toEqual(['ok.ts']);
  });
});

/**
 * Marcar "la que quede" convertiría el checkbox en "se apretó el botón". Estas
 * pruebas fijan que sólo se marque la tarea de firma declarada, y que un
 * pendiente real siga figurando como pendiente en el archivo.
 */
describe('tarea de firma', () => {
  const tasks = [
    '## 6. Cierre',
    '',
    '- [x] 6.1 `pnpm test` en verde',
    '- [ ] 6.2 Algo que quedó sin hacer de verdad',
    `- [ ] 6.3 ${SIGNATURE_TASK_TEXT}`,
    '',
  ].join('\n');

  it('marca sólo la tarea de firma', () => {
    const { content, marked } = markSignatureTask(tasks);
    expect(marked).toBe(true);
    expect(content).toContain(`- [x] 6.3 ${SIGNATURE_TASK_TEXT}`);
    // El pendiente real sigue pendiente: el archivo no puede afirmar que se hizo.
    expect(content).toContain('- [ ] 6.2 Algo que quedó sin hacer de verdad');
  });

  it('no marca nada cuando el cambio no declara tarea de firma', () => {
    const sinFirma = '- [ ] 1.1 Cualquier cosa\n- [ ] 1.2 Otra\n';
    const { content, marked } = markSignatureTask(sinFirma);
    expect(marked).toBe(false);
    expect(content).toBe(sinFirma);
  });

  it('no vuelve a marcar ni duplica si ya estaba firmada', () => {
    const yaFirmada = `- [x] 6.3 ${SIGNATURE_TASK_TEXT}\n`;
    const { content, marked } = markSignatureTask(yaFirmada);
    expect(marked).toBe(false);
    expect(content).toBe(yaFirmada);
  });
});

describe('rutas deterministas', () => {
  const changed = [
    'openspec/changes/mi-cambio/tasks.md',
    'openspec/changes/otro/proposal.md',
    'openspec/changes/archive/2026-07-31-mi-cambio/tasks.md',
    'openspec/specs/una-capacidad/spec.md',
    'components/algo.tsx',
  ];

  it('los artefactos del cambio entran solos al commit del trabajo', () => {
    expect(deterministicChangePaths('mi-cambio', changed))
      .toEqual(['openspec/changes/mi-cambio/tasks.md']);
  });

  it('el commit del archivado toma destino, origen y specs consolidadas', () => {
    expect(archiveCommitPaths('mi-cambio', changed)).toEqual([
      'openspec/changes/mi-cambio/tasks.md',
      'openspec/changes/archive/2026-07-31-mi-cambio/tasks.md',
      'openspec/specs/una-capacidad/spec.md',
    ]);
    // El cambio ajeno no entra en ninguno de los dos.
    expect(archiveCommitPaths('mi-cambio', changed)).not.toContain('openspec/changes/otro/proposal.md');
  });
});
