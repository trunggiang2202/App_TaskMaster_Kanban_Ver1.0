import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr || !timeStr) return null;
    try {
        const [day, month, year] = dateStr.split('-').map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1000) return null;
        const [hour, minute] = timeStr.split(':').map(Number);
        if (isNaN(hour) || isNaN(minute)) return null;
        return new Date(year, month - 1, day, hour, minute);
    } catch {
        return null;
    }
};

export const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
export const WEEKDAY_ABBREVIATIONS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    