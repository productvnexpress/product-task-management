/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Mapping of days in Vietnamese and English abbreviations
const VI_DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
const EN_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const EN_MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

/**
 * Full format conforming to RULE.md section 2.1:
 * {Thứ}, {Ngày}/{Tháng}/{Năm}, {Giờ}:{Phút} (GMT+7)
 * Ví dụ: Thứ tư, 2/9/2026, 21:47 (GMT+7)
 * Chú ý: Ngày và Tháng không thêm số 0 nếu chỉ có 1 chữ số.
 */
export function formatFullDateTime(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';

  const dayOfWeek = VI_DAYS[d.getDay()];
  const day = d.getDate(); // Không có padding '0'
  const month = d.getMonth() + 1; // Không có padding '0'
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');

  return `${dayOfWeek}, ${day}/${month}/${year}, ${hours}:${minutes} (GMT+7)`;
}

/**
 * Standard date with abbreviated English day conforming to RULE.md section 2.3:
 * Ví dụ: "Wed, 02 Sep 2026" hoặc "Wed, 02 Sep 2026 • 14:30"
 */
export function formatDateWithEnDay(dateInput?: Date | string | null, includeTime = false): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';

  const dayOfWeek = EN_DAYS_SHORT[d.getDay()];
  const day = String(d.getDate()).padStart(2, '0');
  const month = EN_MONTHS_SHORT[d.getMonth()];
  const year = d.getFullYear();

  const base = `${dayOfWeek}, ${day} ${month} ${year}`;
  if (!includeTime) return base;

  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${base} • ${hours}:${minutes}`;
}

/**
 * Compact date format for tight spaces:
 * Ví dụ: "02 Sep" hoặc "Wed, 02 Sep"
 */
export function formatCompactDate(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  if (!d || !(d instanceof Date) || isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = EN_MONTHS_SHORT[d.getMonth()];
  return `${day} ${month}`;
}

export function formatDateShort(dateInput?: Date | string | null): string {
  if (!dateInput) return '';
  return formatDateWithEnDay(dateInput);
}

/**
 * Number formatting conforming to RULE.md section 4.1:
 * Dấu chấm '.' phân cách hàng nghìn (ví dụ 1.234.567)
 * Dấu phẩy ',' cho phần thập phân (ví dụ 1.234,5)
 */
export function formatVnNumber(value: number, decimalPlaces = 0): string {
  if (isNaN(value)) return '0';
  const fixed = value.toFixed(decimalPlaces);
  const [intPart, decPart] = fixed.split('.');
  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decPart ? `${formattedInt},${decPart}` : formattedInt;
}

/**
 * Percentage formatting:
 * Ví dụ 41,7%
 */
export function formatPercentage(value: number, decimalPlaces = 1): string {
  if (isNaN(value)) return '0%';
  const fixed = value.toFixed(decimalPlaces);
  const [intPart, decPart] = fixed.split('.');
  return decPart && Number(decPart) > 0 ? `${intPart},${decPart}%` : `${intPart}%`;
}

/**
 * Number shortening conforming to RULE.md section 4.2:
 * 7.891 => 7,9K
 * 15.753 => 15,8K
 * 1.299.761 => 1,3M
 */
export function formatShortNumber(num: number): string {
  if (isNaN(num)) return '0';
  if (num < 1000) return formatVnNumber(num);

  if (num < 1000000) {
    const kVal = num / 1000;
    const rounded = (Math.round(kVal * 10) / 10).toFixed(1);
    const [intP, decP] = rounded.split('.');
    return decP && decP !== '0' ? `${intP},${decP}K` : `${intP}K`;
  }

  const mVal = num / 1000000;
  const rounded = (Math.round(mVal * 10) / 10).toFixed(1);
  const [intP, decP] = rounded.split('.');
  return decP && decP !== '0' ? `${intP},${decP}M` : `${intP}M`;
}

/**
 * Text truncation conforming to RULE.md section 3:
 * Cắt ký tự KHÔNG cắt vào giữa 1 từ, cắt tại khoảng trắng gần nhất, thêm "..."
 */
export function truncateWithoutBreakingWord(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  const truncated = text.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  if (lastSpaceIndex === -1) {
    return `${truncated}...`;
  }
  return `${truncated.substring(0, lastSpaceIndex)}...`;
}

/**
 * Format member name with salutation without IP Phone:
 * Ví dụ: "Anh Bùi Văn Đông", "Chị Thang Bích Liên"
 */
export function formatMemberNameOnly(
  nameOrMember: { name: string; salutation?: string; ipPhone?: string } | string | undefined | null,
  _membersList?: Array<{ name: string; salutation?: string; ipPhone?: string }>
): string {
  if (!nameOrMember) return '';

  let raw = typeof nameOrMember === 'object' ? nameOrMember.name : nameOrMember.trim();
  if (!raw) return '';

  // Strip trailing IP Phone like " - 4581"
  raw = raw.replace(/\s*-\s*\d{3,5}$/, '').trim();

  // Strip leading salutations (e.g. "Anh Nguyễn Trung Hiếu" -> "Nguyễn Trung Hiếu")
  raw = raw.replace(/^(Anh|Chị|Ông|Bà|Em)\s+/i, '').trim();

  return raw;
}

/**
 * Format member name with salutation and IP Phone:
 * Ví dụ: "Anh Bùi Văn Đông - 4509", "Chị Thang Bích Liên - 8500"
 */
export function formatMemberWithPhone(
  nameOrMember: { name: string; salutation?: string; ipPhone?: string } | string | undefined | null,
  membersList?: Array<{ name: string; salutation?: string; ipPhone?: string }>,
  includeSalutation: boolean = true
): string {
  if (!nameOrMember) return '';

  if (typeof nameOrMember === 'object') {
    const cleanName = (nameOrMember.name || '').replace(/^(Anh|Chị)\s+/i, '').trim();
    const prefix = includeSalutation && nameOrMember.salutation ? `${nameOrMember.salutation} ` : '';
    const phone = nameOrMember.ipPhone ? ` - ${nameOrMember.ipPhone}` : '';
    return `${prefix}${cleanName}${phone}`;
  }

  const raw = nameOrMember.trim();
  if (!raw) return '';

  // If phone is already included in raw (e.g. "Anh Bùi Văn Đông - 4509"), return it (cleaned if includeSalutation is false)
  if (/ - \d{3,5}$/.test(raw)) {
    return includeSalutation ? raw : raw.replace(/^(Anh|Chị)\s+/i, '');
  }

  if (!membersList || membersList.length === 0) {
    return includeSalutation ? raw : raw.replace(/^(Anh|Chị)\s+/i, '');
  }

  // Search for the member in the list
  const matched = membersList.find(
    (m) =>
      m.name === raw ||
      (m.salutation && `${m.salutation} ${m.name}` === raw) ||
      raw.includes(m.name) ||
      raw.endsWith(m.name)
  );

  const cleanName = (matched?.name || raw).replace(/^(Anh|Chị)\s+/i, '').trim();

  if (matched) {
    const prefix = includeSalutation && matched.salutation ? `${matched.salutation} ` : '';
    const phone = matched.ipPhone ? ` - ${matched.ipPhone}` : '';
    return `${prefix}${cleanName}${phone}`;
  }

  return includeSalutation ? raw : cleanName;
}

export function formatProductMemberWithPhone(
  nameOrMember: { name: string; salutation?: string; ipPhone?: string; group?: string; department?: string; team?: string } | string | undefined | null,
  membersList?: Array<{ name: string; salutation?: string; ipPhone?: string; group?: string; department?: string; team?: string }>
): string {
  if (!nameOrMember) return '';

  if (typeof nameOrMember === 'object') {
    const cleanName = (nameOrMember.name || '').replace(/^(Anh|Chị)\s+/i, '').trim();
    const phone = nameOrMember.ipPhone ? ` - ${nameOrMember.ipPhone}` : '';
    return `${cleanName}${phone}`;
  }

  const raw = nameOrMember.trim();
  if (!raw) return '';

  // If phone is already included in raw (e.g. "Nguyễn Trung Hiếu - 4887"), clean salutation and return
  if (/ - \d{3,5}$/.test(raw)) {
    return raw.replace(/^(Anh|Chị)\s+/i, '');
  }

  if (membersList && membersList.length > 0) {
    const cleanRaw = raw.replace(/^(Anh|Chị)\s+/i, '').trim().toLowerCase();

    // 1. Prioritize Product members (Ban Sản phẩm - Công nghệ) to avoid collision with stakeholders having the exact same name
    const productMember = membersList.find((m) => {
      const isProd =
        m.group === 'Product' ||
        (m.department && m.department.toLowerCase().includes('sản phẩm')) ||
        (m.team && ['Product Manager', 'UX/UI Designer', 'SEO', 'Data'].includes(m.team));
      if (!isProd) return false;

      const cleanMName = (m.name || '').replace(/^(Anh|Chị)\s+/i, '').trim().toLowerCase();
      return (
        cleanMName === cleanRaw ||
        cleanRaw.includes(cleanMName) ||
        cleanRaw.endsWith(cleanMName)
      );
    });

    if (productMember) {
      const cleanName = productMember.name.replace(/^(Anh|Chị)\s+/i, '').trim();
      const phone = productMember.ipPhone ? ` - ${productMember.ipPhone}` : '';
      return `${cleanName}${phone}`;
    }
  }

  return formatMemberWithPhone(nameOrMember, membersList, false);
}

/**
 * Format a Stakeholder member (Product Owner) for project views:
 * Keeps salutation prefix ("Anh", "Chị") and strictly prioritizes Stakeholders
 * (e.g. "Anh Nguyễn Trung Hiếu - 8503", Trưởng ban Thời sự TP HCM).
 */
export function formatStakeholderMemberWithPhone(
  nameOrMember: { name: string; salutation?: string; ipPhone?: string; group?: string; department?: string; team?: string } | string | undefined | null,
  membersList?: Array<{ name: string; salutation?: string; ipPhone?: string; group?: string; department?: string; team?: string }>
): string {
  if (!nameOrMember) return '';

  if (typeof nameOrMember === 'object') {
    return formatMemberWithPhone(nameOrMember, membersList, true);
  }

  const raw = nameOrMember.trim();
  if (!raw) return '';

  if (/ - \d{3,5}$/.test(raw)) {
    return raw;
  }

  if (membersList && membersList.length > 0) {
    const cleanRaw = raw.replace(/^(Anh|Chị)\s+/i, '').trim().toLowerCase();

    // Prioritize Stakeholders/Ban Biên tập over Product members
    const stakeholder = membersList.find((m) => {
      const isStakeholder =
        m.group === 'Stakeholder' ||
        m.team === 'Stakeholder' ||
        (m.department && !m.department.toLowerCase().includes('sản phẩm'));
      if (!isStakeholder) return false;

      const cleanMName = (m.name || '').replace(/^(Anh|Chị)\s+/i, '').trim().toLowerCase();
      return (
        cleanMName === cleanRaw ||
        cleanRaw.includes(cleanMName) ||
        cleanRaw.endsWith(cleanMName)
      );
    });

    if (stakeholder) {
      const cleanName = stakeholder.name.replace(/^(Anh|Chị)\s+/i, '').trim();
      const prefix = stakeholder.salutation ? `${stakeholder.salutation} ` : '';
      const phone = stakeholder.ipPhone ? ` - ${stakeholder.ipPhone}` : '';
      return `${prefix}${cleanName}${phone}`;
    }
  }

  return formatMemberWithPhone(nameOrMember, membersList, true);
}

/**
 * Format a comma-separated list of member names with salutation and IP Phone
 */
export function formatMemberListWithPhone(
  rawListString: string | undefined | null,
  membersList?: Array<{ name: string; salutation?: string; ipPhone?: string }>
): string {
  if (!rawListString) return '';
  return rawListString
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((item) => formatMemberWithPhone(item, membersList))
    .join(', ');
}

/**
 * Get 2-letter uppercase initials from full name
 */
export function getInitials(fullName: string): string {
  if (!fullName) return '';
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
}

