import { INDIAN_STATES } from '@krama/types';
import { writeFile } from 'node:fs/promises';
import path from 'node:path';
import { INDIA_GOVERNMENT_2026 } from '../services/holidays/indiaGovernment2026';
import { parseOfficeHolidayCalendar } from '../services/holidays/officeHolidayCalendar';
import { validHolidayDate, type IndianHolidayDataset } from '../services/holidays/indianHolidayData';

async function main() {
  const dataset: IndianHolidayDataset = { year: 2026, reviewedOn: '2026-10-07', regions: { ...INDIA_GOVERNMENT_2026 } };
  const locations = INDIAN_STATES.filter(state => !dataset.regions[state.code]);
  let next = 0;
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (next < locations.length) {
      const state = locations[next++];
      if (!state) break;
      const slug = state.name.toLowerCase().replace(/ /g, '-');
      const sourceUrl = `https://www.officeholidays.com/ics-all/india/${slug}`;
      const response = await fetch(sourceUrl, { signal: AbortSignal.timeout(20000) });
      if (!response.ok) throw new Error(`Calendar unavailable: ${state.code} (${response.status})`);
      const holidays = parseOfficeHolidayCalendar(await response.text(), state.name, 2026);
      dataset.regions[state.code] = { name: state.name, sourceUrl, holidays };
      console.log(`${state.code}: ${holidays.length} dated entries`);
    }
  }));
  for (const state of INDIAN_STATES) {
    const calendar = dataset.regions[state.code];
    if (!calendar || !calendar.holidays.some(h => h.kind === 'PUBLIC') || calendar.holidays.some(h => !validHolidayDate(h.date, 2026))) {
      throw new Error(`Invalid or missing regional calendar: ${state.code}`);
    }
  }
  const ordered = Object.fromEntries(INDIAN_STATES.map(state => [state.code, dataset.regions[state.code]]));
  const output = path.resolve(__dirname, '../services/holidays/data/india2026.ts');
  await writeFile(output, `// Published annual calendar snapshot. Refresh with holidays:data:refresh.\nimport type { IndianHolidayDataset } from '../indianHolidayData';\nexport const INDIA_2026: IndianHolidayDataset = ${JSON.stringify({ ...dataset, regions: ordered }, null, 2)};\n`);
  console.log('Validated and wrote calendars for all 36 states and union territories.');
}

main().catch(error => { console.error(error instanceof Error ? error.message : 'Calendar refresh failed'); process.exitCode = 1; });
