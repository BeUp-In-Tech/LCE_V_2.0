
import { getServerNow } from './serverTime';

export const CALIFORNIA_TZ = 'America/Los_Angeles';

const parseParts = (dateStr: string): { year: number; month: number; day: number; hour: number; minute: number; second: number } => {
    
    const normalized = dateStr.replace('T', ' ');
    const [datePart, timePart] = normalized.split(' ');
    const [y, m, d] = (datePart || '').split('-').map(Number);
    let hour = 0, minute = 0, second = 0;
    if (timePart) {
        const timeParts = timePart.split(':').map(s => parseInt(s, 10));
        hour = timeParts[0] || 0;
        minute = timeParts[1] || 0;
        second = timeParts[2] || 0;
    }
    return { year: y, month: m, day: d, hour, minute, second };
};

/**
 * Format a server date string as "M/D/YYYY" (e.g. "3/2/2026").
 * No timezone conversion — displays exact date from server.
 */
export const formatDateCA = (dateStr: string, _options?: Record<string, unknown>): string => {
    if (!dateStr) return 'N/A';
    try {
        const { year, month, day } = parseParts(dateStr);
        if (!year || !month || !day) return 'N/A';
        return `${month}/${day}/${year}`;
    } catch {
        return 'N/A';
    }
};

export const formatTimeCA = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
        const { hour, minute } = parseParts(dateStr);
        const period = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${h12}:${String(minute).padStart(2, '0')} ${period}`;
    } catch {
        return 'N/A';
    }
};

export const formatDateTimeCA = (dateStr: string): string => {
    if (!dateStr) return 'N/A';
    try {
        const { year, month, day, hour, minute, second } = parseParts(dateStr);
        if (!year || !month || !day) return 'N/A';
        const period = hour >= 12 ? 'PM' : 'AM';
        const h12 = hour % 12 || 12;
        return `${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}/${year}, ${h12}:${String(minute).padStart(2, '0')}:${String(second).padStart(2, '0')} ${period}`;
    } catch {
        return 'N/A';
    }
};

export const getPTDate = (): Date => {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: CALIFORNIA_TZ,
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
        hour: 'numeric',
        minute: 'numeric',
        second: 'numeric',
        hour12: false,
    });
    
    const parts = formatter.formatToParts(getServerNow());
    let year = 0, month = 0, day = 0, hour = 0, minute = 0, second = 0;
    
    for (const part of parts) {
        if (part.type === 'year') year = parseInt(part.value, 10);
        if (part.type === 'month') month = parseInt(part.value, 10);
        if (part.type === 'day') day = parseInt(part.value, 10);
        if (part.type === 'hour') hour = parseInt(part.value, 10);
        if (part.type === 'minute') minute = parseInt(part.value, 10);
        if (part.type === 'second') second = parseInt(part.value, 10);
    }
    
    if (hour === 24) hour = 0;
    
    return new Date(year, month - 1, day, hour, minute, second);
};

export const isBusinessDay = (date: Date): boolean => {
    const day = date.getDay();
    return day !== 0 && day !== 6; 
};

export const DAY_INDEX_TO_NAME: Record<number, string> = {
    0: 'Sunday',
    1: 'Monday',
    2: 'Tuesday',
    3: 'Wednesday',
    4: 'Thursday',
    5: 'Friday',
    6: 'Saturday',
};

export const SHORT_TO_FULL_DAY: Record<string, string> = {
    Mon: 'Monday',
    Tue: 'Tuesday',
    Wed: 'Wednesday',
    Thu: 'Thursday',
    Fri: 'Friday',
};

export const isAvailablePickupDay = (
    date: Date,
    availableDays?: string[],
    nonWorkingDays?: string[],
): boolean => {
    
    if (!isBusinessDay(date)) return false;

    
    if (availableDays && availableDays.length > 0) {
        const dayName = DAY_INDEX_TO_NAME[date.getDay()];
        if (!availableDays.includes(dayName)) return false;
    }

    
    if (nonWorkingDays && nonWorkingDays.length > 0) {
        const y = date.getFullYear();
        const m = String(date.getMonth() + 1).padStart(2, '0');
        const d = String(date.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;
        if (nonWorkingDays.includes(dateStr)) return false;
    }

    return true;
};

export const addAvailableDays = (
    startDate: Date,
    daysToAdd: number,
    availableDays?: string[],
    nonWorkingDays?: string[],
): Date => {
    const result = new Date(startDate);
    let count = 0;
    let safetyLimit = 60; 
    while (count < daysToAdd && safetyLimit > 0) {
        result.setDate(result.getDate() + 1);
        if (isAvailablePickupDay(result, availableDays, nonWorkingDays)) {
            count++;
        }
        safetyLimit--;
    }
    return result;
};

export const addBusinessDays = (startDate: Date, daysToAdd: number): Date => {
    const result = new Date(startDate);
    let count = 0;
    while (count < daysToAdd) {
        result.setDate(result.getDate() + 1);
        if (isBusinessDay(result)) {
            count++;
        }
    }
    return result;
};

export const parseDateSafe = (dateStr: string): Date => {
    if (!dateStr) return getPTDate();
    const { year, month, day, hour, minute, second } = parseParts(dateStr);
    if (!year || !month || !day) return getPTDate();
    return new Date(year, month - 1, day, hour, minute, second);
};

export const formatDateObj = (date: Date): string => {
    return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
};

export const formatDateShort = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${String(date.getDate()).padStart(2, '0')}`;
};

export const formatWeekday = (date: Date): string => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[date.getDay()];
};

export const formatDateDayMonth = (date: Date): string => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${String(date.getDate()).padStart(2, '0')} ${months[date.getMonth()]}`;
};

export const getDefaultBookingData = (
    availableDays?: string[],
    nonWorkingDays?: string[],
) => {
    const today = getPTDate();
    const currentHour = today.getHours();

    let targetDate: Date;

    if (currentHour < 8 && isAvailablePickupDay(today, availableDays, nonWorkingDays)) {
        targetDate = new Date(today);
    } else {
        targetDate = addAvailableDays(today, 1, availableDays, nonWorkingDays);
    }

    const year = targetDate.getFullYear();
    const month = String(targetDate.getMonth() + 1).padStart(2, '0');
    const day = String(targetDate.getDate()).padStart(2, '0');
    return {
        service: '',
        delivaryType: 'one-time' as const,
        date: formatDateDayMonth(targetDate),
        fullDate: `${year}-${month}-${day}`
    };
};
