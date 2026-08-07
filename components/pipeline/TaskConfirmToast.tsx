'use client';

import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle } from 'lucide-react';

/**
 * Confirmación de un cambio de casilla, como toast fijo.
 *
 * Vive fijo respecto de la ventana y no dentro del panel a propósito. Las
 * casillas se tildan recorriendo la lista de tareas con scroll, y la primera
 * versión de esto mostraba la pregunta en el encabezado: tildar la casilla 5.6
 * de un cambio con veintitrés tareas obligaba a bajar hasta ella, hacer clic, y
 * volver a subir hasta arriba de todo para responder.
 *
 * Copia el patrón del toast de decisión de pull —`glass-alert-warning`, ámbar
 * `#f4b942`, `role="alertdialog"`, fijo abajo—, que es el que esta aplicación ya
 * usa cuando necesita una respuesta antes de escribir. No se generalizó aquel
 * componente porque tiene lógica propia por modo y toca un camino de Git que
 * funciona; si aparece un tercer uso del patrón, conviene unificarlo entonces.
 *
 * No lleva temporizador: espera una decisión, así que irse solo sería perder la
 * pregunta. Los toasts que se van solos son los de éxito.
 */
export type TaskConfirmToastProps = {
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function TaskConfirmToast({
  title, description, confirmLabel, cancelLabel, onConfirm, onCancel,
}: TaskConfirmToastProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-4 z-[300] flex flex-col items-center gap-2 px-4"
      role="region"
    >
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          role="alertdialog"
          aria-modal="false"
          className="pointer-events-auto px-4 py-3 glass-alert-warning text-text-primary rounded-lg shadow-2xl flex items-center gap-3 w-[min(calc(100vw-2rem),760px)]"
        >
          <AlertCircle size={20} className="shrink-0 text-[#f4b942]" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#ffd98a] leading-tight">{title}</p>
            <p className="text-xs text-text-secondary mt-0.5 leading-snug">{description}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onConfirm}
              className="px-3 py-1.5 text-xs font-bold bg-[#f4b942]/15 hover:bg-[#f4b942]/25 text-[#ffd98a] rounded transition-colors whitespace-nowrap"
            >
              {confirmLabel}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-bold bg-text-secondary/10 hover:bg-text-secondary/20 text-text-primary rounded transition-colors whitespace-nowrap"
            >
              {cancelLabel}
            </button>
          </div>
          {/* Sin cruz de descarte: "Cancelar" ya está entre los botones, y dos
              controles con el mismo texto y el mismo efecto es lo que la guía de
              este panel prohíbe. El toast de pull sí la lleva porque ahí
              descartar no es ninguna de sus acciones. */}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
