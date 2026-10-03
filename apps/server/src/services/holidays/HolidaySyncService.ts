import type { Holiday } from '@prisma/client';
import type { HolidayProvider, HolidayProviderInput } from "./HolidayProvider";
import { NagerDateHolidayProvider } from './NagerDateHolidayProvider';
import { CalendarificHolidayProvider } from './CalendarificHolidayProvider';
import { prisma } from '../../prisma';

export class HolidaySyncService {
  private provider: HolidayProvider;

  constructor(provider?: HolidayProvider) {
    // Prefer Calendarific when an API key is configured — it supports
    // sub-national (regional) holidays. Fall back to the national-only
    // Nager.Date provider otherwise.
    this.provider =
      provider ||
      (process.env.CALENDARIFIC_API_KEY
        ? new CalendarificHolidayProvider()
        : new NagerDateHolidayProvider());
  }

  async ensureHolidays(input: HolidayProviderInput): Promise<Holiday[]> {
    const { year } = input;
    const localHolidays = await this.getLocalHolidays(input);
    if (localHolidays.length > 0) {
      return localHolidays;
    }

    try {
      const externalHolidays = await this.provider.getHolidays(input);

      if (externalHolidays.length === 0) {
        return [];
      }

      // Upsert to DB
      for (const eh of externalHolidays) {
        const rCode = eh.regionCode || null;
        
        // Check if exists
        const exists = await prisma.holiday.findFirst({
          where: {
            countryCode: eh.countryCode,
            regionCode: rCode,
            date: eh.date,
            name: eh.name,
          }
        });

        if (exists) {
          await prisma.holiday.update({
            where: { id: exists.id },
            data: {
              localName: eh.localName,
              description: eh.description,
              type: eh.type,
              isOptional: eh.isOptional,
              isPublicHoliday: eh.isPublicHoliday,
              source: eh.source,
              sourceId: eh.sourceId,
            }
          });
        } else {
          await prisma.holiday.create({
            data: {
              name: eh.name,
              localName: eh.localName,
              description: eh.description,
              date: eh.date,
              countryCode: eh.countryCode,
              regionCode: rCode,
              type: eh.type,
              isOptional: eh.isOptional,
              isPublicHoliday: eh.isPublicHoliday,
              source: eh.source,
              sourceId: eh.sourceId,
              year,
            }
          });
        }
      }

      return this.getLocalHolidays(input);
    } catch (e) {
      console.error('Failed to sync holidays', e);
      return localHolidays; // return whatever we had
    }
  }

  async getLocalHolidays(input: HolidayProviderInput): Promise<Holiday[]> {
    return prisma.holiday.findMany({
      where: {
        countryCode: input.countryCode,
        regionCode: input.regionCode || null,
        year: input.year
      },
      orderBy: { date: 'asc' }
    });
  }
}
