/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { TeamType } from '../types';

export interface TeamColorScheme {
  bg: string;
  lightBg: string;
  text: string;
  border: string;
  dot: string;
}

export const getTeamColor = (team?: TeamType | string): TeamColorScheme => {
  switch (team) {
    case 'Product Manager':
      return {
        bg: 'bg-accent-solid',
        lightBg: 'bg-surface-accent-faint',
        text: 'text-accent',
        border: 'border-line',
        dot: 'bg-accent-solid',
      };
    case 'UX/UI Designer':
      return {
        bg: 'bg-support-solid',
        lightBg: 'bg-surface-info',
        text: 'text-info',
        border: 'border-line',
        dot: 'bg-support-solid',
      };
    case 'SEO':
      return {
        bg: 'bg-extreme-solid',
        lightBg: 'bg-surface-100',
        text: 'text-extreme',
        border: 'border-line',
        dot: 'bg-extreme-solid',
      };
    case 'Data':
      return {
        bg: 'bg-positive-solid',
        lightBg: 'bg-surface-positive',
        text: 'text-positive',
        border: 'border-line',
        dot: 'bg-positive-solid',
      };
    default:
      return {
        bg: 'bg-icon-strong',
        lightBg: 'bg-surface-200',
        text: 'text-ink-lighter',
        border: 'border-line',
        dot: 'bg-icon-strong',
      };
  }
};
