/**
 * Resumidor puro de notas de versión de GitHub Releases (Markdown).
 */

export interface ReleaseNotesSummary {
  title: string | null;
  summary: string | null;
  bullets: string[];
}

export function summarizeReleaseNotes(
  rawText: string | null | undefined,
  maxBullets = 4,
): ReleaseNotesSummary {
  if (!rawText || !rawText.trim()) {
    return { title: null, summary: null, bullets: [] };
  }

  const lines = rawText.split(/\r?\n/);

  // 1. title = texto del primer encabezado `## …` sin los `#`
  let title: string | null = null;
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      title = trimmed.replace(/^#+\s*/, '').trim();
      break;
    }
  }

  // 2. summary = primer párrafo no vacío que no sea encabezado ni viñeta
  let summary: string | null = null;
  const rawParagraphs = rawText.split(/\r?\n\s*\r?\n/);
  for (const block of rawParagraphs) {
    const trimmedBlock = block.trim();
    if (!trimmedBlock) continue;
    const firstLine = trimmedBlock.split(/\r?\n/)[0].trim();
    if (
      firstLine.startsWith('#') ||
      firstLine.startsWith('- ') ||
      firstLine.startsWith('* ') ||
      firstLine.startsWith('+ ') ||
      firstLine.startsWith('**Full Changelog') ||
      firstLine.startsWith('Full Changelog')
    ) {
      continue;
    }
    summary = trimmedBlock.replace(/\s+/g, ' ').trim();
    break;
  }

  // 3. bullets = las primeras maxBullets líneas que empiezan con `- ` (o `* ` / `+ `),
  // quitando `**`, backticks y el separador ` - ` entre título y explicación se conserva como « — »;
  // se ignoran las líneas que empiezan con `**Full Changelog**`.
  const bullets: string[] = [];
  if (maxBullets > 0) {
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      if (!trimmed.startsWith('- ') && !trimmed.startsWith('* ') && !trimmed.startsWith('+ ')) {
        continue;
      }
      let bulletContent = trimmed.replace(/^[-*+]\s+/, '').trim();
      if (
        bulletContent.startsWith('**Full Changelog') ||
        bulletContent.startsWith('Full Changelog')
      ) {
        continue;
      }
      bulletContent = bulletContent.replace(/\s+-\s+/, ' \u2014 ');
      bulletContent = bulletContent.replaceAll('**', '').replaceAll('`', '').trim();

      if (bulletContent) {
        bullets.push(bulletContent);
        if (bullets.length >= maxBullets) {
          break;
        }
      }
    }
  }

  return { title, summary, bullets };
}
