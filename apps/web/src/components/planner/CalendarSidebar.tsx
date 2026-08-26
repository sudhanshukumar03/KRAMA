import { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isToday, parseISO } from 'date-fns';
import { useHolidays } from '../../hooks/useHolidays';

interface Props {
  data: any;
  currentDate: Date;
  onNavigate: (date: Date) => void;
}

export function CalendarSidebar({ data, currentDate, onNavigate }: Props) {
  const [calendarDate, setCalendarDate] = useState(currentDate);

  const countryCode = data.config?.countryCode || 'IN';
  const regionCode = data.config?.regionCode || '';
  
  const { data: monthData, isLoading } = useHolidays(countryCode, regionCode, calendarDate);

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  
  const startDate = new Date(monthStart);
  startDate.setDate(startDate.getDate() - startDate.getDay() + (startDate.getDay() === 0 ? -6 : 1)); // Adjust for Monday start
  
  const endDate = new Date(monthEnd);
  endDate.setDate(endDate.getDate() + (7 - endDate.getDay() === 7 ? 0 : 7 - endDate.getDay()));

  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const holidays = monthData?.holidays || [];

  return (
    <div className="w-80 flex-shrink-0 flex flex-col gap-4">
      {/* Mini Calendar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm">
            {format(calendarDate, 'MMMM yyyy')}
          </h3>
          <div className="flex gap-1">
            <button 
              onClick={() => setCalendarDate(subMonths(calendarDate, 1))}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            >
              <ChevronLeft size={16} />
            </button>
            <button 
              onClick={() => setCalendarDate(addMonths(calendarDate, 1))}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="font-medium text-slate-400">{d}</div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const hasHoliday = holidays.some((h: any) => isSameDay(parseISO(h.date), day));
            return (
              <button
                key={day.toISOString()}
                onClick={() => onNavigate(day)}
                className={`h-8 rounded-full flex items-center justify-center text-xs relative ${!isSameMonth(day, calendarDate) ? "text-slate-300" : "text-slate-700 hover:bg-slate-100"} ${isSameDay(day, currentDate) ? "bg-blue-50 text-blue-700 font-bold" : ""} ${isToday(day) && !isSameDay(day, currentDate) ? "ring-1 ring-blue-600" : ""}`}
              >
                {format(day, 'd')}
                {hasHoliday && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-pink-500" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Upcoming Holidays */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-slate-800 text-sm flex items-center gap-2">
            <CalendarIcon size={16} className="text-pink-500" />
            Upcoming Holidays
          </h3>
          <button className="text-xs text-blue-600 font-medium hover:underline">View All</button>
        </div>
        
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-slate-400">Loading...</div>
          ) : holidays.length === 0 ? (
            <div className="text-sm text-slate-400 text-center py-4">No upcoming holidays</div>
          ) : (
            holidays.filter((h: any) => parseISO(h.date) >= new Date(new Date().setHours(0,0,0,0))).slice(0, 5).map((h: any) => (
              <div key={h.id} className="flex gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-50 border border-pink-100 flex flex-col items-center justify-center flex-shrink-0 text-pink-600">
                  <span className="text-[10px] font-bold uppercase">{format(parseISO(h.date), 'MMM')}</span>
                  <span className="text-sm font-black leading-none">{format(parseISO(h.date), 'd')}</span>
                </div>
                <div>
                  <div className="text-sm font-medium text-slate-700">{h.name}</div>
                  <div className="text-xs text-slate-500">{h.type.replace('_', ' ')}</div>
                </div>
              </div>
            ))
          )}
        </div>
        
        <button className="w-full mt-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 text-sm font-medium rounded-xl transition-colors border border-slate-200">
          ?? Manage Holidays
        </button>
      </div>
    </div>
  );
}
