import type {  ExternalHoliday, HolidayProvider, HolidayProviderInput  } from "./HolidayProvider";
import { HolidayNormalizer } from "./HolidayNormalizer";

export class CalendarificHolidayProvider implements HolidayProvider {
  private apiKey: string;
  private baseUrl = "https://calendarific.com/api/v2";

  constructor() {
    this.apiKey = process.env.CALENDARIFIC_API_KEY || "";
  }

  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    const { countryCode, regionCode, year } = input;

    if (!this.apiKey) {
      console.warn("CALENDARIFIC_API_KEY is not set. Using mock holidays for demonstration.");
      return [
        { name: "New Year", date: new Date(`${year}-01-01`), type: "NATIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
        { name: "Republic Day", date: new Date(`${year}-01-26`), type: "NATIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
        { name: "Holi", date: new Date(`${year}-03-25`), type: "REGIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
        { name: "Independence Day", date: new Date(`${year}-08-15`), type: "NATIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
        { name: "Raksha Bandhan", date: new Date(`${year}-08-28`), type: "OBSERVANCE", isPublicHoliday: false, isOptional: true, countryCode, source: "mock" },
        { name: "Diwali", date: new Date(`${year}-11-01`), type: "NATIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
        { name: "Christmas Day", date: new Date(`${year}-12-25`), type: "INTERNATIONAL", isPublicHoliday: true, isOptional: false, countryCode, source: "mock" },
      ] as any[];
    }

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
        throw new Error(`Calendarific API error: ${responseData?.meta?.error_detail || "Unknown"}`);
      }

      const holidays = responseData?.response?.holidays || [];

      return holidays.map((h: any): ExternalHoliday => {
        const typeString = Array.isArray(h.type) ? h.type.join(", ") : (h.type || "");
        const { type, isPublicHoliday } = HolidayNormalizer.normalizeType(typeString);

        const parsedDate = new Date(h.date.iso);

        return {
          name: h.name,
          localName: h.localName,
          description: h.description,
          date: parsedDate,
          countryCode: countryCode,
          regionCode: regionCode || undefined,
          type: type,
          isOptional: false,
          isPublicHoliday,
          source: "calendarific"
        };
      });

    } catch (error) {
      console.error("Error fetching holidays from Calendarific:", error);
      return [];
    }
  }
}
