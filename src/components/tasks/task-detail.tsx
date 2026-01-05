
'use client';

import * as React from 'react';
import type { Task, Subtask } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { isAfter, isBefore, getDay } from 'date-fns';
import { Edit, Trash2, Circle, Check, LoaderCircle, AlertTriangle, Clock, ChevronDown, Repeat } from 'lucide-react';
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
import { cn, WEEKDAYS } from '@/lib/utils';
import { useTasks } from '@/contexts/TaskContext';

interface SubtaskItemProps {
    subtask: Subtask;
    taskType: Task['taskType'];
    recurringDays?: number[];
    onToggle: (subtaskId: string) => void;
    onTitleClick: () => void;
    isClickable: boolean;
    isInProgress: boolean;
    isOverdue: boolean;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, taskType, recurringDays, onToggle, onTitleClick, isClickable, isInProgress, isOverdue }) => {
    const canComplete = taskType === 'recurring' ? (recurringDays?.includes(getDay(new Date()))) : (isClickable && !!subtask.startDate && !!subtask.endDate);
    const [timeProgress, setTimeProgress] = React.useState(100);
    const [timeLeft, setTimeLeft] = React.useState('');
    const [isExpanded, setIsExpanded] = React.useState(false);


    React.useEffect(() => {
        if (taskType === 'recurring') {
            setTimeProgress(subtask.completed ? 100 : 0);
            return;
        }

        if (!subtask.startDate || !subtask.endDate) {
            setTimeProgress(subtask.completed ? 100 : 0);
            return;
        }

        const calculateTimes = () => {
            const now = new Date().getTime();
            const start = new Date(subtask.startDate!).getTime();
            const end = new Date(subtask.endDate!).getTime();

            if (subtask.completed) {
                setTimeProgress(100);
                setTimeLeft('Đã hoàn thành');
                return;
            }

            if (now >= end) {
                setTimeProgress(0);
                 setTimeLeft('Đã quá hạn');
                return;
            }
            
            let remainingDuration;
            if (now < start) {
                remainingDuration = end - start;
                setTimeProgress(100);
            } else {
                remainingDuration = end - now;
                const percentage = ((end - now) / (end - start)) * 100
                setTimeProgress(Math.min(100, Math.max(0, percentage)));
            }

            const days = Math.floor(remainingDuration / (1000 * 60 * 60 * 24));
            const hours = Math.floor((remainingDuration % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((remainingDuration % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remainingDuration % (1000 * 60)) / 1000);

            let timeLeftString = '';
            if (days > 0) timeLeftString += `${days}d `;
            if (hours > 0) timeLeftString += `${hours}h `;
            if (minutes > 0) timeLeftString += `${minutes}m `;
            if (isInProgress) timeLeftString += `${seconds}s`;


            setTimeLeft(timeLeftString.trim() || '0s');
        };

        calculateTimes();
        const interval = setInterval(calculateTimes, 1000); 

        return () => clearInterval(interval);
    }, [subtask.startDate, subtask.endDate, subtask.completed, isInProgress, taskType]);


    const handleToggle = (e: React.MouseEvent) => {
        if (canComplete) {
            e.stopPropagation();
            onToggle(subtask.id);
        }
    };

    const renderIcon = () => {
        if (subtask.completed) {
            return (
                <div className="h-5 w-5 flex items-center justify-center bg-emerald-500 rounded-full">
                    <Check className="h-3 w-3 text-primary-foreground" />
                </div>
            );
        }
        if (isOverdue) {
            return <AlertTriangle className="h-5 w-5 text-destructive" />;
        }
        if (isInProgress) {
            return <LoaderCircle className="h-5 w-5 text-amber-500 animate-spin" />;
        }
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    };

    const iconElement = (
      <div 
        className={`h-5 w-5 mt-0.5 shrink-0 transition-transform hover:scale-125 ${canComplete ? 'cursor-pointer' : 'cursor-not-allowed'}`} 
        onClick={handleToggle}
      >
        {renderIcon()}
      </div>
    );
    
    const isWarning = !subtask.completed && isInProgress && !isOverdue && timeProgress < 20;
    const hasDeadline = !!subtask.startDate && !!subtask.endDate;

    return (
        <div key={subtask.id} className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
                 <TooltipProvider>
                    {!canComplete && !subtask.completed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
                            <TooltipContent>
                                <p>{ taskType === 'recurring' ? 'Không phải hôm nay' : 'Chưa bắt đầu deadline'}</p>
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
                 {!subtask.completed && hasDeadline && !isOverdue && taskType === 'deadline' && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0"
                        onClick={() => setIsExpanded(!isExpanded)}
                    >
                        <ChevronDown className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-180")} />
                    </Button>
                )}
            </div>
            {isExpanded && !subtask.completed && hasDeadline && !isOverdue && taskType === 'deadline' && (
                <div className="flex flex-col gap-2">
                    <Separator className="my-1" />
                    <div className="flex flex-col gap-2">
                         <div className="flex items-center justify-between text-xs pt-1">
                            <span className={cn("flex items-center gap-1", isWarning ? 'text-destructive' : 'text-muted-foreground')}>
                                <Clock className="h-3 w-3" />
                                {isInProgress ? 'Thời gian còn lại' : 'Tổng thời gian'}: {timeLeft}
                            </span>
                        </div>
                        <Progress 
                            value={timeProgress} 
                            className="h-1.5" 
                            indicatorClassName={cn(
                                isWarning ? "bg-destructive" : isInProgress ? "bg-amber-500" : "bg-sky-500"
                            )}
                        />
                    </div>
                </div>
            )}
        </div>
    )
};


interface TaskDetailProps {
  task: Task;
  onEditTask: (task: Task) => void;
}

type SubtaskStatus = 'Chưa làm' | 'Đang làm' | 'Xong';

type CategorizedSubtasks = Record<SubtaskStatus, Subtask[]>;

const initialCategorizedSubtasks: CategorizedSubtasks = {
  'Chưa làm': [],
  'Đang làm': [],
  'Xong': [],
};

export default function TaskDetail({ task, onEditTask }: TaskDetailProps) {
  const { deleteTask, toggleSubtask } = useTasks();
  const [selectedSubtask, setSelectedSubtask] = React.useState<Subtask | null>(null);
  const [isSubtaskDetailOpen, setIsSubtaskDetailOpen] = React.useState(false);
  const [categorizedSubtasks, setCategorizedSubtasks] = React.useState<CategorizedSubtasks>(initialCategorizedSubtasks);

  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);

  const handleSubtaskClick = (subtask: Subtask) => {
    setSelectedSubtask(subtask);
    setIsSubtaskDetailOpen(true);
  };
  
  React.useEffect(() => {
    if (task.taskType === 'recurring') return;

    const categorize = () => {
      const categories: CategorizedSubtasks = {
        'Chưa làm': [],
        'Đang làm': [],
        'Xong': [],
      };
      const now = new Date();
      task.subtasks.forEach(st => {
        if (st.completed) {
          categories['Xong'].push(st);
          return;
        }
        if (st.startDate && isAfter(now, st.startDate)) {
          categories['Đang làm'].push(st);
        } else {
          categories['Chưa làm'].push(st);
        }
      });
      setCategorizedSubtasks(categories);
    };

    categorize();
    const intervalId = setInterval(categorize, 60000); // Re-categorize every minute

    return () => clearInterval(intervalId);
  }, [task.subtasks, task.taskType]);

  const now = new Date();

  const getSubtaskStyling = (subtask: Subtask, columnTitle?: SubtaskStatus) => {
    if (subtask.completed) return 'border-l-4 border-emerald-500';
    if (task.taskType === 'recurring') {
      return task.recurringDays?.includes(getDay(new Date())) ? 'border-l-4 border-amber-500' : 'border-l-4 border-sky-500';
    }
    if (columnTitle === 'Đang làm' && subtask.endDate && isBefore(subtask.endDate, now)) {
      return 'border-l-4 border-destructive';
    }
    if (columnTitle === 'Đang làm') return 'border-l-4 border-amber-500';
    if (columnTitle === 'Chưa làm') return 'border-l-4 border-sky-500';
    return 'border-l-4 border-muted';
  };

  const kanbanColumns: { title: SubtaskStatus, subtasks: Subtask[], isClickable: boolean; titleColor: string; bgColor: string; }[] = [
    { title: 'Chưa làm', subtasks: categorizedSubtasks['Chưa làm'], isClickable: false, titleColor: 'text-sky-500', bgColor: 'bg-sky-500/5' },
    { title: 'Đang làm', subtasks: categorizedSubtasks['Đang làm'], isClickable: true, titleColor: 'text-amber-500', bgColor: 'bg-amber-500/5' },
    { title: 'Xong', subtasks: categorizedSubtasks['Xong'], isClickable: true, titleColor: 'text-emerald-500', bgColor: 'bg-emerald-500/5' },
  ];
  
  const recurringDaysText = task.recurringDays
    ?.sort()
    .map(day => WEEKDAYS[day])
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
                        Hành động này sẽ xóa nhiệm vụ <span className="font-bold">{task.title}</span> vĩnh viễn.
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
        
        <Separator />

        <div className="space-y-6">
            <div className="p-4 rounded-md border bg-primary/10">
                <h2 className="text-lg font-semibold mb-2">Mô tả</h2>
                <p className="text-muted-foreground leading-relaxed">
                    {task.description || 'Không có mô tả cho nhiệm vụ này.'}
                </p>
                {task.taskType === 'recurring' && (
                  <div className="flex items-center gap-2 mt-4 text-sm font-medium text-primary">
                      <Repeat className="h-4 w-4" />
                      Lặp lại vào {recurringDaysText} hàng tuần
                  </div>
                )}
            </div>
        </div>

        {totalSubtasks > 0 && (
          <div className="p-4 rounded-md border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Công việc ({completedSubtasks}/{totalSubtasks})</h2>
              <span className="text-sm font-medium text-muted-foreground">{Math.round(subtaskProgress)}% đã hoàn thành</span>
            </div>
            <div className="space-y-4">
              <Progress value={subtaskProgress} className="h-2" />

              {task.taskType === 'deadline' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {kanbanColumns.map(column => (
                    <div key={column.title} className="flex flex-col">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <h3 className={`font-semibold text-sm ${column.titleColor}`}>{column.title} ({column.subtasks.length})</h3>
                      </div>
                      <div className={`rounded-lg p-2 space-y-2 min-h-24 ${column.bgColor}`}>
                        {column.subtasks.length > 0 ? (
                          column.subtasks.map(st => {
                            const isOverdue = column.title === 'Đang làm' && !st.completed && !!st.endDate && isBefore(st.endDate, now);
                            return (
                              <Card 
                                  key={st.id} 
                                  className={cn(
                                      "bg-background shadow-sm border transition-colors",
                                      getSubtaskStyling(st, column.title)
                                  )}
                              >
                                <CardContent className="p-3">
                                  <SubtaskItem 
                                      subtask={st}
                                      taskType={task.taskType}
                                      onToggle={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                                      onTitleClick={() => handleSubtaskClick(st)}
                                      isClickable={column.isClickable}
                                      isInProgress={column.title === 'Đang làm'}
                                      isOverdue={isOverdue}
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
              ) : ( // Recurring Task View
                <div className="bg-amber-500/5 rounded-lg p-2 space-y-2 min-h-24">
                  {task.subtasks.map(st => (
                    <Card
                      key={st.id}
                      className={cn(
                        "bg-background shadow-sm border transition-colors",
                        getSubtaskStyling(st)
                      )}
                    >
                      <CardContent className="p-3">
                        <SubtaskItem
                          subtask={st}
                          taskType={task.taskType}
                          recurringDays={task.recurringDays}
                          onToggle={(subtaskId) => toggleSubtask(task.id, subtaskId)}
                          onTitleClick={() => handleSubtaskClick(st)}
                          isClickable={true}
                          isInProgress={task.recurringDays?.includes(getDay(new Date())) || false}
                          isOverdue={false}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

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
