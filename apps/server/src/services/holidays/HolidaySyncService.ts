import type { Holiday } from '@prisma/client';
import type { HolidayProvider, HolidayProviderInput } from "./HolidayProvider";
import { DefaultHolidayProvider } from './DefaultHolidayProvider';
import { mergeHolidayCalendars } from './mergeHolidayCalendars';
import { prisma } from '../../prisma';

export class HolidaySyncService {
  private provider: HolidayProvider;
  private pending = new Map<string, Promise<Holiday[]>>();
  private retryAfter = new Map<string, number>();

  constructor(provider?: HolidayProvider) {
    this.provider = provider || new DefaultHolidayProvider();
  }

  async getCalendar(input: HolidayProviderInput) {
    const [national, regional] = await Promise.all([
      this.ensureHolidays({ ...input, regionCode: null }),
      input.regionCode ? this.ensureHolidays(input) : Promise.resolve([]),
    ]);
    return {
      holidays: mergeHolidayCalendars(national, regional),
      missingNationalYears: national.length === 0 ? [input.year] : [],
      missingRegionalYears: input.regionCode && regional.length === 0 ? [input.year] : [],
    };
  }

  async ensureHolidays(input: HolidayProviderInput, options: { refresh?: boolean } = {}): Promise<Holiday[]> {
    const key = JSON.stringify([input.countryCode, input.regionCode || null, input.year]);
    const running = this.pending.get(key);
    if (running) return running;
    const operation = this.sync(input, key, options.refresh === true);
    this.pending.set(key, operation);
    try {
      return await operation;
    } finally {
      this.pending.delete(key);
    }
  }

  private async sync(input: HolidayProviderInput, key: string, refresh: boolean): Promise<Holiday[]> {
    const { year } = input;
    const localHolidays = await this.getLocalHolidays(input);
    const fresh = localHolidays.length > 0 && localHolidays.every(h => Date.now() - h.updatedAt.getTime() < 24 * 60 * 60 * 1000);
    if (!refresh && (fresh || (this.retryAfter.get(key) || 0) > Date.now())) {
      return localHolidays;
    }

    try {
      const externalHolidays = await this.provider.getHolidays(input);

      if (externalHolidays.length === 0) {
        this.deferRetry(key);
        return localHolidays;
      }

      // Replace legacy provider rows atomically: their regional provenance and
      // restricted-holiday classifications cannot be trusted.
      await prisma.$transaction(async tx => {
        await tx.holiday.deleteMany({
          where: { countryCode: input.countryCode, regionCode: input.regionCode || null, year,
            source: { in: ['calendarific', 'nager.date', 'calendarific-v2', 'nager.date-v2', ...new Set(externalHolidays.map(h => h.source))] } },
        });
        for (const eh of externalHolidays) {
          const rCode = eh.regionCode || null;

          // Check if exists
          const exists = await tx.holiday.findFirst({
            where: {
              countryCode: eh.countryCode,
              regionCode: rCode,
              date: eh.date,
              name: eh.name,
            }
          });

          if (exists) {
            await tx.holiday.update({
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
            await tx.holiday.create({
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
      });
      this.retryAfter.delete(key);

      return this.getLocalHolidays(input);
    } catch {
      this.deferRetry(key);
      console.warn('Holiday sync unavailable; retaining the verified cache.');
      return localHolidays; // return whatever we had
    }
  }

  private deferRetry(key: string) {
    if (this.retryAfter.size >= 500) this.retryAfter.clear();
    this.retryAfter.set(key, Date.now() + 5 * 60 * 1000);
  }

  async getLocalHolidays(input: HolidayProviderInput): Promise<Holiday[]> {
    return prisma.holiday.findMany({
      where: {
        countryCode: input.countryCode,
        regionCode: input.regionCode || null,
        year: input.year,
        OR: [{ source: null }, { source: { notIn: ['calendarific', 'nager.date'] } }],
      },
      orderBy: { date: 'asc' }
    });
  }
}
