'use client';

import { useEffect, useRef } from 'react';
import { useGitStore } from '@/lib/git-store';
import {
  type ShortcutId,
  eventToShortcut,
  defaultShortcutsMap,
} from '@/lib/shortcuts';

export type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

/**
 * Register one global keydown listener and dispatch the matching action.
 *
 * Pass an object whose keys are ShortcutId and values are callbacks. The hook
 * reads the user's bindings from the store (with defaults as fallback) and
 * fires the appropriate callback when a matching combo is pressed.
 *
 * Ignored when focus is in an editable element (input, textarea, contenteditable)
 * unless `ignoreInputs: false` is passed.
 */
export const useShortcuts = (handlers: ShortcutHandlers, ignoreInputs = true) => {
  // Keep latest handlers in a ref so the listener never goes stale.
  // Updated in an effect — writing a ref during render breaks with
  // React concurrent rendering (a render can be thrown away or replayed).
  const handlersRef = useRef(handlers);
  useEffect(() => {
    handlersRef.current = handlers;
  });

  const shortcutsPref = useGitStore((s) => s.shortcuts);

  useEffect(() => {
    const defaults = defaultShortcutsMap();
    const onKey = (e: KeyboardEvent) => {
      // Skip when typing in inputs (unless explicitly allowed)
      if (ignoreInputs) {
        const target = e.target as HTMLElement | null;
        if (target) {
          const tag = target.tagName.toLowerCase();
          if (tag === 'input' || tag === 'textarea' || target.isContentEditable) {
            // Exception: Ctrl+Enter still fires from textareas (commit message)
            const combo = eventToShortcut(e);
            const commitBind = shortcutsPref?.commit ?? defaults.commit;
            if (combo !== commitBind) return;
          }
        }
      }

      const combo = eventToShortcut(e);
      if (!combo) return;

      const merged: Record<ShortcutId, string> = { ...defaults, ...(shortcutsPref ?? {}) };
      for (const [id, keys] of Object.entries(merged)) {
        if (keys !== combo) continue;
        const handler = handlersRef.current[id as ShortcutId];
        if (handler) {
          e.preventDefault();
          e.stopPropagation();
          handler();
          return;
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [shortcutsPref, ignoreInputs]);
};
