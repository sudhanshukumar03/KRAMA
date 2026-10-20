import { INDIAN_STATES } from '@krama/types';
import type { ExternalHoliday, HolidayProvider, HolidayProviderInput } from './HolidayProvider';
import { INDIA_2026 } from './data/india2026';
import { validHolidayDate } from './indianHolidayData';

export const INDIAN_CALENDAR_SOURCE = 'india-regional-2026-v1';

/** Reviewed annual snapshot: no runtime API key, Python or network dependency. */
export class IndianHolidayProvider implements HolidayProvider {
  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    if (input.countryCode !== 'IN' || input.year !== INDIA_2026.year) return [];
    const code = input.regionCode?.replace(/^IN-/i, '').toUpperCase();
    if (!code) {
      // Only these three holidays apply throughout India. Other public dates
      // must come from the selected state's calendar.
      return [['01-26', 'Republic Day'], ['08-15', 'Independence Day'], ['10-02', "Mahatma Gandhi's Birthday"]].map(([day, name]) => ({
        name: name!, date: new Date(`2026-${day}T00:00:00.000Z`), countryCode: 'IN',
        type: 'NATIONAL', isOptional: false, isPublicHoliday: true,
        source: INDIAN_CALENDAR_SOURCE, sourceId: 'https://www.officeholidays.com/countries/india/2026',
      }));
    }
    if (!INDIAN_STATES.some(state => state.code === code)) return [];
    const calendar = INDIA_2026.regions[code];
    if (!calendar || calendar.holidays.some(h => !validHolidayDate(h.date, input.year))) return [];
    return calendar.holidays.map(h => ({
      name: h.name,
      description: `${calendar.name}: ${h.kind === 'PUBLIC' ? 'Public holiday' : h.kind === 'OPTIONAL' ? 'Optional holiday' : h.kind === 'BANK' ? 'Banks only' : h.kind === 'LOCAL' ? 'Local holiday; check district applicability' : 'Observance'}. ${h.note || ''}`.trim(),
      date: new Date(`${h.date}T00:00:00.000Z`), countryCode: 'IN', regionCode: code,
      type: h.kind === 'OPTIONAL' ? 'OPTIONAL' : h.kind === 'BANK' ? 'BANK' : h.kind === 'OBSERVANCE' ? 'OBSERVANCE' : 'STATE',
      isOptional: h.kind === 'OPTIONAL', isPublicHoliday: h.kind === 'PUBLIC',
      source: INDIAN_CALENDAR_SOURCE, sourceId: h.sourceUrl || calendar.sourceUrl,
    }));
  }
}
