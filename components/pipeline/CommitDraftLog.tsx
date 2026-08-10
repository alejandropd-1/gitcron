'use client';

// components/pipeline/CommitDraftLog.tsx
//
// Lo que el modelo va pensando, a la vista mientras lo piensa.
//
// Ale pidió «estar un poco más enterado de lo que está pasando» y el rail
// derecho no mostraba nada durante los 25 a 98 segundos de una redacción. Lo que
// llena esa espera existe: medido, **278 de los 308 cuadros son razonamiento**.
//
// Está en su propio componente y lee de un store externo por un motivo medido,
// no por estilo: llegan ~8 avisos por segundo, y con el estado en el panel eso
// serían ocho re-renderizados por segundo del árbol entero durante un minuto. Es
// el mismo error que ya costó caro con el temporizador de la espera (tarea
// 4.18). Suscribiéndose acá, lo único que se vuelve a dibujar es esto.

import { useEffect, useRef, useSyncExternalStore } from 'react';
import { AlertTriangle, Brain } from 'lucide-react';
import { getDraftLogSnapshot, subscribeDraftLog, REASONING_LIMIT } from '@/lib/commit-draft-log';
import { adviceKeyForStreamError } from '@/lib/stream-error-advice';
import { useGitStore } from '@/lib/git-store';
import { useT } from '@/hooks/use-translation';
import { DraftingThought } from './DraftingThought';
import styles from './OpenSpecDashboard.module.css';

export type CommitDraftLogProps = {
  /**
   * El aviso de la redacción: quién la escribió, qué falló, qué contestó.
   *
   * Vive acá y no en el centro porque decía lo mismo que este bloque ya dice, a
   * dos columnas de distancia —Ale lo marcó viendo el error repetido—. Lo pasa
   * el panel en vez de leerlo de un store porque es estado suyo: cambia una vez
   * por acción, no ocho veces por segundo, así que no hay nada que aislar.
   */
  notice?: string | null;
};

