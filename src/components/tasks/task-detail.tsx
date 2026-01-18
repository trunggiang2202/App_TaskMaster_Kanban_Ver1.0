

'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { isAfter, isBefore, getDay, isSameDay, startOfDay, endOfDay } from 'date-fns';
import { Edit, Trash2, Circle, Check, LoaderCircle, AlertTriangle, Clock, Eye, Repeat, Lightbulb } from 'lucide-react';
import { SubtaskDetailDialog } from './subtask-detail-dialog';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from '@/lib/utils';
import { useTasks } from '@/contexts/TaskContext';

interface SubtaskItemProps {
    subtask: Subtask;
    taskType: Task['taskType'];
    recurringDays?: number[];
    onToggle: (subtaskId: string, forceStart?: boolean) => void;
    onTitleClick: () => void;
    isClickable: boolean;
    isInProgress: boolean;
    isOverdue: boolean;
    isManuallyStarted: boolean;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, taskType, recurringDays, onToggle, onTitleClick, isClickable, isInProgress, isOverdue, isManuallyStarted }) => {
    const canComplete = taskType === 'recurring' ? (recurringDays?.includes(getDay(new Date()))) : (isClickable && !!subtask.startDate);

    const handleToggle = (e: React.MouseEvent, forceStart: boolean) => {
        if (forceStart || canComplete) {
            e.stopPropagation();
            onToggle(subtask.id, forceStart);
        }
    };

    const renderIcon = () => {
        if (subtask.completed) {
            const wasOverdue = taskType === 'deadline' && subtask.startDate && isBefore(startOfDay(subtask.startDate), startOfDay(new Date()));
             return (
                <div className={cn("h-5 w-5 flex items-center justify-center rounded-full", wasOverdue ? "bg-destructive" : "bg-chart-2")}>
                    <Check className="h-3 w-3 text-primary-foreground" />
                </div>
            );
        }
        if (isOverdue) {
            return <AlertTriangle className="h-5 w-5 text-destructive" />;
        }
        if (isInProgress || isManuallyStarted) {
            return <LoaderCircle className={cn("h-5 w-5 animate-spin", isManuallyStarted ? "text-blue-600 dark:text-blue-400" : "text-amber-500")} />;
        }
        return <Circle className="h-5 w-5 text-primary" />;
    };
    
    const isToDoClickable = taskType === 'deadline' && !isInProgress && !isOverdue && !subtask.completed;

    const iconElement = (
      <div 
        className={`h-5 w-5 mt-0.5 shrink-0 transition-transform hover:scale-125 ${isToDoClickable || canComplete ? 'cursor-pointer' : 'cursor-not-allowed'}`} 
        onClick={(e) => handleToggle(e, isToDoClickable)}
      >
        {renderIcon()}
      </div>
    );
    
    return (
        <div key={subtask.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                 <TooltipProvider>
                    {!(isToDoClickable || canComplete) && !subtask.completed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
                            <TooltipContent>
                                <p>{ taskType === 'recurring' ? 'Không phải hôm nay' : 'Chưa bắt đầu'}</p>
                            </TooltipContent>
                        </Tooltip>
                    ) : (
                        iconElement
                    )}
                 </TooltipProvider>
                <div className="flex-1 cursor-pointer" onClick={onTitleClick}>
                    <span className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {subtask.title}
                    </span>
                </div>
                {(subtask.attachments?.length ?? 0) > 0 && (
                     <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-50 group-hover:opacity-100 transition-opacity"
                        onClick={onTitleClick}
                    >
                        <Eye className="h-4 w-4 text-foreground" />
                    </Button>
                )}
            </div>
        </div>
    )
};


interface TaskDetailProps {
  task: Task;
  onEditTask: (task: Task) => void;
}

type SubtaskStatus = 'Chưa bắt đầu' | 'Đang làm' | 'Xong';

type CategorizedSubtasks = Record<SubtaskStatus, Subtask[]>;

const WEEKDAY_MAP: { [key: number]: string } = {
  0: 'Chủ Nhật',
  1: 'Thứ Hai',
  2: 'Thứ Ba',
  3: 'Thứ Tư',
  4: 'Thứ Năm',
  5: 'Thứ Sáu',
  6: 'Thứ Bảy'
};

