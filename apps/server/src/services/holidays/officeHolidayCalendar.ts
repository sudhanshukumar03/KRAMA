import type { IndianHolidayDate, IndianHolidayKind } from './indianHolidayData';
import { validHolidayDate } from './indianHolidayData';

function decode(value: string) {
  return value.replace(/\\([nN,;\\])/g, (_, character: string) => /[nN]/.test(character) ? '\n' : character);
}

/** Parse only the published all-day feed format; reject another location's feed. */
export function parseOfficeHolidayCalendar(ics: string, regionName: string, year: number): IndianHolidayDate[] {
  const unfolded = ics.replace(/\r?\n[ \t]/g, '');
  if (!unfolded.startsWith('BEGIN:VCALENDAR') || !unfolded.includes('END:VCALENDAR')) throw new Error('Invalid calendar feed');
  const calendarName = unfolded.match(/^X-WR-CALNAME:(.+)$/m)?.[1]?.trim();
  if (calendarName !== `${regionName} Holidays`) throw new Error('Calendar location mismatch');
  const dates = new Map<string, IndianHolidayDate>();
  for (const match of unfolded.matchAll(/BEGIN:VEVENT\r?\n([\s\S]*?)END:VEVENT/g)) {
    const values = new Map<string, string>();
    for (const line of (match[1] || '').split(/\r?\n/)) {
      const separator = line.indexOf(':');
      if (separator > 0) values.set(line.slice(0, separator).split(';')[0]!, decode(line.slice(separator + 1)));
    }
    const rawDate = values.get('DTSTART') || '';
    if (!rawDate.startsWith(String(year))) continue;
    if (!/^\d{8}$/.test(rawDate)) throw new Error('Expected all-day holiday');
    const date = `${rawDate.slice(0, 4)}-${rawDate.slice(4, 6)}-${rawDate.slice(6, 8)}`;
    if (!validHolidayDate(date, year)) throw new Error('Invalid holiday date');
    const summary = values.get('SUMMARY') || '';
    const location = values.get('LOCATION');
    if (location && !location.split(',').every(value => ['India', regionName, `India: ${regionName}`].includes(value.trim()))) throw new Error('Event location mismatch');
    let name = summary.startsWith(`${regionName}: `) ? summary.slice(regionName.length + 2) : summary;
    const category = name.match(/ \((Regional Holiday|Government Holiday|Not a Public Holiday|Bank Holiday|Optional Holiday)\)$/i)?.[1];
    if (category) name = name.slice(0, name.length - category.length - 3);
    const description = values.get('DESCRIPTION') || '';
    let kind: IndianHolidayKind = 'PUBLIC';
    if (/optional|restricted/i.test(category || '')) kind = 'OPTIONAL';
    else if (/bank holiday/i.test(category || '')) kind = 'BANK';
    else if (/not a public holiday/i.test(category || '')) kind = /bank/i.test(name) ? 'BANK' : 'OBSERVANCE';
    // A state selection cannot establish the user's district or occupation.
    if (kind === 'PUBLIC' && /constituenc|districts? only|only in|banks only|women only|women employees/i.test(description)) kind = 'LOCAL';
    const sourceUrl = values.get('URL') || '';
    if (!sourceUrl.startsWith('https://www.officeholidays.com/holidays/india/')) throw new Error('Missing holiday source');
    const item: IndianHolidayDate = { date, name, kind, sourceUrl };
    if (kind === 'LOCAL') item.note = description.split('\n')[0]?.slice(0, 240);
    dates.set(`${date}:${name}`, item);
  }
  if (dates.size < 3) throw new Error('Incomplete annual calendar');
  return [...dates.values()].sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name));
}
