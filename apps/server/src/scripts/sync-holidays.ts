import 'dotenv/config';
import { INDIAN_STATES } from '@krama/types';
import { prisma } from '../prisma';
import { HolidaySyncService } from '../services/holidays/HolidaySyncService';

async function main() {
  const args = process.argv.slice(2);
  const value = (flag: string, fallback: string) => {
    const index = args.indexOf(flag);
    if (index < 0) return fallback;
    const next = args[index + 1];
    if (!next || next.startsWith('--')) throw new Error(`${flag} requires a value`);
    return next;
  };
  const country = value('--country', 'IN').toUpperCase();
  const region = value('--region', '').toUpperCase();
  const yearText = value('--year', String(new Date().getFullYear()));
  const year = Number(yearText);
  const allRegions = args.includes('--all-regions');
  if (!/^[A-Z]{2}$/.test(country) || !/^\d{4}$/.test(yearText) || year < 1900 || year > 2100) {
    throw new Error('Use a two-letter country code and a year between 1900 and 2100.');
  }
  if (allRegions && (country !== 'IN' || region)) throw new Error('--all-regions supports India; omit --region.');
  if (country === 'IN' && region && !INDIAN_STATES.some(state => state.code === region)) {
    throw new Error('Unknown Indian state or union territory code.');
  }
  const syncService = new HolidaySyncService();
  const locations = allRegions
    ? [{ code: '', name: 'National' }, ...INDIAN_STATES]
    : [{ code: region, name: region || 'National' }];
  console.log(`Checking holiday coverage for ${country}, ${year} (${locations.length} locations)...`);
  let next = 0;
  const missing: string[] = [];
  await Promise.all(Array.from({ length: Math.min(4, locations.length) }, async () => {
    while (next < locations.length) {
      const location = locations[next++];
      if (!location) break;
      const result = await syncService.ensureHolidays({ countryCode: country, regionCode: location.code || null, year }, { refresh: true });
      if (result.length === 0) missing.push(location.name);
      console.log(`${location.name}: ${result.length > 0 ? `${result.length} cached holidays` : 'data unavailable'}`);
    }
  }));
  if (missing.length > 0) {
    console.error(`Coverage incomplete: ${missing.length}/${locations.length} locations have no verified dates.`);
    process.exitCode = 1;
  } else {
    console.log(`Coverage available for all ${locations.length} requested locations.`);
  }
}

main().catch(() => {
  console.error('Holiday sync failed. Check arguments and provider/database availability.');
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
