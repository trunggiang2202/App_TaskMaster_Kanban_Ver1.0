import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const parseDate = (dateStr?: string): Date | null => {
    if (!dateStr) return null;
    try {
        const parts = dateStr.split('-');
        if (parts.length !== 3) return null;
        const [day, month, year] = parts.map(Number);
        if (isNaN(day) || isNaN(month) || isNaN(year) || year < 1900 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) {
            return null;
        }
        const date = new Date(year, month - 1, day);
        // Final check to ensure date is valid (e.g., handles Feb 30)
        if (date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day) {
            return date;
        }
        return null;
    } catch {
        return null;
    }
};


export const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export const WEEKDAY_ABBREVIATIONS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
export const WEEKDAY_INDICES = [1, 2, 3, 4, 5, 6, 0];

    

    

