/**
 * TriageBadge — WCAG & SPEC §7 Accessibility Compliant Badge
 *
 * SPEC §7: Color-blindness guidelines require that color-coded states
 * (Indigoblau #3d5a80 for Pick, Oxidrot #c23010 for Reject) MUST always be
 * supplemented by distinct geometric shapes (Checkmark ✓ vs Cross ✕) so that
 * users with protanopia, deuteranopia, or monochromacy can identify states without color.
 */

import React from 'react';
import { getStatusIcon } from '../utils/statusIcons';
export { getStatusIcon } from '../utils/statusIcons';

export type TriageStateValue =
  | 'triage.pick'
  | 'triage.reject'
  | 'triage.skip'
  | 'pick'
  | 'reject'
  | 'skip'
  | undefined
  | null;

interface TriageBadgeProps {
  state: TriageStateValue;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  showIcon?: boolean;
  label?: string;
  variant?: 'dark' | 'light';
  className?: string;
}

export const TriageBadge: React.FC<TriageBadgeProps> = ({
  state,
  size = 'sm',
  showLabel = true,
  showIcon = true,
  label,
  variant = 'dark',
  className = '',
}) => {
  if (!state) return null;

  const isPick = state === 'triage.pick' || state === 'pick';
  const isReject = state === 'triage.reject' || state === 'reject';
  const isSkip = state === 'triage.skip' || state === 'skip';

  const defaultLabel = isPick ? 'Pick' : isReject ? 'Reject' : 'Skip';
  const displayLabel = label || defaultLabel;

  // Icon sizing
  const iconSizes = {
    xs: 'w-2.5 h-2.5 stroke-[3]',
    sm: 'w-3 h-3 stroke-[2.5]',
    md: 'w-3.5 h-3.5 stroke-[2.5]',
    lg: 'w-5 h-5 stroke-[3]',
  };

  const padSizes = {
    xs: showLabel ? 'px-1.5 py-0.5 text-[10px] gap-1' : 'w-4 h-4 p-0.5 justify-center',
    sm: showLabel ? 'px-2 py-0.5 text-[11px] gap-1.5' : 'w-5 h-5 p-1 justify-center',
    md: showLabel ? 'px-2.5 py-1 text-xs gap-1.5' : 'w-6 h-6 p-1 justify-center',
    lg: showLabel ? 'px-3.5 py-1.5 text-sm gap-2' : 'w-8 h-8 p-1.5 justify-center',
  };

  // Color schemas according to SPEC §7
  // Pick: Indigoblau #3d5a80 (Never text on black! Use white text on Indigoblau or Indigoblau container)
  // Reject: Oxidrot #c23010
  // Skip: Stone-700 / Stone-500
  let colorClasses = '';
  if (variant === 'dark') {
    if (isPick) {
      colorClasses = 'bg-[#3d5a80] text-white border border-[#5277a7] shadow-xs';
    } else if (isReject) {
      colorClasses = 'bg-[#c23010] text-white border border-[#e05638] shadow-xs';
    } else {
      colorClasses = 'bg-stone-800 text-stone-300 border border-stone-700';
    }
  } else {
    // Light variant (e.g. iPad Patent-Papier #FAF7F2)
    if (isPick) {
      colorClasses = 'bg-[#3d5a80]/15 text-[#2b405d] border border-[#3d5a80]/50';
    } else if (isReject) {
      colorClasses = 'bg-[#c23010]/15 text-[#9a240b] border border-[#c23010]/50';
    } else {
      colorClasses = 'bg-stone-200 text-stone-700 border border-stone-300';
    }
  }

  const Icon = getStatusIcon(state);

  return (
    <span
      className={`inline-flex items-center rounded-md font-sans font-semibold leading-none select-none ${padSizes[size]} ${colorClasses} ${className}`}
      title={isPick ? 'Pick (Indigoblau · Häkchen ✓)' : isReject ? 'Reject (Oxidrot · Kreuz ✕)' : 'Skip (Übersprungen · Minus −)'}
      role="status"
      aria-label={displayLabel}
    >
      {showIcon && (
        <span className="shrink-0 flex items-center justify-center" aria-hidden="true">
          <Icon className={iconSizes[size]} />
        </span>
      )}
      {showLabel && <span className="leading-none">{displayLabel}</span>}
    </span>
  );
};
