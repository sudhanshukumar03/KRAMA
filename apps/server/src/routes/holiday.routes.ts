import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { HolidayQuerySchema } from '@krama/validation';
import { HolidaySyncService } from '../services/holidays/HolidaySyncService';
import { prisma } from '../prisma';

const router: Router = Router();
const holidaySync = new HolidaySyncService();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const query = HolidayQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: 'start and end must be valid YYYY-MM-DD date query params' });
    }

    const { country, region, start: startKey, end: endKey } = query.data;
    // Strict date-key params → build explicit UTC day-bounds. Previously a bad
    // `start`/`end` transformed to an Invalid Date and surfaced as a 500.
    const start = new Date(`${startKey}T00:00:00.000Z`);
    const end = new Date(`${endKey}T23:59:59.999Z`);

    // Determine years involved (inclusive range, not just the endpoints, so
    // multi-year spans still sync every intermediate year).
    const startYear = start.getUTCFullYear();
    const endYear = end.getUTCFullYear();
    const years: number[] = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }

    // Sync national holidays (regionCode null) for every year in range, plus
    // the region's holidays when one was requested. The provider partitions
    // national vs regional so the two caches never duplicate each other.
    for (const year of years) {
      await holidaySync.ensureHolidays({ countryCode: country, regionCode: null, year });
      if (region) {
        await holidaySync.ensureHolidays({ countryCode: country, regionCode: region, year });
      }
    }

    // Now query the local DB for the date range and return. Match national
    // holidays (regionCode null) plus the specific region only when one was
    // requested — an empty-string region would otherwise match nothing.
    const holidays = await prisma.holiday.findMany({
      where: {
        countryCode: country,
        OR: region
          ? [{ regionCode: null }, { regionCode: region }]
          : [{ regionCode: null }],
        date: {
          gte: start,
          lte: end,
        }
      },
      orderBy: { date: 'asc' }
    });

    res.json({
      location: { countryCode: country, regionCode: region || null },
      holidays
    });
  } catch (error) {
    console.error('Holiday fetch error', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;
