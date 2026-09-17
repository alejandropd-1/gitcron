import { describe, expect, it } from 'vitest';
import { summarizeReleaseNotes } from '../release-notes-summary';

describe('summarizeReleaseNotes', () => {
  const V1_13_0_FIXTURE = `## What's New in v1.13.0

Archive and the delta parser stop quietly changing or dropping what you wrote, and apply now tells you when a change has no specs.

### New

- **Apply flags a change with no delta specs** - \`openspec instructions apply\` used to report a change as ready whenever its tasks existed, even with no spec deltas at all, which is the state \`openspec validate\` rejects. It now warns in both text and \`--json\`, and names both ways out: write the specs, or declare \`skip_specs: true\`.

### Improved

- **Explore finds your existing specs** - Generated guidance never named \`openspec list --specs\`, so an agent asked to read the current specs enumerated in-flight changes instead and reported the step done against the wrong thing. Explore now lists the spec inventory beside the change list, and reads a capability with the store-aware command.
- **Init and update name the workflows your profile left out** - A \`/opsx:\` command that was never installed used to read as a broken setup. Both commands now say which workflows are missing and how to add them.
- **Propose reads project context before planning** - Context is loaded from the selected project or store root before any planning decision. In a directory with no OpenSpec root, propose stops without writing and offers to initialize rather than creating one silently.

**Full Changelog**: https://github.com/Fission-AI/OpenSpec/compare/v1.12.0...v1.13.0`;

  it('extrae título, resumen y 4 viñetas formateadas del texto real de la v1.13.0', () => {
    const result = summarizeReleaseNotes(V1_13_0_FIXTURE);

    expect(result.title).toBe("What's New in v1.13.0");
    expect(result.summary).toBe(
      'Archive and the delta parser stop quietly changing or dropping what you wrote, and apply now tells you when a change has no specs.',
    );
    expect(result.bullets).toHaveLength(4);
    expect(result.bullets[0]).toMatch(
      /^Apply flags a change with no delta specs — openspec instructions apply used to/,
    );
    expect(result.bullets[0]).toContain('—');
    expect(result.bullets[0]).not.toContain('**');
    expect(result.bullets[0]).not.toContain('`');
    for (const bullet of result.bullets) {
      expect(bullet).not.toContain('Full Changelog');
    }
  });

  it('respeta maxBullets = 2', () => {
    const result = summarizeReleaseNotes(V1_13_0_FIXTURE, 2);

    expect(result.bullets).toHaveLength(2);
    expect(result.bullets[0]).toMatch(
      /^Apply flags a change with no delta specs — openspec instructions apply used to/,
    );
  });

  it('devuelve estructura vacía ante null o undefined o cadena vacía', () => {
    expect(summarizeReleaseNotes(null)).toEqual({
      title: null,
      summary: null,
      bullets: [],
    });
    expect(summarizeReleaseNotes(undefined)).toEqual({
      title: null,
      summary: null,
      bullets: [],
    });
    expect(summarizeReleaseNotes('   ')).toEqual({
      title: null,
      summary: null,
      bullets: [],
    });
  });

  it('devuelve bullets vacío cuando el texto no contiene viñetas', () => {
    const textWithoutBullets = `## Simple Release

Only a summary paragraph with no bullet items included.`;
    const result = summarizeReleaseNotes(textWithoutBullets);

    expect(result.title).toBe('Simple Release');
    expect(result.summary).toBe('Only a summary paragraph with no bullet items included.');
    expect(result.bullets).toEqual([]);
  });

  it('nunca incluye la línea **Full Changelog** entre las viñetas', () => {
    const textWithChangelogBullet = `## Version 2.0.0

A major milestone release.

- Feature A - details here
- **Full Changelog**: https://github.com/org/repo/compare/v1.0...v2.0`;

    const result = summarizeReleaseNotes(textWithChangelogBullet);
    expect(result.bullets).toHaveLength(1);
    expect(result.bullets[0]).toBe('Feature A — details here');
    for (const bullet of result.bullets) {
      expect(bullet).not.toContain('Full Changelog');
    }
  });
});
