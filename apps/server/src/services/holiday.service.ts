import { prisma } from '../prisma';

export async function fetchAndSyncHolidays(countryCode: string, year: number) {
  try {
    const url = `https://date.nager.at/api/v3/PublicHolidays/${year}/${countryCode}`;
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to fetch from nager.at: ${response.statusText}`);
    }
    const holidays = await response.json();

    const formattedHolidays = holidays.map((h: any) => ({
      name: h.name,
      localName: h.localName,
      date: new Date(h.date),
      countryCode: h.countryCode,
      regionCode: h.counties ? h.counties[0] : null,
      type: 'NATIONAL', // HolidayType enum in Prisma
      isOptional: false,
      isPublicHoliday: true,
      description: h.name,
    }));

    // Insert them, avoiding duplicates
    let count = 0;
    for (const h of formattedHolidays) {
      const exists = await prisma.holiday.findFirst({
        where: {
          name: h.name,
          date: h.date,
          countryCode: h.countryCode
        }
      });
      if (!exists) {
        await prisma.holiday.create({ data: h });
        count++;
      }
    }

    return { success: true, count };
  } catch (error) {
    console.error('Error fetching holidays:', error);
    return { success: false, count: 0, error };
  }
}
