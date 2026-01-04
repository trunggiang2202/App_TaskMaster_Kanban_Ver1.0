import type { Task } from './types';

const now = new Date('2024-01-01T00:00:00');

const getRelativeDate = (dayOffset: number, hour: number = 0, minute: number = 0) => {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    date.setHours(hour, minute, 0, 0);
    return date;
};

export const initialTasks: Task[] = [];
