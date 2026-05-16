'use client';

/**
 * Lightweight wrapper around the browser/Electron Notification API.
 *
 * Usage:
 *   await notify('Push completed', 'main → origin/main');
 *
 * The function:
 *   - Returns early if Notifications are not supported by the runtime.
 *   - Asks for permission the first time it's called and silently no-ops if the
 *     user denied it. We don't spam permission prompts on subsequent calls.
 *   - Reads the global `osNotificationsEnabled` from the Zustand store so the
 *     Settings toggle can disable all notifications at once.
 */

import { useGitStore } from './git-store';

let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  if (permissionRequested) return false;
  permissionRequested = true;
  try {
    const result = await Notification.requestPermission();
    return result === 'granted';
  } catch {
    return false;
  }
}

export interface NotifyOptions {
  /** Body text shown below the title. */
  body?: string;
  /** Custom icon path. Defaults to the app icon. */
  icon?: string;
  /** Don't play the system notification sound. Default: false. */
  silent?: boolean;
  /** Auto-focus the Electron window when the user clicks the notification. */
  focusOnClick?: boolean;
}

export async function notify(title: string, options?: NotifyOptions): Promise<void> {
  // Honor the user's global toggle in Settings.
  const enabled = useGitStore.getState().osNotificationsEnabled;
  if (!enabled) return;

  const granted = await ensurePermission();
  if (!granted) return;

  try {
    const n = new Notification(title, {
      body: options?.body,
      icon: options?.icon,
      silent: options?.silent ?? false,
    });
    if (options?.focusOnClick !== false) {
      n.onclick = () => {
        try {
          window.focus();
        } catch {
          /* ignore */
        }
      };
    }
  } catch {
    /* swallow — Electron may refuse if the window is destroyed */
  }
}

