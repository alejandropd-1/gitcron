'use client';

// Preference actions: idioma, tema, fuente, carpeta default, auto-fetch,
// notificaciones, shortcuts y su hidratación inicial desde el storage cifrado.
// Sub-hook de useGitActions — no usar directo.

import { useGitStore, type FontSize, type Theme } from '@/lib/git-store';
import type { Lang } from '@/lib/i18n';

const bootstrapLanguage = async () => {
  if (!window.api) return;
  const lr = await window.api.storageGet('language');
  if (lr.success && (lr.data === 'es' || lr.data === 'en')) {
    useGitStore.getState().setLanguage(lr.data as Lang);
  }
};

const bootstrapFontSize = async () => {
  if (!window.api) return;
  const fr = await window.api.storageGet('fontSize');
  if (fr.success && (fr.data === 'compact' || fr.data === 'normal' || fr.data === 'large')) {
    useGitStore.getState().setFontSize(fr.data as FontSize);
  }
};

const bootstrapDefaultFolder = async () => {
  if (!window.api) return;
  const df = await window.api.storageGet('defaultFolder');
  if (df.success && typeof df.data === 'string' && df.data.length > 0) {
    useGitStore.getState().setDefaultFolder(df.data);
  }
};

const bootstrapAutoFetch = async () => {
  if (!window.api) return;
  const af = await window.api.storageGet('autoFetch');
  if (af.success && typeof af.data === 'string') {
    try {
      const parsed = JSON.parse(af.data) as { enabled?: unknown; intervalMinutes?: unknown };
      if (typeof parsed.enabled === 'boolean') {
        useGitStore.getState().setAutoFetchEnabled(parsed.enabled);
      }
      if (typeof parsed.intervalMinutes === 'number' && parsed.intervalMinutes > 0) {
        useGitStore.getState().setAutoFetchIntervalMinutes(parsed.intervalMinutes);
      }
    } catch { /* ignore corrupted prefs */ }
  }
};

const bootstrapOsNotifications = async () => {
  if (!window.api) return;
  const osN = await window.api.storageGet('osNotifications');
  if (osN.success && typeof osN.data === 'string') {
    useGitStore.getState().setOsNotificationsEnabled(osN.data === '1');
  }
};

const bootstrapShortcuts = async () => {
  if (!window.api) return;
  const sc = await window.api.storageGet('shortcuts');
  if (sc.success && typeof sc.data === 'string') {
    try {
      const parsed = JSON.parse(sc.data) as Record<string, string>;
      if (parsed && typeof parsed === 'object') {
        useGitStore.getState().setShortcuts(parsed);
      }
    } catch { /* ignore corrupted prefs */ }
  }
};

const bootstrapTheme = async () => {
  if (!window.api) return;
  const th = await window.api.storageGet('theme');
  if (th.success && (th.data === 'dark' || th.data === 'light')) {
    useGitStore.getState().setTheme(th.data as Theme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(th.data);
    }
  }
};

const bootstrapCronometric = async () => {
  if (!window.api) return;
  const ec = await window.api.storageGet('enableCronometric');
  if (ec.success && typeof ec.data === 'string') {
    useGitStore.getState().setEnableCronometric(ec.data === '1');
  }
};

const bootstrapCartography = async () => {
  if (!window.api) return;
  const ec = await window.api.storageGet('enableCartography');
  if (ec.success && typeof ec.data === 'string') {
    useGitStore.getState().setEnableCartography(ec.data === '1');
  }
};