export default function TaskDetail({ task, onEditTask }: TaskDetailProps) {
  const { deleteTask, toggleSubtask } = useTasks();
  const [selectedSubtask, setSelectedSubtask] = React.useState<Subtask | null>(null);
  const [isSubtaskDetailOpen, setIsSubtaskDetailOpen] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(new Date());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000 * 60); // Update every minute is enough for date-based logic
    return () => clearInterval(timer);
  }, []);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);

  const handleSubtaskClick = (subtask: Subtask) => {
    setSelectedSubtask(subtask);
    setIsSubtaskDetailOpen(true);
  };
  
  const categorizedSubtasks = React.useMemo<CategorizedSubtasks>(() => {
    const categories: CategorizedSubtasks = {
      'Chưa bắt đầu': [],
      'Đang làm': [],
      'Xong': [],
    };
    
    const todayDay = getDay(currentTime);
    const isRecurringToday = task.taskType === 'recurring' && task.recurringDays?.includes(todayDay);

    task.subtasks.forEach(st => {
      const isAutoInProgress = task.taskType === 'deadline' && st.startDate && isSameDay(currentTime, st.startDate);
      if (st.completed) {
        categories['Xong'].push(st);
      } else if (st.isManuallyStarted || isAutoInProgress || isRecurringToday) {
        categories['Đang làm'].push(st);
      }
      else {
        categories['Chưa bắt đầu'].push(st);
      }
    });
    return categories;
  }, [task.subtasks, task.taskType, task.recurringDays, currentTime]);


  const now = new Date();

  const getSubtaskStyling = (subtask: Subtask, columnTitle?: SubtaskStatus) => {
    if (subtask.completed) {
        const wasOverdue = task.taskType === 'deadline' && subtask.startDate && isBefore(startOfDay(subtask.startDate), startOfDay(now));
        return wasOverdue ? 'border border-destructive border-l-4 border-l-destructive' : 'border border-chart-2 border-l-4 border-l-chart-2';
    }
    
    if (columnTitle === 'Đang làm') {
        if (subtask.isManuallyStarted) {
            return 'border border-blue-600 border-l-4 border-l-blue-600';
        }
        if (task.taskType === 'deadline' && subtask.startDate && isBefore(startOfDay(subtask.startDate), startOfDay(now))) {
          return 'border border-destructive border-l-4 border-l-destructive'; // Overdue for deadline tasks
        }
        return 'border border-amber-500 border-l-4 border-l-amber-500'; // In Progress for both types
    }
    if (columnTitle === 'Chưa bắt đầu') {
        return 'border border-primary border-l-4 border-l-primary';
    }
    return 'border border-muted-foreground/30 border-l-4 border-l-muted';
  };

  const kanbanColumns: { title: SubtaskStatus, subtasks: Subtask[], isClickable: boolean; titleColor: string; bgColor: string; }[] = [
    { title: 'Chưa bắt đầu', subtasks: categorizedSubtasks['Chưa bắt đầu'], isClickable: true, titleColor: 'text-primary', bgColor: 'bg-primary/5' },
    { title: 'Đang làm', subtasks: categorizedSubtasks['Đang làm'], isClickable: true, titleColor: 'text-amber-500', bgColor: 'bg-primary/5' },
    { title: 'Xong', subtasks: categorizedSubtasks['Xong'], isClickable: true, titleColor: 'text-chart-2', bgColor: 'bg-primary/5' },
  ];
  
  const recurringDaysText = task.recurringDays
    ?.sort((a, b) => (a === 0 ? 7 : a) - (b === 0 ? 7 : b))
    .map(day => WEEKDAY_MAP[day])
    .join(', ');

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="default" size="sm" onClick={() => onEditTask(task)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Chỉnh sửa
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Xóa
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Bạn có chắc chắn không?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Hành động này sẽ xóa mục tiêu <span className="font-bold">{task.title}</span> vĩnh viễn.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => deleteTask(task.id)}>
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        
        <div className="my-1 h-px bg-slate-300 dark:bg-slate-700" />

        {task.taskType !== 'deadline' && (
            <div className="space-y-6">
                <div className="p-4 rounded-md border bg-primary/10">
                    {task.taskType === 'recurring' ? (
                    <div className="flex items-center gap-2 text-sm font-medium text-primary">
                        <Repeat className="h-4 w-4" />
                        Lặp lại vào {recurringDaysText} hàng tuần
                    </div>
                    ) : (
                    <div className="flex items-center gap-2 text-sm font-medium text-amber-600">
                        <Lightbulb className="h-4 w-4" />
                        Đây là một mục tiêu nháp. Hãy phát triển nó thành một kế hoạch cụ thể!
                    </div>
                    )}
                </div>
            </div>
        )}

        {task.taskType !== 'idea' && totalSubtasks > 0 && (
          <div className="p-4 rounded-md border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Công việc ({completedSubtasks}/{totalSubtasks})</h2>
              <span className="text-sm font-medium text-muted-foreground">{Math.round(subtaskProgress)}% đã hoàn thành</span>
            </div>
            <div className="space-y-4">
              <Progress value={subtaskProgress} className="h-2 bg-border" indicatorClassName="bg-primary" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {kanbanColumns.map(column => (
                  <div key={column.title} className="flex flex-col">
                    <div className="flex items-center justify-center gap-2 mb-2">
                       <h3 className={`font-semibold text-sm ${column.titleColor}`}>
                        {column.title === 'Xong' 
                          ? `${column.title} (${completedSubtasks}/${totalSubtasks})`
                          : `${column.title} (${column.subtasks.length})`
                        }
                      </h3>
                    </div>
                    <div className={`rounded-lg p-2 space-y-2 min-h-24 ${column.bgColor}`}>
                      {column.subtasks.length > 0 ? (
                        column.subtasks.map(st => {
                          const isInProgress = column.title === 'Đang làm' || (task.taskType === 'recurring' && task.recurringDays?.includes(getDay(now)) || false);
                          const isOverdue = column.title === 'Đang làm' && task.taskType === 'deadline' && !st.completed && !!st.startDate && isBefore(startOfDay(st.startDate), startOfDay(now));
                          return (
                            <Card 
                                key={st.id} 
                                className={cn(
                                    "bg-background shadow-sm transition-colors group",
                                    getSubtaskStyling(st, column.title)
                                )}
                            >
                              <CardContent className="p-3">
                                <SubtaskItem 
                                    subtask={st}
                                    taskType={task.taskType}
                                    recurringDays={task.recurringDays}
                                    onToggle={(subtaskId, forceStart) => toggleSubtask(task.id, subtaskId, forceStart)}
                                    onTitleClick={() => handleSubtaskClick(st)}
                                    isClickable={column.isClickable}
                                    isInProgress={isInProgress}
                                    isOverdue={isOverdue}
                                    isManuallyStarted={st.isManuallyStarted || false}
                                />
                              </CardContent>
                            </Card>
                          )
                        })
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-xs text-muted-foreground">Không có công việc</p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
      <SubtaskDetailDialog 
        subtask={selectedSubtask}
        isOpen={isSubtaskDetailOpen}
        onOpenChange={setIsSubtaskDetailOpen}
      />
    </>
  );
}
