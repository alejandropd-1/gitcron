/**
 * Central keyboard shortcut system.
 *
 * Shortcuts are stored as a normalized string (e.g. "Ctrl+Shift+P") and matched
 * against KeyboardEvents. Users can rebind them in Settings; the result is
 * persisted in safeStorage as `shortcuts` (JSON: { [id]: keys }).
 *
 * IDs are stable. Default bindings come from `DEFAULT_SHORTCUTS`.
 */

export type ShortcutId =
  | 'commit'
  | 'push'
  | 'pull'
  | 'newBranch'
  | 'search'
  | 'fetchNow'
  | 'settings'
  | 'help'
  | 'closeRepo'
  | 'nextRepo'
  | 'prevRepo'
  | 'graphTab'
  | 'historyTab'
  | 'commitTab';

export interface ShortcutDef {
  id: ShortcutId;
  /** Default key combo as normalized string */
  defaultKeys: string;
  /** i18n key for the human-readable description */
  descriptionKey: string;
}

export const DEFAULT_SHORTCUTS: ShortcutDef[] = [
  { id: 'commit',      defaultKeys: 'Ctrl+Enter',       descriptionKey: 'shortcuts.commit' },
  { id: 'push',        defaultKeys: 'Ctrl+P',           descriptionKey: 'shortcuts.push' },
  { id: 'pull',        defaultKeys: 'Ctrl+Shift+P',     descriptionKey: 'shortcuts.pull' },
  { id: 'newBranch',   defaultKeys: 'Ctrl+B',           descriptionKey: 'shortcuts.newBranch' },
  { id: 'search',      defaultKeys: 'Ctrl+Alt+F',       descriptionKey: 'shortcuts.search' },
  { id: 'fetchNow',    defaultKeys: 'Ctrl+R',           descriptionKey: 'shortcuts.fetchNow' },
  { id: 'settings',    defaultKeys: 'Ctrl+,',           descriptionKey: 'shortcuts.settings' },
  { id: 'help',        defaultKeys: 'F1',               descriptionKey: 'shortcuts.help' },
  { id: 'closeRepo',   defaultKeys: 'Ctrl+W',           descriptionKey: 'shortcuts.closeRepo' },
  { id: 'nextRepo',    defaultKeys: 'Ctrl+Tab',         descriptionKey: 'shortcuts.nextRepo' },
  { id: 'prevRepo',    defaultKeys: 'Ctrl+Shift+Tab',   descriptionKey: 'shortcuts.prevRepo' },
  { id: 'graphTab',    defaultKeys: 'Ctrl+G',           descriptionKey: 'shortcuts.graphTab' },
  { id: 'historyTab',  defaultKeys: 'Ctrl+H',           descriptionKey: 'shortcuts.historyTab' },
  { id: 'commitTab',   defaultKeys: 'Ctrl+Shift+C',     descriptionKey: 'shortcuts.commitTab' },
];

export function defaultShortcutsMap(): Record<ShortcutId, string> {
  const out = {} as Record<ShortcutId, string>;
  for (const s of DEFAULT_SHORTCUTS) out[s.id] = s.defaultKeys;
  return out;
}

/**
 * Normalize a key combo into a stable string form.
 * Order: Ctrl, Shift, Alt, Meta, then the main key.
 * Letter keys are uppercase; symbol keys use their literal char.
 */
export function normalizeKeys(parts: string[]): string {
  const set = new Set(parts.map((p) => p.trim()));
  const result: string[] = [];
  if (set.has('Ctrl') || set.has('Control')) result.push('Ctrl');
  if (set.has('Shift')) result.push('Shift');
  if (set.has('Alt')) result.push('Alt');
  if (set.has('Meta') || set.has('Cmd') || set.has('Command')) result.push('Meta');

  // Find the main key (anything not a modifier)
  for (const p of set) {
    if (['Ctrl', 'Control', 'Shift', 'Alt', 'Meta', 'Cmd', 'Command'].includes(p)) continue;
    const key = p.length === 1 ? p.toUpperCase() : p;
    result.push(key);
    break;
  }
  return result.join('+');
}

/**
 * Convert a browser KeyboardEvent into a normalized shortcut string.
 * Returns null if only modifiers are pressed.
 */
export function eventToShortcut(e: KeyboardEvent): string | null {
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  if (e.metaKey) parts.push('Meta');

  const k = e.key;
  // Ignore modifier-only events
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(k)) return null;

  let mainKey: string;
  if (k === ' ') mainKey = 'Space';
  else if (k.length === 1) mainKey = k.toUpperCase();
  else mainKey = k; // 'Enter', 'Tab', 'Escape', 'F1', '...'
  parts.push(mainKey);
  return parts.join('+');
}

/** Pretty-print for UI: "Ctrl + Shift + P" */
export function formatShortcut(keys: string): string {
  return keys.split('+').join(' + ');
}

/**
 * Check if a KeyboardEvent matches a shortcut string.
 */
export function matchesShortcut(e: KeyboardEvent, shortcut: string): boolean {
  const actual = eventToShortcut(e);
  if (!actual) return false;
  return actual === shortcut;
}
