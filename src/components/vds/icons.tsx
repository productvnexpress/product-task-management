/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import iconMap from './icon-map.json';

/**
 * Icon VDS (bộ Fluent của VnExpress Design System), gọi theo tên qua sprite
 * public/vds/<phiên bản>/icons/sprite.svg (dựng bằng scripts/build-vds-icon-sprite.mjs).
 *
 * Mỗi icon export đúng tên cũ của lucide-react (X, Plus, Check...) để thay import
 * mà không sửa nơi dùng. Bảng đối chiếu tên: icon-map.json.
 * Cỡ file chọn theo kích thước hiển thị (16/20/24), màu nhận từ `color` (currentColor).
 */

const SPRITE = '/vds/0.5.0/icons/sprite.svg';
const FILLED = new Set(['Star', 'Play', 'CheckmarkCircle', 'Circle', 'Alert', 'Warning', 'Info']);

export interface VdsIconProps extends Omit<React.SVGProps<SVGSVGElement>, 'ref'> {
  size?: number | string;
  strokeWidth?: number | string;
}

/** Kích thước hiển thị (px) suy ra từ `size` hoặc class Tailwind w-* */
const resolvePx = (size: VdsIconProps['size'], className?: string): number => {
  if (size !== undefined) return Number(size) || 24;
  const m = className?.match(/(?:^|\s)w-(\[(\d+)px\]|(\d+(?:\.\d+)?))(?=\s|$)/);
  if (m) return m[2] ? Number(m[2]) : Number(m[3]) * 4;
  return 24;
};

const fileSize = (px: number) => (px <= 17 ? 16 : px <= 21 ? 20 : 24);

export const VdsIcon = ({
  name,
  size,
  strokeWidth: _strokeWidth,
  fill,
  className,
  ...rest
}: VdsIconProps & { name: string }) => {
  const px = resolvePx(size, className);
  const filled = FILLED.has(name) && ((fill && fill !== 'none') || /\bfill-current\b/.test(className || ''));
  const id = `${name}__${filled ? 'Filled' : 'Regular'}__${fileSize(px)}`;
  const label = rest['aria-label'];
  return (
    <svg
      width={px}
      height={px}
      className={className}
      aria-hidden={label ? undefined : true}
      focusable="false"
      data-vds-icon={id}
      {...rest}
    >
      <use href={`${SPRITE}#${id}`} />
    </svg>
  );
};

const make = (lucideName: keyof typeof iconMap) => {
  const name = iconMap[lucideName];
  const Icon = (props: VdsIconProps) => <VdsIcon name={name} {...props} />;
  Icon.displayName = lucideName;
  return Icon;
};

export const AlertCircle = make('AlertCircle');
export const AlertOctagon = make('AlertOctagon');
export const AlertTriangle = make('AlertTriangle');
export const ArrowDown = make('ArrowDown');
export const ArrowRight = make('ArrowRight');
export const ArrowRightCircle = make('ArrowRightCircle');
export const ArrowUp = make('ArrowUp');
export const AtSign = make('AtSign');
export const Award = make('Award');
export const Ban = make('Ban');
export const BarChart3 = make('BarChart3');
export const Bell = make('Bell');
export const BellRing = make('BellRing');
export const Briefcase = make('Briefcase');
export const Building = make('Building');
export const Building2 = make('Building2');
export const Calculator = make('Calculator');
export const Calendar = make('Calendar');
export const CalendarClock = make('CalendarClock');
export const CalendarDays = make('CalendarDays');
export const CalendarPlus = make('CalendarPlus');
export const Check = make('Check');
export const CheckCheck = make('CheckCheck');
export const CheckCircle2 = make('CheckCircle2');
export const CheckSquare = make('CheckSquare');
export const ChevronDown = make('ChevronDown');
export const ChevronLeft = make('ChevronLeft');
export const ChevronRight = make('ChevronRight');
export const ChevronUp = make('ChevronUp');
export const ChevronsUpDown = make('ChevronsUpDown');
export const CircleDot = make('CircleDot');
export const Clock = make('Clock');
export const Compass = make('Compass');
export const Copy = make('Copy');
export const CornerDownLeft = make('CornerDownLeft');
export const DarkTheme = make('DarkTheme');
export const Desktop = make('Desktop');
export const Edit2 = make('Edit2');
export const Edit3 = make('Edit3');
export const ExternalLink = make('ExternalLink');
export const Eye = make('Eye');
export const EyeOff = make('EyeOff');
export const FileText = make('FileText');
export const Filter = make('Filter');
export const Flag = make('Flag');
export const Flame = make('Flame');
export const FlaskConical = make('FlaskConical');
export const Folder = make('Folder');
export const FolderKanban = make('FolderKanban');
export const FolderOpen = make('FolderOpen');
export const FolderPlus = make('FolderPlus');
export const Globe = make('Globe');
export const Hash = make('Hash');
export const HelpCircle = make('HelpCircle');
export const History = make('History');
export const Info = make('Info');
export const KeyRound = make('KeyRound');
export const Laptop = make('Laptop');
export const Layers = make('Layers');
export const LayoutDashboard = make('LayoutDashboard');
export const Link = make('Link');
export const Link2 = make('Link2');
export const List = make('List');
export const ListChecks = make('ListChecks');
export const ListOrdered = make('ListOrdered');
export const Lock = make('Lock');
export const LogIn = make('LogIn');
export const LogOut = make('LogOut');
export const Mail = make('Mail');
export const MapPin = make('MapPin');
export const Maximize2 = make('Maximize2');
export const Megaphone = make('Megaphone');
export const Menu = make('Menu');
export const MessageSquare = make('MessageSquare');
export const Minimize2 = make('Minimize2');
export const Moon = make('Moon');
export const Navigation = make('Navigation');
export const Palette = make('Palette');
export const PanelLeft = make('PanelLeft');
export const PanelRight = make('PanelRight');
export const Pause = make('Pause');
export const Phone = make('Phone');
export const PhoneCall = make('PhoneCall');
export const Play = make('Play');
export const PlayCircle = make('PlayCircle');
export const Plus = make('Plus');
export const PlusCircle = make('PlusCircle');
export const RefreshCw = make('RefreshCw');
export const Rocket = make('Rocket');
export const RotateCcw = make('RotateCcw');
export const RotateCw = make('RotateCw');
export const Save = make('Save');
export const Search = make('Search');
export const Send = make('Send');
export const Settings = make('Settings');
export const Share2 = make('Share2');
export const Shield = make('Shield');
export const ShieldAlert = make('ShieldAlert');
export const ShieldCheck = make('ShieldCheck');
export const Sparkles = make('Sparkles');
export const Square = make('Square');
export const Star = make('Star');
export const Sun = make('Sun');
export const Sunrise = make('Sunrise');
export const Sunset = make('Sunset');
export const Tag = make('Tag');
export const Target = make('Target');
export const ToggleLeft = make('ToggleLeft');
export const ToggleRight = make('ToggleRight');
export const Trash2 = make('Trash2');
export const TrendingUp = make('TrendingUp');
export const Undo2 = make('Undo2');
export const User = make('User');
export const UserCheck = make('UserCheck');
export const UserX = make('UserX');
export const Users = make('Users');
export const X = make('X');
export const Zap = make('Zap');
