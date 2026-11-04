/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { BarChart3, CheckSquare, FolderKanban, Menu, Plus } from './vds/icons';
import { ActiveTab } from '../types';

interface MobileTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onQuickAdd: () => void;
  onOpenMenu: () => void;
  taskBadge?: number;
}

const TABS: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'tasks', label: 'Việc', icon: CheckSquare },
  { id: 'projects', label: 'Dự án', icon: FolderKanban },
];

const TABS_RIGHT: { id: ActiveTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'reports', label: 'Báo cáo', icon: BarChart3 },
];

/**
 * Thanh điều hướng đáy màn hình cho mobile: 1 chạm tới các khu vực chính,
 * nút "+" ở giữa luôn trong tầm ngón cái.
 */
export const MobileTabBar: React.FC<MobileTabBarProps> = ({ activeTab, onTabChange, onQuickAdd, onOpenMenu, taskBadge = 0 }) => {
  const renderTab = (t: (typeof TABS)[number]) => {
    const Icon = t.icon;
    const isOn = activeTab === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onTabChange(t.id)}
        aria-current={isOn ? 'page' : undefined}
        className={`relative flex-1 h-14 flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
          isOn ? 'text-accent' : 'text-subdued'
        }`}
      >
        <span className="relative">
          <Icon className="w-[22px] h-[22px]" />
          {t.id === 'tasks' && taskBadge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] px-1 rounded-full bg-negative-solid text-on-color text-[10px] font-num font-bold flex items-center justify-center ring-2 ring-surface">
              {taskBadge > 99 ? '99+' : taskBadge}
            </span>
          )}
        </span>
        <span className={`text-xs font-ui ${isOn ? 'font-bold' : 'font-medium'}`}>{t.label}</span>
      </button>
    );
  };

  return (
    <nav
      aria-label="Điều hướng chính"
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-surface/95 backdrop-blur-md border-t border-line pb-safe"
    >
      <div className="flex items-stretch px-1">
        {TABS.map(renderTab)}
        <div className="flex-1 flex items-center justify-center">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={onQuickAdd}
            className="w-12 h-12 -mt-5 rounded-full bg-accent-solid text-on-color shadow-pop /30 flex items-center justify-center ring-4 ring-surface cursor-pointer"
            aria-label="Thêm việc mới"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </motion.button>
        </div>
        {TABS_RIGHT.map(renderTab)}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex-1 h-14 flex flex-col items-center justify-center gap-0.5 text-subdued cursor-pointer"
        >
          <Menu className="w-[22px] h-[22px]" />
          <span className="text-xs font-ui font-medium">Thêm</span>
        </button>
      </div>
    </nav>
  );
};
