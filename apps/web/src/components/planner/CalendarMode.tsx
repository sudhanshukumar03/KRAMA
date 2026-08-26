import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useHolidays } from '../../hooks/useHolidays';
import { COUNTRIES, INDIAN_STATES } from './LocationSettingsModal';

interface Props {
  data: any; // this is the week data, but CalendarMode now shows a full month or more!
  days: Date[]; // Currently displayed week days, but we want full month in Calendar Mode
}

export function CalendarMode({ data, days }: Props) {
  const [activeTab, setActiveTab] = useState<'india' | 'world'>('india');
  
  // For India tab
  const defaultIndiaRegion = data.config?.countryCode === 'IN' ? (data.config?.regionCode || '') : '';
  const [indiaRegion, setIndiaRegion] = useState(defaultIndiaRegion);

  // For World tab
  const [worldCountry, setWorldCountry] = useState(data.config?.countryCode !== 'IN' ? data.config?.countryCode : 'US');
  
  // We use the first day of the week as the reference for the month being viewed
  const referenceDate = days[0];

  const currentCountry = activeTab === 'india' ? 'IN' : worldCountry;
  const currentRegion = activeTab === 'india' ? (indiaRegion || null) : null;

  const { data: monthData, isLoading } = useHolidays(currentCountry, currentRegion, referenceDate);

  const holidays = monthData?.holidays || [];

  const publicHolidays = holidays.filter((h: any) => h.isPublicHoliday);
  const observances = holidays.filter((h: any) => !h.isPublicHoliday);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('india')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'india' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            India Holidays
          </button>
          <button
            onClick={() => setActiveTab('world')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'world' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            World Calendar
          </button>
        </div>

        <div>
          {activeTab === 'india' ? (
            <select
              value={indiaRegion}
              onChange={(e) => setIndiaRegion(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="">All India (National Only)</option>
              {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
          ) : (
            <select
              value={worldCountry}
              onChange={(e) => setWorldCountry(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-blue-500"
            >
              {COUNTRIES.filter(c => c.code !== 'WORLD').map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <h2 className="text-xl font-bold text-slate-800 mb-4">{format(referenceDate, 'MMMM yyyy')}</h2>
        
        {isLoading ? (
          <div className="text-slate-500 py-10 text-center animate-pulse">Loading calendar data...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Public Holidays</h3>
              {publicHolidays.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No public holidays this month.</p>
              ) : (
                <div className="space-y-4">
                  {publicHolidays.map((h: any) => (
                    <div key={h.id} className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-pink-50 border border-pink-100 flex flex-col items-center justify-center flex-shrink-0 text-pink-600">
                        <span className="text-[10px] font-bold uppercase">{format(parseISO(h.date), 'MMM')}</span>
                        <span className="text-base font-black leading-none">{format(parseISO(h.date), 'd')}</span>
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-700">{h.name}</div>
                        <div className="text-xs font-medium text-pink-600 uppercase tracking-wider mt-0.5">{h.type.replace('_', ' ')}</div>
                        {h.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{h.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-slate-100 pb-2">Festivals & Observances</h3>
              {observances.length === 0 ? (
                <p className="text-sm text-slate-500 italic">No observances this month.</p>
              ) : (
                <div className="space-y-4">
                  {observances.map((h: any) => (
                    <div key={h.id} className="flex gap-4 items-start">
                      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center flex-shrink-0 text-slate-500">
                        <span className="text-[10px] font-bold uppercase">{format(parseISO(h.date), 'MMM')}</span>
                        <span className="text-base font-black leading-none">{format(parseISO(h.date), 'd')}</span>
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-700">{h.name}</div>
                        <div className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-0.5">{h.type.replace('_', ' ')}</div>
                        {h.description && <div className="text-xs text-slate-500 mt-1 line-clamp-2">{h.description}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
