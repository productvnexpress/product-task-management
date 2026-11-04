/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { VdsIcon } from './icons';
import logoStandard from './logos/Logo__VnExpress__Standard.svg?raw';
import logomark from './logos/Logo__VnExpress__Logomark__Standard.svg?raw';

/**
 * Component VDS 0.5.0 viết cho React: dựng đúng HTML và class `vds-*` như tab HTML trong
 * tài liệu VDS (VDS không phát hành gói React). CSS: public/vds/0.5.0/components/vds-components.css.
 * Tên, thuộc tính theo component trong Figma: Button (Type, Size, State), Selection Item Chip, Tabs, Alert Toast.
 */

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ');

/* ---------- Button ---------- */

export type VdsButtonVariant =
  | 'uncontained'
  | 'contained'
  | 'contained-bordered'
  | 'ghost'
  | 'ghost-subdued'
  | 'ghost-on-color'
  | 'accent'
  | 'accent-subdued'
  | 'support'
  | 'link-subtle'
  | 'link'
  | 'info-uncontained'
  | 'info-contained'
  | 'positive-uncontained'
  | 'positive-contained'
  | 'warning-uncontained'
  | 'warning-contained'
  | 'negative-uncontained'
  | 'negative-contained';

interface VdsButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: VdsButtonVariant;
  size?: 'sm' | 'md' | 'lg';
  /** Tên icon VDS bỏ theme và cỡ, vd "Add" */
  iconLeft?: string;
  iconRight?: string;
  /** Chỉ có icon (bắt buộc aria-label) */
  icon?: string;
  circle?: boolean;
  selected?: 'a' | 'b';
  fullWidth?: boolean;
}

export const VdsButton = React.forwardRef<HTMLButtonElement, VdsButtonProps>(
  (
    { variant = 'contained', size = 'md', iconLeft, iconRight, icon, circle, selected, fullWidth, className, children, type = 'button', ...rest },
    ref
  ) => {
    const iconPx = size === 'sm' ? 16 : 20;
    const renderIcon = (name: string) => (
      <span className="vds-button__icon" aria-hidden="true">
        <VdsIcon name={name} size={iconPx} />
      </span>
    );
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={selected ? true : undefined}
        className={cx(
          'vds-button vds-state-layer vds-focus-ring',
          (variant === 'accent' || variant === 'support' || variant === 'ghost-on-color') && 'vds-state-layer--on-color',
          `vds-button--${variant}`,
          size !== 'md' && `vds-button--${size}`,
          icon && 'vds-button--icon-only',
          icon && circle && 'vds-button--circle',
          selected && `vds-button--selected-${selected}`,
          fullWidth && 'vds-button--full-width',
          className
        )}
        {...rest}
      >
        {icon ? (
          renderIcon(icon)
        ) : (
          <>
            {iconLeft && renderIcon(iconLeft)}
            <span className="vds-button__label">{children}</span>
            {iconRight && renderIcon(iconRight)}
          </>
        )}
      </button>
    );
  }
);
VdsButton.displayName = 'VdsButton';

/* ---------- Selection Item Chip ---------- */

interface VdsChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean;
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  /** "radio": chọn một trong nhóm (đặt trong role="radiogroup"); mặc định bật tắt từng chip */
  mode?: 'toggle' | 'radio';
}

export const VdsChip: React.FC<VdsChipProps> = ({ selected = false, size = 'md', icon, mode = 'toggle', className, children, ...rest }) => (
  <button
    type="button"
    role={mode === 'radio' ? 'radio' : undefined}
    aria-checked={mode === 'radio' ? selected : undefined}
    aria-pressed={mode === 'toggle' ? selected : undefined}
    className={cx(
      'vds-selection-item-chip vds-state-layer vds-focus-ring',
      size !== 'md' && `vds-selection-item-chip--${size}`,
      selected && 'vds-selection-item-chip--selected',
      className
    )}
    {...rest}
  >
    {icon && (
      <span className="vds-selection-item-chip__icon" aria-hidden="true">
        <VdsIcon name={icon} size={24} />
      </span>
    )}
    {children}
  </button>
);

