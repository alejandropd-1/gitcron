'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import type { OpenSpecToolEvidence } from '@/types/pipeline';
import { useT } from '@/hooks/use-translation';
import styles from './OpenSpecDashboard.module.css';

/**
 * Lo que le falta al repositorio, separado en dos piezas por lo que hace cada una.
 *
 * `OpenSpecReadiness` es el **aviso**: una línea arriba de la guía, que aparece
 * sólo cuando falta algo. Interrumpe, y por eso no puede vivir detrás de una
 * solapa: lo que hay que ver antes de empezar no se puede pedir que lo vayan a
 * buscar.
 *
 * `OpenSpecToolList` es la **referencia**: la lista completa, en el rail. Se
 * consulta cuando se quiere, incluye las que están bien, y no urge.
 *
 * Los dos estados que muestran eran invisibles hasta ahora. No tener `openspec/`
 * se ve igual que un repositorio recién empezado. Y una herramienta presente sin
 * sus skills convive con un repositorio correctamente inicializado: su ejecutor
 * no sabe que existe el canal de instrucciones, así que trabaja sin el método y
 * sin avisar. Pasó con Antigravity en `odontoPau`.
 */

export type OpenSpecReadinessProps = {
  present?: boolean;
  tools?: OpenSpecToolEvidence[];
  /** Lleva al detalle, que vive en el rail. */
  onShowDetail?: () => void;
};

export function OpenSpecReadiness({ present, tools, onShowDetail }: OpenSpecReadinessProps) {
  const t = useT();
  // `undefined` es un snapshot de una versión anterior que no trae el dato. No
  // saber no es «no hay»: sin el dato no se afirma nada.
  if (present === undefined) return null;

  const pending = (tools ?? []).filter((tool) => !tool.configured);
  if (present && pending.length === 0) return null;

  return (
    <section className={styles.readiness} data-kind={present ? 'tools' : 'missing'}>
      <AlertCircle size={15} aria-hidden="true" />
      <p>
        <strong>
          {present
            ? t('pipeline.openspec.readiness.toolsTitle', { count: pending.length })
            : t('pipeline.openspec.readiness.missingTitle')}
        </strong>
        {' '}
        {present
          ? t('pipeline.openspec.readiness.toolsHelp')
          : t('pipeline.openspec.readiness.missingHelp')}
      </p>
      {present && onShowDetail && (
        <button type="button" className={styles.readinessLink} onClick={onShowDetail}>
          {t('pipeline.openspec.readiness.seeDetail')}
        </button>
      )}
    </section>
  );
}

export type OpenSpecToolListProps = {
  present?: boolean;
  tools?: OpenSpecToolEvidence[];
};

export function OpenSpecToolList({ present, tools }: OpenSpecToolListProps) {
  const t = useT();
  if (present === undefined) return null;

  if (!present) {
    return <p className={styles.railEmpty}>{t('pipeline.openspec.readiness.missingTitle')}</p>;
  }

  const list = tools ?? [];
  if (list.length === 0) {
    return <p className={styles.railEmpty}>{t('pipeline.openspec.rail.noTools')}</p>;
  }

  return (
    <>
      {/* Las configuradas también se listan: el contraste es lo que hace legible
          lo que falta, y sin ellas el rail estaría vacío casi siempre. */}
      <ul className={styles.readinessList}>
        {list.map((tool) => (
          <li key={tool.toolId} data-configured={tool.configured}>
            {tool.configured
              ? <CheckCircle2 size={13} aria-hidden="true" />
              : <AlertCircle size={13} aria-hidden="true" />}
            <strong>{tool.label}</strong>
            <code>{tool.directory}</code>
            <em>
              {tool.configured
                ? t('pipeline.openspec.readiness.configured')
                : t('pipeline.openspec.readiness.notConfigured')}
            </em>
          </li>
        ))}
      </ul>
      <p className={styles.railScope}>{t('pipeline.openspec.rail.toolsHelp')}</p>
    </>
  );
}
