'use client';

import * as React from 'react';
import type { Task, TaskType } from '@/lib/types';
import { SidebarGroup } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, Calendar, Repeat, Lightbulb, GanttChartSquare } from 'lucide-react';
import { startOfDay, isBefore, isAfter, format, isWithinInterval, getDay, formatDistanceToNowStrict, endOfDay, differenceInDays, eachDayOfInterval, isSameDay } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn, WEEKDAY_ABBREVIATIONS, WEEKDAYS } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';

function TaskStatusInfo({ task }: { task: Task }) {
  
  const calculateDaysCompleted = (task: Task): { completedDays: number; totalDays: number } => {
    if (task.taskType !== 'deadline' || !task.startDate || !task.endDate) {
        return { completedDays: 0, totalDays: 0 };
    }

    const today = startOfDay(new Date());
    const taskStart = startOfDay(task.startDate);
    const taskEnd = startOfDay(task.endDate);
    
    if (isBefore(taskEnd, taskStart)) {
        return { completedDays: 0, totalDays: 0 };
    }
    
    const allDaysInTask = eachDayOfInterval({ start: taskStart, end: taskEnd });
    const totalDays = allDaysInTask.length;

    let completedDays = 0;
    
    const loopUntil = isAfter(today, taskEnd) ? taskEnd : today;

    if (isBefore(loopUntil, taskStart)) {
        return { completedDays: 0, totalDays };
    }

    const daysToConsider = eachDayOfInterval({ start: taskStart, end: loopUntil });

    completedDays = daysToConsider.filter(day => {
        const subtasksForDay = task.subtasks.filter(st => 
            st.startDate && isSameDay(day, startOfDay(st.startDate))
        );

        if (subtasksForDay.length === 0) {
            return true; // Count days with no subtasks as completed if they are in the past
        }

        return subtasksForDay.every(st => st.completed);
    }).length;

    return { completedDays, totalDays };
  };

  if (task.status === 'Done' && task.taskType !== 'idea') {
    if (task.taskType === 'deadline') {
        const formattedStartDate = task.startDate ? format(task.startDate, 'dd/MM/yyyy', { locale: vi }) : '';
        const formattedEndDate = task.endDate ? format(task.endDate, 'dd/MM/yyyy', { locale: vi }) : '';
        const { completedDays, totalDays } = calculateDaysCompleted(task);
        
        return (
           <div className="space-y-1.5 text-xs text-sidebar-foreground/70">
                <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>Bắt đầu: {formattedStartDate}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Calendar size={12} />
                    <span>Kết thúc: {formattedEndDate}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500">
                    <CheckCircle2 size={12} />
                    <span>Đã hoàn thành <span className="font-bold">{completedDays} ngày</span> trong tổng {totalDays} ngày</span>
                </div>
            </div>
        );
    }
    
    return (
      <div className="flex items-center gap-2 text-emerald-500 text-xs">
          <CheckCircle2 size={12} />
          <span>Đã hoàn thành</span>
      </div>
    );
  }

  if (task.taskType === 'recurring') {
    const isTaskForToday = task.recurringDays?.includes(getDay(new Date()));

    return (
       <div className="space-y-1.5 text-xs text-sidebar-foreground/70">
          <div className={cn("flex items-center gap-2", isTaskForToday && "text-emerald-500 font-semibold")}>
            <Repeat size={12} className={cn(isTaskForToday && "animate-spin")} />
            <span>
              {isTaskForToday ? 'Đang diễn ra' : 'Chưa bắt đầu'}
            </span>
          </div>
       </div>
    )
  }

  if (task.taskType === 'idea') {
    return (
        <div className="flex items-center gap-2 text-xs text-sidebar-foreground/70">
            <Lightbulb size={12} className="text-amber-500" />
            <span>Nháp - {formatDistanceToNowStrict(new Date(task.createdAt), { addSuffix: true, locale: vi })}</span>
        </div>
    )
  }

  const now = new Date();
  const isOverdue = task.status !== 'Done' && task.endDate && isAfter(now, endOfDay(task.endDate));
  const isUpcoming = task.startDate && isBefore(now, startOfDay(task.startDate));
  const isStarted = !isUpcoming && !isOverdue && task.status !== 'Done';
  
  const formattedStartDate = task.startDate ? format(task.startDate, 'dd/MM/yyyy', { locale: vi }) : '';
  const formattedEndDate = task.endDate ? format(task.endDate, 'dd/MM/yyyy', { locale: vi }) : '';
  
  const remainingDays = task.endDate ? differenceInDays(endOfDay(task.endDate), now) : null;
  const { completedDays, totalDays } = calculateDaysCompleted(task);
  const currentDayIndex = task.startDate ? differenceInDays(startOfDay(now), startOfDay(task.startDate)) + 1 : 0;


  return (
    <div className="space-y-1.5 text-xs text-sidebar-foreground/70">
        <div className={cn("flex items-center gap-2", isStarted && "text-emerald-500")}>
        <Calendar size={12} />
        <span>Bắt đầu: {formattedStartDate}</span>
        {isUpcoming && <span>(Chưa bắt đầu)</span>}
        {isStarted && <span>(Đã bắt đầu)</span>}
        </div>
        <div className={cn("flex items-center gap-2", isOverdue && "text-destructive")}>
            <Calendar size={12} />
            <span>Kết thúc: {formattedEndDate}</span>
            {isOverdue ? (
                <span>(Đã quá hạn)</span>
            ) : remainingDays !== null && remainingDays >= 0 ? (
                <span className='text-blue-500'>(Còn {remainingDays} ngày)</span>
            ) : null}
        </div>
        <div className="flex items-center gap-2">
            <CheckCircle2 size={12} />
             {isStarted ? (
                 <span>Đã đến ngày thứ <span className="font-bold text-emerald-500">{currentDayIndex}</span> trong tổng {totalDays} ngày</span>
            ) : (
                 <span>Đã hoàn thành <span className="font-bold text-emerald-500">{completedDays} ngày</span> trong tổng {totalDays} ngày</span>
            )}
        </div>
    </div>
  );
}