/* ---------- Tabs ---------- */

interface VdsTabsProps<T extends string> {
  items: { id: T; label: string; disabled?: boolean }[];
  value: T;
  onChange: (id: T) => void;
  'aria-label': string;
  fixed?: boolean;
  className?: string;
}

export function VdsTabs<T extends string>({ items, value, onChange, fixed, className, ...rest }: VdsTabsProps<T>) {
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const enabled = items.filter((i) => !i.disabled);
    const idx = enabled.findIndex((i) => i.id === value);
    const next = enabled[(idx + (e.key === 'ArrowRight' ? 1 : -1) + enabled.length) % enabled.length];
    if (next) {
      e.preventDefault();
      onChange(next.id);
      (e.currentTarget.querySelector(`[data-tab="${next.id}"]`) as HTMLButtonElement | null)?.focus();
    }
  };
  return (
    <div className={cx('vds-tabs', fixed && 'vds-tabs--fixed', className)} role="tablist" aria-label={rest['aria-label']} onKeyDown={onKeyDown}>
      {items.map((it) => {
        const isOn = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            data-tab={it.id}
            className="vds-tabs__item"
            aria-selected={isOn}
            tabIndex={isOn ? 0 : -1}
            disabled={it.disabled}
            onClick={() => onChange(it.id)}
          >
            <span className="vds-tabs__label" data-text={it.label}>
              <span>{it.label}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Alert Toast ---------- */

type AlertContext = 'info' | 'positive' | 'warning' | 'negative';
const ALERT_ICON: Record<AlertContext, string> = {
  info: 'Info',
  positive: 'CheckmarkCircle',
  warning: 'Warning',
  negative: 'Warning',
};

interface VdsAlertToastProps {
  context?: AlertContext;
  title: string;
  children?: React.ReactNode;
  action?: { label: string; onClick: () => void };
  onDismiss?: () => void;
  role?: 'status' | 'alert';
  className?: string;
}

export const VdsAlertToast: React.FC<VdsAlertToastProps> = ({ context = 'info', title, children, action, onDismiss, role = 'status', className }) => (
  <div
    className={cx('vds-alert-toast', context !== 'info' && `vds-alert-toast--${context}`, onDismiss && 'vds-alert-toast--dismissible', className)}
    role={role}
  >
    <span className="vds-alert-toast__icon" aria-hidden="true">
      <VdsIcon name={ALERT_ICON[context]} fill="currentColor" size={20} />
    </span>
    <div className="vds-alert-toast__body">
      <p className="vds-alert-toast__title">{title}</p>
      {children && <div className="vds-alert-toast__message">{children}</div>}
    </div>
    {action && (
      <VdsButton variant={`${context}-contained` as VdsButtonVariant} size="sm" className="vds-alert-toast__action" onClick={action.onClick}>
        {action.label}
      </VdsButton>
    )}
    {onDismiss && (
      <VdsButton variant={`${context}-uncontained` as VdsButtonVariant} icon="Dismiss" aria-label="Đóng" className="vds-alert-toast__dismiss" onClick={onDismiss} />
    )}
  </div>
);

/* ---------- Logo (themeable: màu theo token, tự đổi light/dark) ---------- */

export const VdsLogo: React.FC<{ name?: 'Logo__VnExpress__Standard' | 'Logo__VnExpress__Logomark__Standard'; className?: string; title?: string }> = ({
  name = 'Logo__VnExpress__Standard',
  className,
  title = 'VnExpress',
}) => (
  <span
    role="img"
    aria-label={title}
    className={cx('inline-flex [&>svg]:w-full [&>svg]:h-full', className)}
    dangerouslySetInnerHTML={{ __html: name === 'Logo__VnExpress__Standard' ? logoStandard : logomark }}
  />
);
