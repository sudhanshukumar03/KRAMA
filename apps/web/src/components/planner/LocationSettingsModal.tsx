import { useState, useEffect } from 'react';
import { X, Globe2, MapPin } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/client';
import { toast } from 'sonner';
import { INDIAN_STATES, COUNTRIES } from './locationConstants';
import { useModalA11y } from '../../hooks/useModalA11y';
interface Props {
 open: boolean;
 onClose: () => void;
 currentCountry: string;
 currentRegion: string;
}

export function LocationSettingsModal({ open, onClose, currentCountry, currentRegion }: Props) {
 const [country, setCountry] = useState(currentCountry || 'IN');
 const [region, setRegion] = useState(currentRegion || '');
 const queryClient = useQueryClient();

 useEffect(() => {
 if (open) {
 setCountry(currentCountry || 'IN');
 setRegion(currentRegion || '');
 }
 }, [open, currentCountry, currentRegion]);

 const saveMutation = useMutation({
 mutationFn: async (data: { countryCode: string; regionCode: string }) => {
 return api.auth.updatePreferences({ 
 locationConfig: { countryCode: data.countryCode, regionCode: data.regionCode } 
 });
 },
 onSuccess: () => {
 queryClient.invalidateQueries({ queryKey: ['planner'] });
 queryClient.invalidateQueries({ queryKey: ['planner-holidays'] });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
 toast.success('Calendar location updated');
 onClose();
 },
 onError: () => {
 toast.error('Failed to update location');
 }
 });

 const dialogRef = useModalA11y(open, onClose);

 if (!open) return null;

 const selectedCountryLabel = COUNTRIES.find(c => c.code === country)?.name || country;

 return (
 <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-in fade-in duration-150" onClick={onClose}>
 <div ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="location-modal-title" tabIndex={-1} className="krama-dialog w-full max-w-sm animate-in slide-in-from-bottom-4 duration-200 outline-none overflow-hidden" onClick={e => e.stopPropagation()}>
 <div className="flex items-center justify-between px-5 py-4 border-b border-border">
 <h3 id="location-modal-title" className="font-semibold text-primary">Calendar Location</h3>
 <button onClick={onClose} aria-label="Close" className="text-muted hover:text-primary bg-surface-hover hover:bg-surface-hover rounded-lg p-1.5">
 <X size={16} />
 </button>
 </div>

 <div className="p-5 space-y-4">
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1"><Globe2 size={12}/> Country</label>
 <select aria-label="Country"
 value={country}
 onChange={e => {
 setCountry(e.target.value);
 if (e.target.value !== 'IN') setRegion('');
 }}
 className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-surface-hover text-primary"
 >
 {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
 </select>
 </div>

 {country === 'IN' && (
 <div>
 <label className="block text-label font-bold text-muted uppercase tracking-wider mb-1.5 flex items-center gap-1"><MapPin size={12}/> State / UT</label>
 <select aria-label="State or union territory"
 value={region}
 onChange={e => setRegion(e.target.value)}
 className="w-full px-3 py-2 rounded-lg border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-sm bg-surface-hover text-primary"
 >
 <option value="">-- All India (National Only) --</option>
 {INDIAN_STATES.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
 </select>
 </div>
 )}
 
 <div className="bg-surface-hover rounded-lg p-3 text-xs text-muted mt-2 border border-border">
 <div className="font-semibold mb-1 text-primary">Holiday coverage</div>
 Public holidays are shown for <span className="font-mono text-accent bg-accent-subtle px-1 py-0.5 rounded">{selectedCountryLabel}</span>{region ? <> · region <span className="font-mono text-accent bg-accent-subtle px-1 py-0.5 rounded">{region}</span></> : null}.
 </div>

 <div className="pt-2">
 <button
 onClick={() => saveMutation.mutate({ countryCode: country, regionCode: region })}
 disabled={saveMutation.isPending}
 className="krama-btn krama-btn-primary w-full py-2.5 text-xs font-semibold shadow-xs disabled:opacity-50"
 >
 Save Changes
 </button>
 </div>
 </div>
 </div>
 </div>
 );
}
