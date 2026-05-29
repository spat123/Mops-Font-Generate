/**
 * Скачивает каталог myskotom.ru, сопоставляет с Google + Fontsource + Fontshare + Fontfabric trial,
 * пишет список шрифтов, которых нет в наших каталогах.
 *
 * Запуск: bun run scripts/build-myskotom-gap-list.ts
 *         npx tsx scripts/build-myskotom-gap-list.ts
 */
import fs from 'fs/promises';
import path from 'path';
import { buildMyskotomCatalogGapReport } from '../utils/myskotomCatalogGap';

const OUT_DIR = path.join(process.cwd(), 'data');
const GAP_PATH = path.join(OUT_DIR, 'myskotom-gap.json');
const REPORT_PATH = path.join(OUT_DIR, 'myskotom-gap-report.json');

async function main() {
  console.log('[myskotom-gap] Загрузка каталога myskotom + наших источников…');
  const report = await buildMyskotomCatalogGapReport({ matchedSampleLimit: 50 });

  await fs.mkdir(OUT_DIR, { recursive: true });

  const gapPayload = {
    generatedAt: report.generatedAt,
    total: report.gapTotal,
    fonts: report.gap,
  };

  await fs.writeFile(GAP_PATH, `${JSON.stringify(gapPayload, null, 2)}\n`, 'utf8');

  const { gap, matchedSample, ...summary } = report;
  await fs.writeFile(REPORT_PATH, `${JSON.stringify({ ...summary, gapCount: gap.length }, null, 2)}\n`, 'utf8');

  console.log('[myskotom-gap] Готово.');
  console.log(`  myskotom: ${report.myskotomTotal}`);
  console.log(`  совпало с нашим каталогом: ${report.matchedTotal}`, report.matchedBySource);
  console.log(`  только в myskotom (gap): ${report.gapTotal}`);
  console.log(`  → ${GAP_PATH}`);
  console.log(`  → ${REPORT_PATH}`);
}

main().catch((e) => {
  console.error('[myskotom-gap] Ошибка:', e);
  process.exit(1);
});
