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
        bg: 'bg-[#963861]',
        lightBg: 'bg-[#fcf0f5]',
        text: 'text-[#963861]',
        border: 'border-[#f3c2d4]',
        dot: 'bg-[#963861]',
      };
    case 'UX/UI Designer':
      return {
        bg: 'bg-[#0f62fe]',
        lightBg: 'bg-[#eff6ff]',
        text: 'text-[#1d4ed8]',
        border: 'border-[#bfdbfe]',
        dot: 'bg-[#0f62fe]',
      };
    case 'SEO':
      return {
        bg: 'bg-[#7c3aed]',
        lightBg: 'bg-[#faf5ff]',
        text: 'text-[#7e22ce]',
        border: 'border-[#e9d5ff]',
        dot: 'bg-[#7c3aed]',
      };
    case 'Data':
      return {
        bg: 'bg-[#0d9488]',
        lightBg: 'bg-[#f0fdfa]',
        text: 'text-[#0f766e]',
        border: 'border-[#99f6e4]',
        dot: 'bg-[#0d9488]',
      };
    default:
      return {
        bg: 'bg-[#52525b]',
        lightBg: 'bg-[#f4f4f5]',
        text: 'text-[#52525b]',
        border: 'border-[#e4e4e7]',
        dot: 'bg-[#52525b]',
      };
  }
};
