
import type {  ExternalHoliday, HolidayProvider, HolidayProviderInput  } from "./HolidayProvider";
import { HolidayNormalizer } from './HolidayNormalizer';

export class CalendarificHolidayProvider implements HolidayProvider {
  private apiKey: string;
  private baseUrl = 'https://calendarific.com/api/v2';

  constructor() {
    this.apiKey = process.env.CALENDARIFIC_API_KEY || '';
  }

  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    if (!this.apiKey) {
      console.warn('CALENDARIFIC_API_KEY is not set. Returning empty holidays.');
      return [];
    }

    const { countryCode, regionCode, year } = input;
    
    try {
      const params: any = {
        api_key: this.apiKey,
        country: countryCode,
        year: year,
      };

      if (regionCode) {
        params.location = HolidayNormalizer.mapToCalendarificRegion(countryCode, regionCode);
      }

      const queryParams = new URLSearchParams(params as any).toString();
      const response = await fetch(`${this.baseUrl}/holidays?${queryParams}`);
      const responseData = await response.json();
      
      if (responseData?.meta?.code !== 200) {
        throw new Error(`Calendarific API error: ${responseData?.meta?.error_detail || 'Unknown'}`);
      }

      const holidays = responseData?.response?.holidays || [];

      return holidays.map((h: any): ExternalHoliday => {
        const typeString = Array.isArray(h.type) ? h.type.join(', ') : (h.type || '');
        const { type, isPublicHoliday } = HolidayNormalizer.normalizeType(typeString);
        
        const parsedDate = new Date(h.date.iso);

        return {
          name: h.name,
          localName: h.localName,
          description: h.description,
          date: parsedDate,
          countryCode: countryCode,
          regionCode: regionCode || undefined,
          type,
          isOptional: type === 'OPTIONAL',
          isPublicHoliday,
          source: 'Calendarific',
          sourceId: h.id || h.name
        };
      });
    } catch (error) {
      console.error('Error fetching from Calendarific:', error);
      throw error;
    }
  }
}
