import { HolidaySyncService } from '../services/holidays/HolidaySyncService';
import * as dotenv from 'dotenv';
dotenv.config();

async function main() {
  const args = process.argv.slice(2);
  let country = 'IN';
  let region = '';
  let year = new Date().getFullYear();
  let allRegions = false;

  for (let i = 0; i < args.length; i++) {
    const next = args[i + 1];
    if (args[i] === '--country' && next) country = next;
    if (args[i] === '--region' && next) region = next;
    if (args[i] === '--year' && next) year = parseInt(next);
    if (args[i] === '--all-regions') allRegions = true;
  }

  const syncService = new HolidaySyncService();

  console.log(`Syncing holidays for ${country}, year ${year}...`);

  if (allRegions) {
    console.log('Syncing all regions is not fully implemented in CLI script, but we will sync country-level.');
    await syncService.ensureHolidays({ countryCode: country, regionCode: null, year });
    console.log('Done.');
  } else {
    const res = await syncService.ensureHolidays({ 
      countryCode: country, 
      regionCode: region || null, 
      year 
    });
    console.log(`Synced ${res.length} holidays.`);
  }
}

main().catch(console.error);
