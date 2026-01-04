
'use client';

import * as React from 'react';
import type { Task, Subtask, Attachment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, isBefore } from 'date-fns';
import { vi } from 'date-fns/locale';
import { Calendar, Edit, Trash2, Circle, Check, Download, Paperclip, LoaderCircle, AlertTriangle } from 'lucide-react';
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

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => (
  <a 
    href={attachment.url} 
    target="_blank" 
    rel="noopener noreferrer" 
    className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors text-sm"
  >
    <Paperclip className="h-4 w-4 text-muted-foreground" />
    <span className="flex-1 truncate text-foreground">{attachment.name}</span>
    <Download className="h-4 w-4 text-muted-foreground" />
  </a>
);

interface SubtaskItemProps {
    subtask: Subtask;
    onToggle: (subtaskId: string) => void;
    onTitleClick: () => void;
    isClickable: boolean;
    isInProgress: boolean;
    isOverdue: boolean;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onToggle, onTitleClick, isClickable, isInProgress, isOverdue }) => {
    const canComplete = isClickable && !!subtask.startDate && !!subtask.endDate;

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


    return (
        <div 
            key={subtask.id} 
            className="flex flex-col"
        >
            <div className="flex items-start gap-3">
                 <TooltipProvider>
                    {!canComplete && !subtask.completed ? (
                        <Tooltip>
                            <TooltipTrigger asChild>{iconElement}</TooltipTrigger>
                            <TooltipContent>
                                <p>Cần đặt deadline để hoàn thành</p>
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
            </div>
        </div>
    )
};


interface TaskDetailProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
  onSubtaskToggle: (taskId: string, subtaskId: string) => void;
}

type SubtaskStatus = 'Chưa làm' | 'Đang làm' | 'Xong';

type CategorizedSubtasks = Record<SubtaskStatus, Subtask[]>;

const initialCategorizedSubtasks: CategorizedSubtasks = {
  'Chưa làm': [],
  'Đang làm': [],
  'Xong': [],
};

export default function TaskDetail({ task, onUpdateTask, onDeleteTask, onEditTask, onSubtaskToggle }: TaskDetailProps) {
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

    categorize(); // Initial categorization
    const intervalId = setInterval(categorize, 1000); // Re-categorize every second

    return () => clearInterval(intervalId); // Cleanup interval on component unmount
  }, [task.subtasks]);

  const now = new Date();

  const getSubtaskBorderColor = (subtask: Subtask, columnTitle: SubtaskStatus) => {
    if (subtask.completed) return 'border-emerald-500';
    if (columnTitle === 'Đang làm' && subtask.endDate && isBefore(subtask.endDate, now)) {
      return 'border-destructive';
    }
    if (columnTitle === 'Đang làm') return 'border-amber-500';
    if (columnTitle === 'Chưa làm') return 'border-sky-500';
    return 'border-muted';
  };

  const kanbanColumns: { title: SubtaskStatus, subtasks: Subtask[], isClickable: boolean; titleColor: string; bgColor: string; }[] = [
    { title: 'Chưa làm', subtasks: categorizedSubtasks['Chưa làm'], isClickable: false, titleColor: 'text-sky-500', bgColor: 'bg-sky-500/5' },
    { title: 'Đang làm', subtasks: categorizedSubtasks['Đang làm'], isClickable: true, titleColor: 'text-amber-500', bgColor: 'bg-amber-500/5' },
    { title: 'Xong', subtasks: categorizedSubtasks['Xong'], isClickable: true, titleColor: 'text-emerald-500', bgColor: 'bg-emerald-500/5' },
  ];

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
                        Hành động này không thể được hoàn tác. Thao tác này sẽ xóa vĩnh viễn nhiệm vụ
                        <span className="font-bold"> {task.title} </span>
                        và tất cả dữ liệu liên quan khỏi máy chủ của chúng tôi.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction variant="destructive" onClick={() => onDeleteTask(task.id)}>
                        Xóa
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
            </div>
        </div>
        
        <Separator />

        <div className="space-y-6">
            <div className="p-4 rounded-md border bg-muted/20">
                <h2 className="text-lg font-semibold mb-2">Mô tả</h2>
                <p className="text-muted-foreground leading-relaxed">
                    {task.description || 'Không có mô tả cho nhiệm vụ này.'}
                </p>
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
                                    "bg-background shadow-sm border transition-colors cursor-pointer hover:bg-muted/50",
                                    getSubtaskBorderColor(st, column.title)
                                )}
                                onClick={() => handleSubtaskClick(st)}
                            >
                              <CardContent className="p-3">
                                <SubtaskItem 
                                    subtask={st}
                                    onToggle={(subtaskId) => onSubtaskToggle(task.id, subtaskId)}
                                    onTitleClick={() => handleSubtaskClick(st)}
                                    isClickable={column.isClickable}
                                    isInProgress={column.title === 'Đang làm' && !st.completed}
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
