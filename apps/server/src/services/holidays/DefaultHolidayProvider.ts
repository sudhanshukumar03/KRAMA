import type { ExternalHoliday, HolidayProvider, HolidayProviderInput } from './HolidayProvider';
import { CalendarificHolidayProvider } from './CalendarificHolidayProvider';
import { NagerDateHolidayProvider } from './NagerDateHolidayProvider';
import { IndianHolidayProvider } from './IndianHolidayProvider';

export class DefaultHolidayProvider implements HolidayProvider {
  constructor(
    private external: HolidayProvider = process.env.CALENDARIFIC_API_KEY ? new CalendarificHolidayProvider() : new NagerDateHolidayProvider(),
    private indian: HolidayProvider = new IndianHolidayProvider(),
  ) {}

  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    if (input.countryCode === 'IN' && input.regionCode) {
      const regional = await this.indian.getHolidays(input);
      if (regional.length > 0) return regional;
    }
    const external = await this.external.getHolidays(input);
    return external.length > 0 ? external : this.indian.getHolidays(input);
  }
}
