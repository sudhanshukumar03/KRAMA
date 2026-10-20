export type IndianHolidayKind = 'PUBLIC' | 'OPTIONAL' | 'BANK' | 'OBSERVANCE' | 'LOCAL';
export interface IndianHolidayDate {
  date: string;
  name: string;
  kind: IndianHolidayKind;
  sourceUrl?: string;
  note?: string;
}
export interface IndianRegionalCalendar {
  name: string;
  sourceUrl: string;
  holidays: IndianHolidayDate[];
}
export interface IndianHolidayDataset {
  year: number;
  reviewedOn: string;
  regions: Record<string, IndianRegionalCalendar>;
}

export function validHolidayDate(key: string, year: number): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !key.startsWith(`${year}-`)) return false;
  const date = new Date(`${key}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === key;
}
