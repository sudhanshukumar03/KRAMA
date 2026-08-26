import type { HolidayType } from '@prisma/client';

export class HolidayNormalizer {
  public static mapToCalendarificRegion(countryCode: string, regionCode?: string | null): string | undefined {
    if (!regionCode) return undefined;
    return `${countryCode.toLowerCase()}-${regionCode.toLowerCase()}`;
  }

  public static normalizeType(typeString: string): { type: HolidayType; isPublicHoliday: boolean } {
    const ts = typeString.toLowerCase();
    
    if (ts.includes('national holiday') || ts.includes('public')) {
      return { type: 'NATIONAL', isPublicHoliday: true };
    }
    if (ts.includes('state') || ts.includes('local')) {
      return { type: 'STATE', isPublicHoliday: true };
    }
    if (ts.includes('bank')) {
      return { type: 'BANK', isPublicHoliday: true };
    }
    if (ts.includes('school')) {
      return { type: 'SCHOOL', isPublicHoliday: false };
    }
    if (ts.includes('festival') || ts.includes('religious') || ts.includes('hindu') || ts.includes('muslim') || ts.includes('christian')) {
      return { type: 'FESTIVAL', isPublicHoliday: false };
    }
    if (ts.includes('observance') || ts.includes('season')) {
      return { type: 'OBSERVANCE', isPublicHoliday: false };
    }
    if (ts.includes('optional')) {
      return { type: 'OPTIONAL', isPublicHoliday: false };
    }
    
    return { type: 'OTHER', isPublicHoliday: false };
  }
}
