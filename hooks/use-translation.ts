'use client';

import { useCallback } from 'react';
import { useGitStore } from '@/lib/git-store';
import { translate, type Lang } from '@/lib/i18n';

/**
 * Returns a stable translator `t(key, vars?)` bound to the current language.
 * Components re-render when the user changes language because they read
 * `language` from the Zustand store.
 */
export function useT() {
  const lang = useGitStore((s) => s.language);
  return useCallback(
    (key: string, vars?: Record<string, string | number>) => translate(key, lang as Lang, vars),
    [lang],
  );
}

/**
 * Imperative translate function that reads the current language directly from
 * the store. Useful inside async handlers where calling a hook isn't possible.
 */
export function tNow(key: string, vars?: Record<string, string | number>): string {
  const lang = useGitStore.getState().language as Lang;
  return translate(key, lang, vars);
}
