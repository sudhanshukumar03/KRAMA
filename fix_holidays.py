import os

code = '''import { prisma } from '../prisma';

export async function fetchHolidays(countryCode: string, year: number) {
  const apiKey = process.env.CALENDARIFIC_API_KEY;
  if (!apiKey) return [];

  // Check if we already have holidays for this country and year in DB
  const existing = await prisma.holiday.findFirst({
    where: {
      countryCode,
      date: {
        gte: new Date(\-01-01T00:00:00.000Z),
        lte: new Date(\-12-31T23:59:59.999Z),
      }
    }
  });

  if (existing) {
    return prisma.holiday.findMany({
      where: {
        countryCode,
        date: {
          gte: new Date(\-01-01T00:00:00.000Z),
          lte: new Date(\-12-31T23:59:59.999Z),
        }
      }
    });
  }

  // Fetch from Calendarific
  try {
    const res = await fetch(https://calendarific.com/api/v2/holidays?api_key=\&country=\&year=\);
    const data = await res.json();

    if (data?.meta?.code === 200 && data?.response?.holidays) {
      const holidays = data.response.holidays.map((h: any) => {
        let type = 'OBSERVANCE';
        if (h.type.includes('National holiday')) type = 'NATIONAL';
        else if (h.type.includes('Local holiday') || h.type.includes('State')) type = 'STATE';
        else if (h.type.includes('Observance')) type = 'OBSERVANCE';

        return {
          name: h.name,
          date: new Date(\),
          countryCode,
          type,
          description: h.description,
          source: 'Calendarific'
        };
      });

      await prisma.holiday.createMany({
        data: holidays,
        skipDuplicates: true
      });

      return holidays;
    }
  } catch (error) {
    console.error('Failed to fetch holidays:', error);
  }
  return [];
}
'''

with open('apps/server/src/services/holidays.service.ts', 'w') as f:
    f.write(code)
