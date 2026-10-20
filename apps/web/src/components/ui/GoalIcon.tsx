import React from 'react';
import type { LucideProps } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Custom Worthful Goal Icons for Krama OS
 * 
 * Standard Lucide target icons feel like generic flat dartboards.
 * These bespoke icons embody true strategic ambition, precision engineering,
 * and high-impact aspiration.
 */

/**
 * 1. GoalIcon / GoalNorthStarIcon (Flagship)
 * The "True North Compass Target":
 * Blends precision calibration reticles with a radiating 4-pointed North Star.
 * Symbolizes long-range vision, alignment, and pinpoint execution.
 */
export const GoalIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-goal-northstar', className)}
      {...props}
    >
      {/* Outer Telemetry Horizon Ring */}
      <circle cx="12" cy="12" r="9" />
      {/* Cardinal Calibration Ticks */}
      <path d="M12 1.5v3" />
      <path d="M12 19.5v3" />
      <path d="M1.5 12h3" />
      <path d="M19.5 12h3" />
      {/* Center Strategic North Star Diamond */}
      <path d="M12 6.5l1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5z" />
      {/* Center Convergence Hub */}
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  )
);
GoalIcon.displayName = 'GoalIcon';

/**
 * 2. GoalSummitIcon
 * The "Summit Peak Milestone":
 * Ascending mountain topography with summit flag and north star beacon.
 * Symbolizes conquering multi-stage milestones and difficult summits.
 */
export const GoalSummitIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-goal-summit', className)}
      {...props}
    >
      {/* Mountain Topography */}
      <path d="M2 20l7-10 3.5 4.5 5.5-9.5 4 15" />
      {/* Ground Baseline */}
      <path d="M2 20h20" />
      {/* Summit Flag */}
      <path d="M18 5V2l3.5 1.5L18 5" />
      {/* Guiding Celestial Beacon */}
      <circle cx="7" cy="5" r="1.25" fill="currentColor" />
      <path d="M7 2.5v1M7 6.5v1M4.5 5h1M8.5 5h1" strokeWidth={1.5} />
    </svg>
  )
);
GoalSummitIcon.displayName = 'GoalSummitIcon';

/**
 * 3. GoalReticleIcon / GoalFlagIcon
 * The "Bullseye Milestone Target":
 * Concentric high-precision calibration circles with a victory flag planted at the epicenter.
 */
export const GoalReticleIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-goal-reticle', className)}
      {...props}
    >
      {/* Center Flagpole & Pennant */}
      <path d="M12 13V2l8 4-8 4" />
      {/* Outer Horizon Ring */}
      <path d="M20.56 10.22A9 9 0 1 1 8.01 4.93" />
      {/* Inner Calibration Orbit */}
      <path d="M8 10a5 5 0 1 0 8.9 2.02" />
      {/* Center Anchor Point */}
      <circle cx="12" cy="13" r="1.2" fill="currentColor" />
    </svg>
  )
);
GoalReticleIcon.displayName = 'GoalReticleIcon';

/**
 * 4. GoalVectorIcon
 * The "High-Velocity Aspiration Vector":
 * Concentric reticle with a forward ascending trajectory piercing the horizon.
 */
export const GoalVectorIcon = React.forwardRef<SVGSVGElement, LucideProps>(
  ({ className, size = 24, strokeWidth = 2, ...props }, ref) => (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('lucide lucide-goal-vector', className)}
      {...props}
    >
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="4.5" />
      {/* Ascending Vector Arrow */}
      <path d="M6 18L18 6" />
      <path d="M12 6h6v6" />
    </svg>
  )
);
GoalVectorIcon.displayName = 'GoalVectorIcon';

export default GoalIcon;
