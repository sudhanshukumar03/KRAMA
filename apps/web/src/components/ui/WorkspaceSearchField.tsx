import { Search, X } from 'lucide-react';

export function WorkspaceSearchField({ value, onChange, label, placeholder, id }: {
  value: string;
  onChange: (value: string) => void;
  label: string;
  placeholder: string;
  id?: string;
}) {
  return <div className="workspace-search-control">
    <Search size={17} aria-hidden="true" />
    <input id={id} type="search" aria-label={label} placeholder={placeholder} value={value} onChange={event => onChange(event.target.value)} />
    {value && <button type="button" aria-label="Clear search" onClick={() => onChange('')}><X size={16} aria-hidden="true" /></button>}
  </div>;
}
