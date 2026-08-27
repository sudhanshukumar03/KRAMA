import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { useHolidays } from "../../hooks/useHolidays";
import { Calendar as CalendarIcon } from "lucide-react";

interface Props {
  calendarDate: Date;
  currentCountry: string;
  currentRegion: string | null;
  localOnly: boolean;
}

export function CalendarMode({ calendarDate, currentCountry, currentRegion, localOnly }: Props) {
  const { data: monthData, isLoading } = useHolidays(currentCountry, currentRegion, calendarDate);

  let holidays = monthData?.holidays || [];
  if (localOnly) {
    holidays = holidays.filter((h: any) => h.isPublicHoliday);
  }

  const upcomingHolidays = holidays.filter((h: any) => parseISO(h.date) >= new Date(new Date().setHours(0,0,0,0)));

  // Calendar Grid Math
  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);

  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1)); // Adjust for Monday start

  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (7 - endDate.getDay() === 7 ? 0 : 7 - endDate.getDay()));

  const monthDays = eachDayOfInterval({ start: startDate, end: endDate });

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col">
      <div className="flex gap-8">

        {/* CALENDAR GRID */}
        <div className="flex-1 flex flex-col">
          <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2 flex-shrink-0">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
              <div key={i} className="font-bold text-slate-400 uppercase tracking-wider py-2">{d}</div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {monthDays.map(day => {
              const dayHolidays = holidays.filter((h: any) => isSameDay(parseISO(h.date), day));

              return (
                <div
                  key={day.toISOString()}
                  className={"border rounded-xl p-2 flex flex-col " + (isSameMonth(day, calendarDate) ? "bg-white border-slate-200" : "bg-slate-50 border-slate-100 opacity-50")}
                >
                  <div className={"text-sm font-semibold mb-1 " + (isToday(day) ? "flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white" : "text-slate-700")}>
                    {format(day, "d")}
                  </div>
                  <div className="flex flex-col gap-1">
                    {dayHolidays.map((h: any) => (
                      <div
                        key={h.id}
                        className={"text-[10px] leading-tight px-1.5 py-1 rounded " + (h.type === "PUBLIC_HOLIDAY" ? "bg-rose-50 text-rose-700 border border-rose-100" : "bg-emerald-50 text-emerald-700 border border-emerald-100")}
                      >
                        {h.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* UPCOMING HOLIDAYS & MANAGEMENT */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-6">

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <div className="flex items-center gap-2 mb-4">
              <CalendarIcon size={18} className="text-pink-500" />
              <h3 className="font-bold text-slate-800">Upcoming Holidays</h3>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-sm text-slate-400 animate-pulse">Loading...</div>
              ) : upcomingHolidays.length === 0 ? (
                <div className="text-sm text-slate-400 py-4 text-center italic">No upcoming holidays found.</div>
              ) : (
                upcomingHolidays.slice(0, 8).map((h: any) => (
                  <div key={h.id} className="flex gap-3 items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                    <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-100 flex flex-col items-center justify-center flex-shrink-0 text-pink-600">
                      <span className="text-[9px] font-bold uppercase">{format(parseISO(h.date), "MMM")}</span>
                      <span className="text-sm font-black leading-none">{format(parseISO(h.date), "d")}</span>
                    </div>
                    <div>
                      <div className="text-sm font-bold text-slate-700 leading-tight">{h.name}</div>
                      <div className="text-[10px] font-semibold text-pink-600 uppercase tracking-wider mt-1">{h.type.replace("_", " ")}</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-slate-800">Holiday Sources</h3>
              <button className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">Manage</button>
            </div>
            <p className="text-xs text-slate-500 mb-0">
              Manage which calendars and event sources populate your Planner.
            </p>
          </div>

          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200">
            <h3 className="font-bold text-slate-800 mb-4">Holiday Categories</h3>
            <div className="space-y-3">
              {[
                { label: "Public Holidays", color: "text-rose-500", icon: "🔴", checked: true },
                { label: "Festivals", color: "text-orange-500", icon: "🏵️", checked: true },
                { label: "Regional Holidays", color: "text-purple-500", icon: "📍", checked: true },
                { label: "Observances", color: "text-emerald-500", icon: "👁️", checked: true },
                { label: "Optional Holidays", color: "text-slate-400", icon: "🗓️", checked: false }
              ].map((cat) => (
                <label key={cat.label} className="flex items-center justify-between cursor-pointer group">
                  <div className="flex items-center gap-2.5">
                    <span className="text-[12px]">{cat.icon}</span>
                    <span className="text-sm font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">{cat.label}</span>
                  </div>
                  <div className={"w-4 h-4 rounded border flex items-center justify-center " + (cat.checked ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300")}>
                    {cat.checked ? (
                      <svg viewBox="0 0 14 14" className="w-3 h-3 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 7.5 5.5 10 11 4" />
                      </svg>
                    ) : (
                      <div className="w-2 h-0.5 bg-slate-300 rounded-full" />
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