export function CommitDraftLog({ notice }: CommitDraftLogProps) {
  const t = useT();
  // Con selector: sin él, cualquier `set()` del store re-renderiza esto, y este
  // componente se vuelve a dibujar ocho veces por segundo por su cuenta.
  const uiLanguage = useGitStore((state) => state.language);
  const log = useSyncExternalStore(subscribeDraftLog, getDraftLogSnapshot, getDraftLogSnapshot);
  const streamRef = useRef<HTMLPreElement | null>(null);

  // Que se vea siempre lo último, que es lo que se está mirando.
  //
  // Sin suavizado: a ocho actualizaciones por segundo un desplazamiento animado
  // nunca termina el anterior y el texto queda temblando. Y con
  // `prefers-reduced-motion` no habría que animarlo igual.
  useEffect(() => {
    const node = streamRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [log.reasoning, log.content]);

  // Sin redacción y sin aviso no hay nada que decir, y un bloque vacío
  // permanente enseña a saltear el lugar donde después aparece lo que importa.
  // El aviso solo alcanza para abrirlo: cargar o expulsar el modelo deja uno sin
  // que haya habido ninguna redacción.
  if (log.draftId === null && !notice) return null;

  const nothingYet = log.reasoning.length === 0 && log.content.length === 0;

  return (
    <section className={styles.draftLog} aria-label={t('pipeline.openspec.prepare.aiLogTitle')}>
      <h4>
        <Brain size={13} aria-hidden="true" />
        {t('pipeline.openspec.prepare.aiLogTitle')}
        {/* `aria-live` en la etiqueta de estado y no sobre el texto: leer en voz
            alta cada pedazo del razonamiento sería inutilizable con lector de
            pantalla. Lo que se anuncia es que empezó y que terminó. */}
        {/* El estado sólo si hubo una redacción: con un aviso suelto —cargar o
            expulsar el modelo— no hay nada que esté ni en vivo ni terminado. */}
        {log.draftId !== null && (
          <em aria-live="polite">
            {log.streaming
              ? t('pipeline.openspec.prepare.aiLogThinking')
              : t('pipeline.openspec.prepare.aiLogDone')}
          </em>
        )}
      </h4>

      {/* El aviso de la redacción: quién la escribió, o qué falló. Estaba en el
          centro diciendo lo mismo que este bloque, a dos columnas de distancia.
          Va arriba del pensamiento porque es la conclusión, y lo de abajo es
          cómo se llegó.
          Cuando el fallo vino por el stream se calla: el bloque de abajo dice lo
          mismo **y además** el motivo técnico, así que de los dos sobra éste.
          Ale vio los dos juntos. Sigue haciendo falta para todo lo demás —quién
          redactó, «no contestó», un fallo al cargar— que nunca llega por acá. */}
      {notice && !log.error && <p className={styles.draftLogNotice}>{notice}</p>}

      {/* Lo que informó el servidor cuando falló. Va PRIMERO y no al final: si
          la placa se cayó, todo lo de abajo es historia y esto es la noticia.
          El motivo se muestra tal cual lo dio LM Studio —«ErrorDeviceLost»
          identifica el problema— porque reescribirlo a algo más suave dejaría
          sin la única pista que sirve para buscarlo. */}
      {log.error && (
        <div className={styles.draftLogError}>
          <AlertTriangle size={12} aria-hidden="true" />
          <div>
            {/* Qué pasó y qué hacer, primero y en el cuerpo de texto normal. El
                motivo crudo es exacto y no le dice a nadie qué hacer: Ale lo
                marcó viendo «vk::Device::getFenceStatus» en pantalla. Si el
                error no se reconoce no se inventa un consejo —mandar a hacer
                algo que no tiene que ver es peor que no decir nada— y queda
                sólo el detalle. */}
            {adviceKeyForStreamError(log.error) && (
              <strong>{t(`pipeline.openspec.prepare.${adviceKeyForStreamError(log.error)}`)}</strong>
            )}
            {/* El técnico NO se reemplaza: es la única pista con la que se puede
                buscar en el registro de LM Studio o en un foro. */}
            <code>{log.error}</code>
          </div>
        </div>
      )}

      {/* El cuerpo, sólo si hubo una redacción: con un aviso suelto no hay ni
          pensamiento ni respuesta que mostrar, y «Todavía no llegó nada» sobre
          un modelo recién expulsado sería falso. */}
      {log.draftId === null ? null : nothingYet ? (
        /* Mientras no llegó nada, la frase que rota ocupa el lugar donde después
           aparece el texto real. Ale lo pidió: antes las frases estaban debajo
           del campo, en el centro, diciendo lo mismo que este bloque decía acá
           con «Todavía no llegó nada» —dos avisos de lo mismo en dos lugares—.
           El contador de segundos se queda en el centro a propósito: con la
           columna derecha cerrada, es lo único que informa que algo está
           pasando. */
        log.streaming
          ? <DraftingThought active language={uiLanguage} />
          : <p className={styles.railEmpty}>{t('pipeline.openspec.prepare.aiLogWaiting')}</p>
      ) : (
        <>
          {/* Se declara que está recortado. Un texto cortado en silencio hace
              pensar que el modelo empezó por la mitad. */}
          {log.truncated && (
            <p className={styles.draftLogNote}>
              {t('pipeline.openspec.prepare.aiLogTruncated', { limit: REASONING_LIMIT })}
            </p>
          )}
          {/* Sólo si hay algo. Un modelo que no razona —medido en la notebook: 0
              de 23 cuadros— dejaba un recuadro vacío ocupando media columna. */}
          {log.reasoning.length > 0 && (
            <pre ref={streamRef} className={styles.draftLogStream}>{log.reasoning}</pre>
          )}
          {/* La respuesta, aparte del razonamiento: son dos cosas distintas y
              mezclarlas haría imposible ver cuál de las dos terminó. Lo que
              queda en el campo del commit lo sigue decidiendo el resultado, no
              esto: acá se muestra lo que llegó, sin imponerlo en ningún lado. */}
          {log.content.length > 0 && (
            <p className={styles.draftLogAnswer}>
              <strong>{t('pipeline.openspec.prepare.aiLogAnswer')}</strong>
              <span>{log.content}</span>
            </p>
          )}
        </>
      )}

      {/* El conteo de tokens es lo que explica una espera larga: cuánto se fue
          en pensar. Sin él, «tardó 98 segundos» no dice por qué. */}
      {log.usage?.reasoningTokens !== null && log.usage !== null && (
        <p className={styles.draftLogNote}>
          {t('pipeline.openspec.prepare.aiLogTokens', {
            reasoning: log.usage.reasoningTokens ?? 0,
            completion: log.usage.completionTokens ?? 0,
          })}
        </p>
      )}
    </section>
  );
}
