import re

with open('apps/server/src/routes/planner.routes.ts', 'r') as f:
    code = f.read()

code = code.replace(
    \"import { fetchGoogleCalendarEvents } from '../services/google-calendar.service';\",
    \"import { fetchHolidays } from '../services/holidays.service';\"
)

code = code.replace(
    \"gcalEvents,\",
    \"holidaysList,\"
)

code = code.replace(
    \"fetchGoogleCalendarEvents(userId, weekStart, weekEnd),\",
    \"fetchHolidays(user.countryCode || 'IN', weekStart.getFullYear()),\"
)

code = code.replace(
    \"const allTimeBlocks = [...timeBlocks, ...gcalEvents].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());\",
    \"\"\"
    const holidayBlocks = holidaysList.filter((h: any) => {
      const hDate = new Date(h.date);
      return hDate >= weekStart && hDate <= weekEnd;
    }).map((h: any) => {
      const hDate = new Date(h.date);
      return {
        id: 'holiday-' + h.name,
        title: h.name,
        date: hDate,
        startTime: new Date(hDate.getTime() + 1000 * 60 * 60 * 8), // 8 AM placeholder
        endTime: new Date(hDate.getTime() + 1000 * 60 * 60 * 9), // 9 AM placeholder
        type: 'OTHER',
        isExternal: true,
        source: 'Holiday'
      };
    });

    const allTimeBlocks = [...timeBlocks, ...holidayBlocks].sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
    \"\"\"
)

with open('apps/server/src/routes/planner.routes.ts', 'w') as f:
    f.write(code)
