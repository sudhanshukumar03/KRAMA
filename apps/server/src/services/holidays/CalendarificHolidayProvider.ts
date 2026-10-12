import type { ExternalHoliday, HolidayProvider, HolidayProviderInput } from "./HolidayProvider";
import { HolidayNormalizer } from "./HolidayNormalizer";
import { INDIAN_STATES } from '@krama/types';

/**
 * Calendarific (https://calendarific.com/api-documentation) provider.
 *
 * Unlike Nager.Date this supports sub-national holidays via the `location`
 * parameter. To keep the national (regionCode null) and regional caches from
 * duplicating each other we partition the results:
 *   - a national sync (regionCode null) keeps only nationwide holidays
 *     (`states === 'All'`);
 *   - a regional sync (regionCode set) keeps only the region-specific ones.
 */
export class CalendarificHolidayProvider implements HolidayProvider {
  private baseUrl = "https://calendarific.com/api/v2";
  private apiKey: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.CALENDARIFIC_API_KEY || "";
  }

  async getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]> {
    if (!this.apiKey) {
      console.warn("[CalendarificHolidayProvider] CALENDARIFIC_API_KEY not set; skipping.");
      return [];
    }

    const { countryCode, regionCode, year } = input;

    const params = new URLSearchParams({
      api_key: this.apiKey,
      country: countryCode,
      year: String(year),
    });
    if (regionCode) {
      // Calendarific expects ISO 3166-2 (e.g. "in-mh"). Accept either a bare
      // region ("MH") or an already-qualified code ("IN-MH").
      const location = regionCode.includes("-")
        ? regionCode.toLowerCase()
        : `${countryCode}-${regionCode}`.toLowerCase();
      params.set("location", location);
    }

    try {
      const response = await fetch(`${this.baseUrl}/holidays?${params.toString()}`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) {
        if (response.status === 404) return [];
        throw new Error(`Calendarific API HTTP ${response.status}`);
      }

      const json = (await response.json()) as any;
      if (json?.meta?.code && json.meta.code !== 200) throw new Error(`Calendarific API status ${json.meta.code}`);
      const holidays = json?.response?.holidays;
      if (!Array.isArray(holidays)) return [];

      return holidays
        .map((h: any): ExternalHoliday | null => {
          const isNationwide =
            h.states === "All" || h.states === undefined || h.states === null;

          // Partition so a holiday lives in exactly one cache.
          if (regionCode) {
            if (isNationwide) return null; // nationwide → belongs to the null cache
            const requestedCode = regionCode.includes('-') ? regionCode : `${countryCode}-${regionCode}`;
            const requestedName = countryCode === 'IN' ? INDIAN_STATES.find(state => state.code === regionCode)?.name : undefined;
            if (!Array.isArray(h.states) || !h.states.some((state: any) => {
              const iso = typeof state === 'string' ? state : state.iso;
              return (typeof iso === 'string' && iso.toLowerCase() === requestedCode.toLowerCase())
                || (requestedName && state.name === requestedName);
            })) return null;
          } else if (!isNationwide) {
            return null; // region-specific → belongs to a regional cache
          }

          const iso = h?.date?.iso as string | undefined;
          if (!iso) return null;
          // iso may carry a time/offset; pin to UTC midnight to match the rest
          // of the planner's date handling.
          const dateOnly = iso.split("T")[0];
          const date = new Date(`${dateOnly}T00:00:00.000Z`);
          if (isNaN(date.getTime())) return null;

          const typeString = [Array.isArray(h.type) ? h.type.join(', ') : h.type, h.primary_type].filter(Boolean).join(', ');
          const { type, isPublicHoliday } = HolidayNormalizer.normalizeType(typeString);

          return {
            name: h.name,
            localName: h.name,
            description: typeof h.description === "string" ? h.description : undefined,
            date,
            countryCode,
            regionCode: regionCode || undefined,
            type,
            isOptional: /optional|restricted/i.test(typeString),
            isPublicHoliday,
            source: "calendarific-v2",
            sourceId: typeof h.canonical_url === "string" ? h.canonical_url : undefined,
          };
        })
        .filter((h): h is ExternalHoliday => h !== null);
    } catch {
      // Request URLs contain credentials. Do not log transport error objects.
      console.warn("[CalendarificHolidayProvider] Holiday request failed.");
      return [];
    }
  }
}
