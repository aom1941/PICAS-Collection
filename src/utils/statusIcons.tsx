import React from 'react';
import {
  Check,
  X,
  Minus,
  Smartphone,
  Monitor,
  Tablet,
  Tv,
  Database,
  BookOpen,
  Sliders,
  Eye,
  BarChart2,
  List,
  CheckSquare,
  Crosshair,
  Activity,
  Layers,
  type LucideIcon,
} from 'lucide-react';

export type TriageStatus = 'pick' | 'reject' | 'skip';

/**
 * Returns the appropriate Lucide icon component for a triage status,
 * ensuring consistent visual language and geometric shape accessibility (SPEC §7)
 * across iPhone, Leitstand, and OLED views.
 *
 * - 'pick' / 'triage.pick'     -> Check (Checkmark ✓)
 * - 'reject' / 'triage.reject' -> X (Cross ✕)
 * - 'skip' / 'triage.skip'     -> Minus (Minus −)
 */
export function getStatusIcon(
  status: 'pick' | 'reject' | 'skip' | 'triage.pick' | 'triage.reject' | 'triage.skip' | string
): LucideIcon {
  if (status === 'pick' || status === 'triage.pick') {
    return Check;
  }
  if (status === 'reject' || status === 'triage.reject') {
    return X;
  }
  return Minus;
}

/**
 * Icon mapping for all primary menu items across PICAS devices and views.
 */
export const MENU_ICONS = {
  // Main Device / System Navigation
  iphone: Smartphone,
  leitstand: Monitor,
  ipad: Tablet,
  oled: Tv,
  eventlog: Database,
  spec: BookOpen,

  // Leitstand Tabs
  inspect: Eye,
  probe: Sliders,
  deltap: BarChart2,

  // Event Log Tabs
  events: List,
  triage_view: CheckSquare,
  marks_view: Crosshair,
  deltap_view: Activity,

  // General Curatorial Views
  curator: Layers,
} as const;

export type MenuItemKey = keyof typeof MENU_ICONS;

/**
 * Helper to retrieve a Lucide icon for any navigation or sub-menu item.
 */
export function getMenuIcon(key: MenuItemKey | string): LucideIcon {
  if (key in MENU_ICONS) {
    return MENU_ICONS[key as MenuItemKey];
  }
  return List;
}

/**
 * Accessible Toggle On/Off Switch Component
 * Conforms to WCAG 2.1 AA accessibility guidelines (ARIA switch role, keyboard focus, high contrast).
 */
export interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  activeColor?: string;
  icon?: LucideIcon;
  className?: string;
  ariaLabel?: string;
}

export const ToggleSwitch: React.FC<ToggleSwitchProps> = ({
  checked,
  onChange,
  label,
  description,
  disabled = false,
  size = 'md',
  activeColor = 'bg-[#3d5a80]',
  icon: Icon,
  className = '',
  ariaLabel,
}) => {
  const sizeConfig = {
    sm: {
      track: 'w-7 h-4',
      thumb: 'w-3 h-3',
      translate: 'translate-x-3',
      text: 'text-[11px]',
      icon: 'w-2 h-2',
    },
    md: {
      track: 'w-9 h-5',
      thumb: 'w-3.5 h-3.5',
      translate: 'translate-x-4',
      text: 'text-xs',
      icon: 'w-2.5 h-2.5',
    },
    lg: {
      track: 'w-11 h-6',
      thumb: 'w-4.5 h-4.5',
      translate: 'translate-x-5',
      text: 'text-sm',
      icon: 'w-3 h-3',
    },
  };

  const currentSize = sizeConfig[size];

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      onChange(!checked);
    }
  };

  return (
    <div
      onClick={() => !disabled && onChange(!checked)}
      className={`inline-flex items-center gap-2 cursor-pointer select-none leading-none ${
        disabled ? 'opacity-40 cursor-not-allowed' : ''
      } ${className}`}
    >
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel || label || 'Umschalter'}
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          if (!disabled) onChange(!checked);
        }}
        onKeyDown={handleKeyDown}
        className={`relative inline-flex items-center rounded-full p-0.5 transition-colors duration-200 ease-in-out focus:outline-hidden focus-visible:ring-2 focus-visible:ring-[#3d5a80] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0c10] border border-stone-700/80 ${
          currentSize.track
        } ${checked ? `${activeColor} border-white/20` : 'bg-stone-800'}`}
      >
        <span
          className={`inline-flex items-center justify-center rounded-full bg-white shadow-xs transform transition-transform duration-200 ease-in-out ${
            currentSize.thumb
          } ${checked ? `${currentSize.translate} text-stone-900` : 'translate-x-0 text-stone-400'}`}
        >
          {Icon ? (
            <Icon className={currentSize.icon} />
          ) : checked ? (
            <Check className={`${currentSize.icon} stroke-[3] text-[#3d5a80]`} />
          ) : (
            <X className={`${currentSize.icon} stroke-[3] text-stone-400`} />
          )}
        </span>
      </button>

      {(label || description) && (
        <div className="flex flex-col text-left">
          {label && (
            <span className={`font-sans font-medium text-stone-200 ${currentSize.text} leading-tight`}>
              {label}
            </span>
          )}
          {description && (
            <span className="font-sans text-[10px] text-stone-400 leading-tight">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
