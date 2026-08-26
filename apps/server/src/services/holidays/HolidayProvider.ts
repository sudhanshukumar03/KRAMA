import { HolidayType } from '@prisma/client';

export interface ExternalHoliday {
  name: string;
  localName?: string;
  description?: string;
  date: Date;
  countryCode: string;
  regionCode?: string;
  type: HolidayType;
  isOptional: boolean;
  isPublicHoliday: boolean;
  source: string;
  sourceId?: string;
}

export interface HolidayProviderInput {
  countryCode: string;
  regionCode?: string | null;
  year: number;
}

export interface HolidayProvider {
  getHolidays(input: HolidayProviderInput): Promise<ExternalHoliday[]>;
}

export const __IS_HOLIDAY_PROVIDER = true;