interface RecentTasksProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  activeFilter: 'all' | 'today' | 'week';
  allTasksFilter?: 'all' | 'deadline' | 'recurring' | 'idea';
  onOpenTimeline: (task: Task) => void;
}


export function RecentTasks({ tasks: recentTasks, selectedTaskId, onSelectTask, activeFilter, allTasksFilter, onOpenTimeline }: RecentTasksProps) {
  
  const getEmptyMessage = () => {
    switch (activeFilter) {
        case 'today':
            return 'Không có mục tiêu nào cho hôm nay';
        case 'week':
            return 'Không có mục tiêu cho ngày này';
        case 'all':
            if (allTasksFilter === 'deadline') {
                return "Không có mục tiêu 'theo ngày' nào";
            }
            if (allTasksFilter === 'recurring') {
                return "Không có mục tiêu 'Lặp lại' nào";
            }
            if (allTasksFilter === 'idea') {
                return "Không có 'Mục tiêu nháp' nào";
            }
            return 'Không có mục tiêu nào';
        default:
            return 'Không có mục tiêu nào';
    }
  };

  return (
    <SidebarGroup>
      <div className="space-y-3 px-2 pt-2">
        {recentTasks.map(task => {
          const totalSubtasks = task.subtasks.length;
          const completedSubtasks = task.subtasks.filter(st => st.completed).length;
          
          return (
            <div 
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={cn(
                  'p-2.5 rounded-lg space-y-2 relative group cursor-pointer transition-colors bg-sidebar-accent/50 hover:bg-sidebar-accent/80 border-sidebar-border border',
                  selectedTaskId === task.id ? 'ring-2 ring-sidebar-primary bg-sidebar-accent/80' : ''
              )}
            >
              
              <div className="flex justify-between items-start">
                <p className="text-sm text-sidebar-foreground flex-grow truncate pr-8">
                  {task.title}
                  {task.taskType !== 'idea' && totalSubtasks > 0 && (
                    <span className="text-sidebar-foreground/70 ml-2">
                      ({completedSubtasks}/{totalSubtasks})
                    </span>
                  )}
                </p>
                {task.taskType === 'deadline' && (
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => { e.stopPropagation(); onOpenTimeline(task); }}
                          className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-sidebar-accent"
                        >
                          <GanttChartSquare className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Xem mục tiêu</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
              
              <TaskStatusInfo 
                task={task} 
              />
            </div>
          )
        })}
         {recentTasks.length === 0 && (
          <p className="text-sm text-center text-sidebar-foreground/60 py-4">
            {getEmptyMessage()}
          </p>
        )}
      </div>
    </SidebarGroup>
  );
}
