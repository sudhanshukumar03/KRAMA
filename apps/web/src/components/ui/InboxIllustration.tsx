import { useId } from 'react';

export function InboxIllustration() {
  const id = useId();
  return (
    <svg className="inbox-illustration" viewBox="0 0 440 236" fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-front`} x1="144" y1="163" x2="291" y2="216" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--inbox-tray-light)" /><stop offset="1" stopColor="var(--inbox-tray-dark)" />
        </linearGradient>
        <linearGradient id={`${id}-rim`} x1="158" y1="121" x2="286" y2="160" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--inbox-rim)" /><stop offset="1" stopColor="var(--inbox-tray-light)" />
        </linearGradient>
        <linearGradient id={`${id}-paper`} x1="197" y1="92" x2="252" y2="180" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--inbox-paper-top)" /><stop offset="1" stopColor="var(--inbox-paper-bottom)" />
        </linearGradient>
        <linearGradient id={`${id}-back-paper`} x1="189" y1="78" x2="245" y2="177" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--inbox-paper-bottom)" /><stop offset="1" stopColor="var(--inbox-tray-light)" />
        </linearGradient>
        <radialGradient id={`${id}-ground`}><stop stopColor="rgb(var(--shadow-color))" stopOpacity=".3" /><stop offset="1" stopColor="rgb(var(--shadow-color))" stopOpacity="0" /></radialGradient>
        <filter id={`${id}-paper-shadow`} x="-30%" y="-20%" width="160%" height="150%"><feDropShadow dx="-2" dy="5" stdDeviation="4" floodColor="rgb(var(--shadow-color))" floodOpacity=".24" /></filter>
      </defs>
      <g stroke="var(--text-secondary)" strokeWidth="1.7" opacity=".4">
        <path d="M152 170C113 165 83 148 81 112M299 169C337 166 365 143 367 112" strokeDasharray="3 5" opacity=".65" />
        <g transform="rotate(-16 80 102)"><rect x="65" y="84" width="30" height="35" rx="5" /><path d="M72 94h15M72 102h12M72 110h16" /></g>
        <circle cx="368" cy="88" r="18" /><path d="m358 88 7 7 13-14" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="m27 142 10 7m-3-12-5 16m84-47 10-9m-10 0 10 9m274 29 10 9m-10 0 10-9m-86-27 10-8m-10 0 10 8" strokeLinecap="round" opacity=".6" />
      </g>
      <ellipse cx="223" cy="216" rx="105" ry="18" fill={`url(#${id}-ground)`} />
      <path d="m141 150 20-32a12 12 0 0 1 10-6h101a12 12 0 0 1 10 6l19 32v40H141Z" fill="var(--inbox-tray-dark)" stroke={`url(#${id}-rim)`} strokeWidth="6" strokeLinejoin="round" />
      <g filter={`url(#${id}-paper-shadow)`}>
        <g transform="rotate(3 217 130)"><rect x="173" y="83" width="91" height="103" rx="8" fill={`url(#${id}-back-paper)`} stroke="var(--border-subtle)" /></g>
        <g transform="rotate(8 223 140)"><rect x="183" y="96" width="94" height="99" rx="8" fill="var(--inbox-paper-bottom)" stroke="var(--border-subtle)" /></g>
        <g transform="rotate(10 230 146)"><rect x="190" y="106" width="95" height="94" rx="8" fill={`url(#${id}-paper)`} stroke="var(--border-subtle)" /><path d="M207 126h21M207 143h53M207 160h44M207 177h34" stroke="var(--inbox-paper-line)" strokeWidth="6" strokeLinecap="round" /></g>
      </g>
      <path d="M140 157h48l8 9h48l8-9h49v39a12 12 0 0 1-12 12H152a12 12 0 0 1-12-12Z" fill={`url(#${id}-front)`} stroke="var(--border-default)" />
      <path d="M144 157h44l8 9h48l8-9h45" stroke="var(--inbox-rim)" strokeWidth="2" strokeLinejoin="round" />
      <path d="M202 184h37" stroke="var(--accent)" strokeWidth="6" strokeLinecap="round" />
      <path d="M205 183h31" stroke="var(--accent-fg)" strokeWidth="2" strokeLinecap="round" opacity=".65" />
      <g stroke="var(--accent-fg)" strokeWidth="4" strokeLinecap="round"><path d="M220 59V36M203 60l-5-9M237 60l5-9" /></g>
    </svg>
  );
}
