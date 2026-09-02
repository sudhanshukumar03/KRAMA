import { format, parseISO, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday } from "date-fns";
import { useHolidays } from "../../hooks/useHolidays";
import { Calendar as CalendarIcon, Filter, Layers } from "lucide-react";

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
    <div className="flex-1 flex gap-8 min-h-0 overflow-hidden">

      {/* CALENDAR GRID */}
      <div className="flex-1 flex flex-col min-h-0 pb-6">
        <div className="grid grid-cols-7 gap-0 text-center text-[11px] mb-2 flex-shrink-0">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d, i) => (
            <div key={i} className="font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider py-2 border-b border-slate-100 dark:border-[#1E293B]">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 auto-rows-fr gap-0 flex-1 overflow-hidden border-l border-t border-slate-100 dark:border-[#1E293B]">
          {monthDays.map((day) => {
            const dayHolidays = holidays.filter((h: any) => isSameDay(parseISO(h.date), day));
            const isCurrentMonth = isSameMonth(day, calendarDate);
            const today = isToday(day);

            return (
              <div 
                key={day.toISOString()} 
                className={`flex flex-col min-h-0 p-1.5 border-r border-b border-slate-100 dark:border-[#1E293B] transition-colors overflow-hidden ${
                  isCurrentMonth ? "bg-white dark:bg-[#0F172A]" : "bg-slate-50 dark:bg-[#1E293B]/50"
                } ${
                  today ? "ring-1 ring-inset ring-blue-500 z-10" : ""
                }`}
              >
                <div className="flex justify-between items-start mb-0.5">
                  <span className={`text-[12px] font-bold w-6 h-6 flex items-center justify-center rounded-full ${
                    today 
                      ? "bg-blue-600 text-white" 
                      : isCurrentMonth 
                        ? "text-slate-700 dark:text-slate-200" 
                        : "text-slate-400 dark:text-slate-500"
                  }`}>
                    {format(day, "d")}
                  </span>
                </div>
                
                <div className="flex-1 flex flex-col gap-0.5 overflow-y-auto hide-scrollbar mt-0.5">
                  {dayHolidays.map((h: any) => (
                    <div 
                      key={h.id} 
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-tight border ${
                        h.isPublicHoliday 
                          ? "bg-rose-50 text-rose-700 border-rose-100" 
                          : h.type === "OBSERVANCE"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : "bg-slate-50 dark:bg-[#1E293B] text-slate-700 dark:text-slate-200 border-slate-200 dark:border-[#334155]"
                      }`}
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

      {/* SIDEBAR: UPCOMING & CATEGORIES */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-4 overflow-y-auto hide-scrollbar pb-6">

        {/* UPCOMING HOLIDAYS */}
        <div className="flex flex-col bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-slate-200 dark:border-[#334155] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <CalendarIcon size={16} className="text-blue-500" />
            <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Upcoming Holidays</h3>
          </div>

          <div className="flex flex-col gap-2">
            {isLoading ? (
              <div className="text-sm text-slate-400 dark:text-slate-500 animate-pulse">Loading...</div>
            ) : upcomingHolidays.length === 0 ? (
              <div className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center italic border border-dashed border-slate-200 dark:border-[#334155] rounded-xl">No upcoming holidays.</div>
            ) : (
              upcomingHolidays.slice(0, 4).map((h: any) => (
                <div key={h.id} className="flex gap-3 items-start p-2 rounded-xl border border-transparent hover:bg-slate-50 dark:hover:bg-[#1E293B] hover:border-slate-100 dark:border-[#1E293B] transition-colors cursor-default">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex flex-col items-center justify-center flex-shrink-0 text-blue-600">
                    <span className="text-[8px] font-bold uppercase">{format(parseISO(h.date), "MMM")}</span>
                    <span className="text-sm font-black leading-none">{format(parseISO(h.date), "d")}</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-tight">{h.name}</div>
                    <div className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">{h.type.replace(/_/g, " ")}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* HOLIDAY CATEGORIES */}
        <div className="flex flex-col bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-slate-200 dark:border-[#334155] shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={16} className="text-slate-400 dark:text-slate-500" />
            <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Categories</h3>
          </div>
          
          <div className="flex flex-col gap-1">
            {[
              { label: "Public Holidays", color: "text-rose-500", bg: "bg-rose-50", checked: true },
              { label: "Festivals", color: "text-orange-500", bg: "bg-orange-50", checked: true },
              { label: "Regional Holidays", color: "text-purple-500", bg: "bg-purple-50", checked: true },
              { label: "Observances", color: "text-emerald-500", bg: "bg-emerald-50", checked: true },
              { label: "Optional Holidays", color: "text-slate-500 dark:text-slate-400", bg: "bg-slate-50 dark:bg-[#1E293B]", checked: false }
            ].map((cat) => (
              <label key={cat.label} className="flex items-center justify-between cursor-pointer p-1.5 hover:bg-slate-50 dark:hover:bg-[#1E293B] rounded-lg transition-colors group">
                <div className="flex items-center gap-2.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${cat.bg} border ${cat.color.replace('text', 'border')}`} />
                  <span className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 group-hover:text-slate-900">{cat.label}</span>
                </div>
                <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-colors ${cat.checked ? "bg-blue-600 border-blue-600" : "bg-white dark:bg-[#0F172A] border-slate-300 dark:border-[#475569]"}`}>
                  {cat.checked ? (
                    <svg viewBox="0 0 14 14" className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 7.5 5.5 10 11 4" />
                    </svg>
                  ) : null}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* SOURCES */}
        <div className="flex flex-col bg-white dark:bg-[#0F172A] rounded-2xl p-4 border border-slate-200 dark:border-[#334155] shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-slate-400 dark:text-slate-500" />
              <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider">Sources</h3>
            </div>
            <button className="text-[9px] font-bold text-blue-600 hover:underline uppercase tracking-wider">Manage</button>
          </div>
          <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed m-0">
            Control which external calendars feed into your planner.
          </p>
        </div>

      </div>
    </div>
  );
}
