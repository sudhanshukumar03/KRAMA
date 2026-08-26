import { Router } from 'express';
import type { Request, Response } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { z } from 'zod';
import { HolidaySyncService } from '../services/holidays/HolidaySyncService';
import { PrismaClient } from '@prisma/client';

const router: Router = Router();
const prisma = new PrismaClient();
const holidaySync = new HolidaySyncService();

router.use(requireAuth);

router.get('/', async (req, res) => {
  try {
    const querySchema = z.object({
      country: z.string(),
      region: z.string().optional(),
      start: z.string().transform(str => new Date(str)),
      end: z.string().transform(str => new Date(str)),
    });

    const query = querySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ error: 'Invalid query parameters' });
    }

    const { country, region, start, end } = query.data;

    // Determine years involved
    const startYear = start.getFullYear();
    const endYear = end.getFullYear();
    const years = Array.from(
      new Set([startYear, endYear])
    );

    // Ensure we have data for the country and the region
    for (const year of years) {
      // Fetch national level
      await holidaySync.ensureHolidays({ countryCode: country, regionCode: null, year });
      // Fetch regional level if specified
      if (region) {
        await holidaySync.ensureHolidays({ countryCode: country, regionCode: region, year });
      }
    }

    // Now query the local DB for the date range and return
    const holidays = await prisma.holiday.findMany({
      where: {
        countryCode: country,
        OR: [
          { regionCode: null },
          { regionCode: region || '' }
        ],
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
