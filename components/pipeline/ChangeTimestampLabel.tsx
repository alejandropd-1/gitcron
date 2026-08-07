'use client';

import type { ChangeTimestamp } from '@/types/pipeline';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import styles from './OpenSpecDashboard.module.css';

/** El idioma del producto decide el formato de fecha, no el del sistema. */
const LOCALES: Record<string, string> = { es: 'es-AR', en: 'en-US', zh: 'zh-CN' };

/**
 * Formato local, con hora y sin segundos.
 *
 * La hora es la mitad del dato que faltaba: con la fecha sola no se distingue un
 * cambio abierto hace una hora de uno abierto a la mañana. Los segundos no
 * aportan a esa lectura y sólo alargan la línea.
 */
function formatStamp(iso: string, locale: string): string | null {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString(locale, {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export type ChangeTimestampLabelProps = {
  labelKey: 'pipeline.openspec.stamp.created' | 'pipeline.openspec.stamp.archived';
  stamp: ChangeTimestamp | null | undefined;
};

/**
 * Una marca de tiempo de un cambio, con su fuente declarada.
 *
 * La marca de disco se rotula como "sin confirmar" en vez de mostrarse igual que
 * la de Git: son afirmaciones distintas —la de Git es reproducible en cualquier
 * clon, la del disco se pierde al archivar y al clonar— y quien lee tiene que
 * poder distinguirlas.
 *
 * El `title` declara que la marca de Git es la del commit y no la del momento en
 * que se escribió el archivo. Un cambio empezado a la mañana y confirmado a la
 * noche muestra la noche, y presentarlo como "creado" a secas afirmaría una
 * exactitud que el dato no tiene.
 *
 * Devuelve `null` sin marca: un hueco vacío con la etiqueta puesta se lee como
 * un dato que se perdió, y no tenerlo es un estado legítimo.
 */
export function ChangeTimestampLabel({ labelKey, stamp }: ChangeTimestampLabelProps) {
  const t = useT();
  const lang = useGitStore((state) => state.language);
  if (!stamp) return null;
  const formatted = formatStamp(stamp.at, LOCALES[lang as string] ?? 'es-AR');
  if (!formatted) return null;
  const uncommitted = stamp.source === 'disk';
  return (
    <span
      className={styles.changeStamp}
      data-source={stamp.source}
      title={t(uncommitted ? 'pipeline.openspec.stamp.uncommittedHelp' : 'pipeline.openspec.stamp.committedHelp')}
    >
      <span>{t(labelKey)}</span> {formatted}
      {uncommitted && <em> · {t('pipeline.openspec.stamp.uncommitted')}</em>}
    </span>
  );
}
