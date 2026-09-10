/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProjectPhase } from '../types';

/**
 * Strips existing "Giai đoạn X:" or "Phase X:" prefix if user or legacy data had it.
 * e.g. "Giai đoạn 1: Khảo sát & PRD" -> "Khảo sát & PRD"
 *      "Phase 2 - Thiết kế UI" -> "Thiết kế UI"
 *      "Kiểm thử hệ thống" -> "Kiểm thử hệ thống"
 */
export function cleanPhaseTitle(name: string): string {
  if (!name) return '';
  return name.replace(/^(Giai đoạn|Phase)\s*\d+[\s:.-]*/i, '').trim();
}

/**
 * Formats phase name with automatic numbering based on sorted index.
 * e.g. cleanTitle: "Khảo sát & PRD", index: 0 -> "Giai đoạn 1: Khảo sát & PRD"
 */
export function formatPhaseName(cleanTitle: string, index: number): string {
  const cleaned = cleanPhaseTitle(cleanTitle);
  return `Giai đoạn ${index + 1}: ${cleaned}`;
}

/**
 * Sorts phases chronologically by dueDate from earliest to latest ("từ gần đến xa").
 * If dueDate is missing, it is placed at the end.
 */
export function sortPhasesByDate(phases: ProjectPhase[]): ProjectPhase[] {
  return [...phases].sort((a, b) => {
    const dateA = a.dueDate || '9999-12-31';
    const dateB = b.dueDate || '9999-12-31';
    return dateA.localeCompare(dateB);
  });
}

/**
 * Normalizes phase list by sorting chronologically and assigning auto-generated names:
 * "Giai đoạn 1: ...", "Giai đoạn 2: ...", etc.
 */
export function normalizeAndNumberPhases(phases: ProjectPhase[]): ProjectPhase[] {
  const sorted = sortPhasesByDate(phases);
  return sorted.map((p, idx) => ({
    ...p,
    name: formatPhaseName(p.name, idx),
  }));
}
