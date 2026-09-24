import type { ExternalHoliday, HolidayProvider, HolidayProviderInput } from "./HolidayProvider";
import { HolidayNormalizer } from "./HolidayNormalizer";

export class NagerDateHolidayProvider implements HolidayProvider {
  private baseUrl = "https://date.nager.at/api/v3";

  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    const { countryCode, year } = input;

    try {
      const response = await fetch(`${this.baseUrl}/PublicHolidays/${year}/${encodeURIComponent(countryCode)}`);
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Nager.Date API HTTP ${response.status}`);
      }

      const holidays = (await response.json()) as any[];
      if (!Array.isArray(holidays)) return [];

      return holidays.map((h: any): ExternalHoliday => {
        const typeString = Array.isArray(h.types) ? h.types.join(", ") : (h.type || "Public");
        const { type, isPublicHoliday } = HolidayNormalizer.normalizeType(typeString);

        return {
          name: h.name,
          localName: h.localName,
          date: new Date(h.date),
          countryCode,
          regionCode: input.regionCode || undefined,
          type,
          isOptional: false,
          isPublicHoliday,
          source: "nager.date",
        };
      });
    } catch (error) {
      console.warn(`[NagerDateHolidayProvider] Failed to fetch holidays:`, error);
      return [];
    }
  }
}
