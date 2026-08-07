'use client';

import { useEffect, useState } from 'react';
import { BookOpen, ChevronLeft } from 'lucide-react';
import { useT } from '@/hooks/use-translation';
import { SafeMarkdown } from './SafeMarkdown';
import styles from './OpenSpecDashboard.module.css';

/**
 * Contenido de una especificación consolidada.
 *
 * Lo pide al abrirse y no lo recibe del snapshot: las especificaciones de este
 * repositorio pesan 145 KB en quince archivos, con una sola de 84,9 KB, y el
 * snapshot se rearma en cada refresco que dispara el watcher con cada guardado.
 * Una spec consolidada cambia al archivar un cambio, no al guardar un archivo.
 *
 * La contrapartida asumida es que el contenido puede quedar viejo si alguien
 * archiva mientras está abierto: se relee al volver a abrirlo. Atarlo al watcher
 * sería justamente el costo que este diseño evita.
 */

type LoadState =
  | { kind: 'loading' }
  | { kind: 'ready'; content: string }
  | { kind: 'failed'; reason: string };

export type SpecificationViewerProps = {
  repoPath: string;
  specificationId: string;
  requirements: number | null;
  sourceRef: string;
  onBack: () => void;
};

export function SpecificationViewer({
  repoPath, specificationId, requirements, sourceRef, onBack,
}: SpecificationViewerProps) {
  const t = useT();
  /**
   * Lo cargado va con el identificador al que corresponde, y "cargando" se
   * deriva de que todavía no coincidan.
   *
   * Es lo que evita marcar el estado dentro del efecto, que dispara renders en
   * cascada. Y de paso resuelve el caso de cambiar de especificación mientras la
   * anterior viaja: hasta que no llega la que corresponde, lo que se ve es la
   * carga, nunca el contenido de otra.
   */
  const [loaded, setLoaded] = useState<{ id: string; state: LoadState } | null>(null);
  const state: LoadState = loaded?.id === specificationId ? loaded.state : { kind: 'loading' };

  useEffect(() => {
    let cancelled = false;
    const api = typeof window !== 'undefined' ? window.api : undefined;
    const pending = api?.pipelineReadSpecification
      ? api.pipelineReadSpecification(repoPath, specificationId)
      : Promise.resolve({ success: false as const, error: 'unavailable' });
    void pending.then((result) => {
      if (cancelled) return;
      setLoaded({
        id: specificationId,
        // El motivo real que informó el proceso principal, sin normalizar: "no
        // existe" y "supera el límite" no son el mismo problema.
        state: result?.success
          ? { kind: 'ready', content: result.content }
          : { kind: 'failed', reason: result?.error ?? 'unknown' },
      });
    });
    return () => { cancelled = true; };
  }, [repoPath, specificationId]);

  return (
    <section className={styles.specificationView}>
      <header className={styles.specificationHead}>
        <button type="button" className={styles.backToStart} onClick={onBack}>
          <ChevronLeft size={12} /> {t('pipeline.openspec.start.back')}
        </button>
        <h3>
          <BookOpen size={16} /> {specificationId}
          <span>
            {requirements === null ? '—' : t('pipeline.openspec.requirements', { count: requirements })}
          </span>
        </h3>
        <p title={sourceRef}>{sourceRef}</p>
      </header>

      {/* La reserva de altura evita que la vista salte de una ficha corta a una
          pantalla entera cuando llega el contenido, igual que en los artefactos
          de un archivado. */}
      <div className={styles.specificationBody} data-pending={state.kind === 'loading' || undefined}>
        {state.kind === 'loading' && (
          <p className={styles.archivedPending}>{t('pipeline.revalidating')}</p>
        )}
        {state.kind === 'failed' && (
          <p className={styles.archiveError} role="alert">
            {t('pipeline.openspec.specifications.unreadable', { reason: state.reason })}
          </p>
        )}
        {/* Un archivo vacío es un dato del repositorio, no un fallo: se dice que
            está vacío en vez de dejar el visor en blanco. */}
        {state.kind === 'ready' && state.content.trim() === '' && (
          <p className={styles.archivedPending}>{t('pipeline.openspec.specifications.emptyFile')}</p>
        )}
        {state.kind === 'ready' && state.content.trim() !== '' && (
          <SafeMarkdown content={state.content} />
        )}
      </div>
    </section>
  );
}