export const usePreferenceActions = () => {
  const {
    setLanguage,
    setFontSize,
    setDefaultFolder,
  } = useGitStore();

  /** Change UI language and persist to encrypted storage. */
  const changeLanguage = async (lang: Lang) => {
    setLanguage(lang);
    if (window.api) {
      await window.api.storageSet('language', lang).catch(() => {});
    }
  };

  /** Change UI font size and persist to encrypted storage. */
  const changeFontSize = async (size: FontSize) => {
    setFontSize(size);
    if (window.api) {
      await window.api.storageSet('fontSize', size).catch(() => {});
    }
  };

  /** Update auto-fetch preferences (enabled/interval) and persist them. */
  const setAutoFetchPrefs = async (enabled: boolean, intervalMinutes: number) => {
    useGitStore.getState().setAutoFetchEnabled(enabled);
    useGitStore.getState().setAutoFetchIntervalMinutes(intervalMinutes);
    if (!window.api) return;
    await window.api.storageSet('autoFetch', JSON.stringify({ enabled, intervalMinutes })).catch(() => {});
  };

  /** Toggle OS-level notifications globally. Persists to encrypted storage. */
  const setOsNotifications = async (enabled: boolean) => {
    useGitStore.getState().setOsNotificationsEnabled(enabled);
    if (!window.api) return;
    await window.api.storageSet('osNotifications', enabled ? '1' : '0').catch(() => {});
  };

  /** Rebind a single shortcut. Persists the full map. */
  const rebindShortcut = async (id: string, keys: string) => {
    useGitStore.getState().updateShortcut(id, keys);
    if (!window.api) return;
    const all = useGitStore.getState().shortcuts;
    await window.api.storageSet('shortcuts', JSON.stringify(all)).catch(() => {});
  };

  /** Reset all shortcuts to defaults. Removes the persisted override. */
  const resetShortcutsToDefaults = async () => {
    useGitStore.getState().resetShortcuts();
    if (!window.api) return;
    await window.api.storageDelete('shortcuts').catch(() => {});
  };

  /** Change theme and persist. Also applies it to the <html> element. */
  const changeTheme = async (theme: Theme) => {
    useGitStore.getState().setTheme(theme);
    if (typeof document !== 'undefined') {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(theme);
    }
    if (!window.api) return;
    await window.api.storageSet('theme', theme).catch(() => {});
  };

  /** Toggle the Cronometric advanced timeline view globally. */
  const changeEnableCronometric = async (enabled: boolean) => {
    useGitStore.getState().setEnableCronometric(enabled);
    if (!window.api) return;
    await window.api.storageSet('enableCronometric', enabled ? '1' : '0').catch(() => {});
  };

  /** Toggle the Cartography repo-understanding view globally. */
  const changeEnableCartography = async (enabled: boolean) => {
    useGitStore.getState().setEnableCartography(enabled);
    if (!window.api) return;
    await window.api.storageSet('enableCartography', enabled ? '1' : '0').catch(() => {});
  };

  /** Change default folder for open/clone dialogs and persist. */
  const changeDefaultFolder = async (folder: string | null) => {
    setDefaultFolder(folder);
    if (!window.api) return;
    if (folder) {
      await window.api.storageSet('defaultFolder', folder).catch(() => {});
    } else {
      await window.api.storageDelete('defaultFolder').catch(() => {});
    }
  };

  /** Open a folder picker, save the choice as the new default. */
  const pickDefaultFolder = async () => {
    if (!window.api) return;
    const current = useGitStore.getState().defaultFolder;
    const r = await window.api.pickFolder('Seleccionar carpeta default', current ?? undefined);
    if (r.success && r.data) {
      await changeDefaultFolder(r.data);
    }
  };

  /** Hydrate language pref + GitHub auth from storage on mount. */
  const bootstrapPreferences = async () => {
    if (!window.api) return;
    await bootstrapLanguage();
    await bootstrapFontSize();
    await bootstrapDefaultFolder();
    await bootstrapAutoFetch();
    await bootstrapOsNotifications();
    await bootstrapShortcuts();
    await bootstrapTheme();
    await bootstrapCronometric();
    await bootstrapCartography();
  };

  return {
    changeLanguage,
    changeFontSize,
    changeDefaultFolder,
    pickDefaultFolder,
    setAutoFetchPrefs,
    setOsNotifications,
    rebindShortcut,
    resetShortcutsToDefaults,
    changeTheme,
    changeEnableCronometric,
    changeEnableCartography,
    bootstrapPreferences,
  };
};
