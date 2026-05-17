import { describe, it, expect } from 'vitest';
import {
  eventToShortcut,
  formatShortcut,
  defaultShortcutsMap,
  DEFAULT_SHORTCUTS,
} from '../shortcuts';

function makeEvent(key: string, mods: { ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean } = {}): KeyboardEvent {
  return {
    key,
    ctrlKey: !!mods.ctrl,
    shiftKey: !!mods.shift,
    altKey: !!mods.alt,
    metaKey: !!mods.meta,
  } as KeyboardEvent;
}

describe('eventToShortcut', () => {
  it('returns null for modifier-only events', () => {
    expect(eventToShortcut(makeEvent('Control'))).toBeNull();
    expect(eventToShortcut(makeEvent('Shift'))).toBeNull();
    expect(eventToShortcut(makeEvent('Alt'))).toBeNull();
    expect(eventToShortcut(makeEvent('Meta'))).toBeNull();
  });

  it('uppercases letter keys', () => {
    expect(eventToShortcut(makeEvent('p', { ctrl: true }))).toBe('Ctrl+P');
    expect(eventToShortcut(makeEvent('b', { ctrl: true }))).toBe('Ctrl+B');
  });

  it('includes all active modifiers in canonical order', () => {
    expect(eventToShortcut(makeEvent('p', { ctrl: true, shift: true }))).toBe('Ctrl+Shift+P');
    expect(eventToShortcut(makeEvent('F', { ctrl: true, alt: true }))).toBe('Ctrl+Alt+F');
  });

  it('handles special keys', () => {
    expect(eventToShortcut(makeEvent('Enter', { ctrl: true }))).toBe('Ctrl+Enter');
    expect(eventToShortcut(makeEvent('F1'))).toBe('F1');
    expect(eventToShortcut(makeEvent(' ', { ctrl: true }))).toBe('Ctrl+Space');
  });

  it('handles bare letter without modifiers', () => {
    expect(eventToShortcut(makeEvent('A'))).toBe('A');
  });
});

describe('formatShortcut', () => {
  it('joins parts with " + "', () => {
    expect(formatShortcut('Ctrl+P')).toBe('Ctrl + P');
    expect(formatShortcut('Ctrl+Shift+P')).toBe('Ctrl + Shift + P');
    expect(formatShortcut('F1')).toBe('F1');
  });
});

describe('defaultShortcutsMap', () => {
  it('returns a map with all DEFAULT_SHORTCUTS ids', () => {
    const map = defaultShortcutsMap();
    for (const s of DEFAULT_SHORTCUTS) {
      expect(map[s.id]).toBe(s.defaultKeys);
    }
  });

  it('has the expected default for push', () => {
    expect(defaultShortcutsMap().push).toBe('Ctrl+P');
  });

  it('has the expected default for commit', () => {
    expect(defaultShortcutsMap().commit).toBe('Ctrl+Enter');
  });
});
