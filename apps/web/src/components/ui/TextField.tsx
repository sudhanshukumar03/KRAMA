import { useId, type InputHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';
import './primitives.css';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextField({ label, hint, error, id, className, ...input }: TextFieldProps) {
  const generatedId = useId();
  const fieldId = id || generatedId;
  const helpId = `${fieldId}-help`;
  const description = [input['aria-describedby'], hint || error ? helpId : undefined].filter(Boolean).join(' ') || undefined;
  return (
    <div className="krama-field">
      <label htmlFor={fieldId}>{label}</label>
      <input {...input} id={fieldId} className={cn('krama-input krama-field-control', className)} aria-invalid={error ? true : input['aria-invalid']} aria-describedby={description} />
      {(error || hint) && <p id={helpId} className={error ? 'krama-field-error' : 'krama-field-hint'}>{error || hint}</p>}
    </div>
  );
}
