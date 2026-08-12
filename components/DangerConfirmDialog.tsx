'use client';

import type { ReactNode } from 'react';
import { Trash2 } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

type DangerConfirmDialogProps = {
  open: boolean;
  title: ReactNode;
  message: ReactNode;
  confirmLabel: ReactNode;
  cancelLabel: ReactNode;
  disabled?: boolean;
  warning?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void | Promise<void>;
};

export function DangerConfirmDialog({
  open,
  title,
  message,
  warning,
  confirmLabel,
  cancelLabel,
  disabled,
  onCancel,
  onConfirm,
}: DangerConfirmDialogProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-[100]"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="glass-overlay rounded-xl shadow-2xl p-6 w-[540px]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3 mb-4">
              <Trash2 size={20} className="text-error shrink-0 mt-0.5" />
              {/* `min-w-0` es lo que permite que este bloque se encoja dentro
                  del flex: sin eso su ancho mínimo es el de su contenido más
                  largo, y una ruta sin espacios —la de un worktree, por ejemplo—
                  empuja el texto fuera del recuadro. Ale lo vio con una ruta de
                  `~/.local/share/opencode/worktree/…`.
                  `overflow-wrap: anywhere` corta esa ruta donde haga falta: no
                  tiene espacios ni guiones donde el navegador pueda partirla. */}
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-text-primary mb-1">{title}</h3>
                <p className="text-sm text-text-secondary leading-relaxed select-text [overflow-wrap:anywhere]">{message}</p>
                {warning && (
                  <p className="text-xs text-git-mod mt-2 leading-relaxed [overflow-wrap:anywhere]">{warning}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onCancel} className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary">
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={disabled}
                className="px-4 py-2 bg-error hover:bg-[#ffa8a3] disabled:opacity-50 text-[#490006] text-sm font-bold rounded"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
