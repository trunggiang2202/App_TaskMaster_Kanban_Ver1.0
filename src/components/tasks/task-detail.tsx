'use client';

import * as React from 'react';
import type { Task, Subtask, Status, Attachment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, startOfDay } from 'date-fns';
import { Calendar, Edit, Trash2, Circle, Check, Download, Paperclip, LoaderCircle } from 'lucide-react';
import { SubtaskDetailDialog } from './subtask-detail-dialog';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onToggle, onTitleClick, isClickable, isInProgress }) => {
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
                <div className="h-5 w-5 flex items-center justify-center bg-primary rounded-full">
                    <Check className="h-3 w-3 text-primary-foreground" />
                </div>
            );
        }
        if (isInProgress) {
            return <LoaderCircle className="h-5 w-5 text-amber-500 animate-spin" />;
        }
        return <Circle className="h-5 w-5 text-muted-foreground" />;
    };

    const iconElement = (
      <div 
        className={`h-5 w-5 mt-0.5 shrink-0 ${canComplete ? 'cursor-pointer' : 'cursor-not-allowed'}`} 
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

export default function TaskDetail({ task, onUpdateTask, onDeleteTask, onEditTask, onSubtaskToggle }: TaskDetailProps) {
  const [formattedRange, setFormattedRange] = React.useState('');
  const [selectedSubtask, setSelectedSubtask] = React.useState<Subtask | null>(null);
  const [isSubtaskDetailOpen, setIsSubtaskDetailOpen] = React.useState(false);

  React.useEffect(() => {
    if (task) {
      const start = format(task.startDate, 'MMM d, yyyy, HH:mm');
      const end = format(task.endDate, 'MMM d, yyyy, HH:mm');
      setFormattedRange(`${start} - ${end}`);
    }
  }, [task]);
  
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);

  const handleSubtaskClick = (subtask: Subtask) => {
    setSelectedSubtask(subtask);
    setIsSubtaskDetailOpen(true);
  };

  const categorizedSubtasks = React.useMemo(() => {
    const categories: Record<SubtaskStatus, Subtask[]> = {
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
      
      // A subtask is "In Progress" if it's not done and its start time is in the past or now.
      if (st.startDate && isAfter(now, st.startDate)) {
          categories['Đang làm'].push(st);
      } else {
          // Otherwise, it's "To Do" (upcoming or no start date)
          categories['Chưa làm'].push(st);
      }
    });

    return categories;
  }, [task.subtasks]);


  const kanbanColumns: { title: SubtaskStatus, subtasks: Subtask[], isClickable: boolean; titleColor: string; borderColor: string; bgColor: string; }[] = [
    { title: 'Chưa làm', subtasks: categorizedSubtasks['Chưa làm'], isClickable: false, titleColor: 'text-sky-500', borderColor: 'border-sky-500', bgColor: 'bg-sky-500/5' },
    { title: 'Đang làm', subtasks: categorizedSubtasks['Đang làm'], isClickable: true, titleColor: 'text-amber-500', borderColor: 'border-amber-500', bgColor: 'bg-amber-500/5' },
    { title: 'Xong', subtasks: categorizedSubtasks['Xong'], isClickable: true, titleColor: 'text-emerald-500', borderColor: 'border-emerald-500', bgColor: 'bg-emerald-500/5' },
  ];

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight">{task.title}</h1>
            <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="outline" size="sm" onClick={() => onEditTask(task)}>
                <Edit className="h-4 w-4 mr-2" />
                Chỉnh sửa
                </Button>
                <Button variant="destructive" size="sm" onClick={() => onDeleteTask(task.id)}>
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa
                </Button>
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
            <div className="p-4 rounded-md border bg-muted/20">
                <h2 className="text-lg font-semibold mb-2">Deadline</h2>
                <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-5 w-5" />
                    <span>{formattedRange}</span>
                </div>
            </div>
        </div>

        {totalSubtasks > 0 && (
          <div className="p-4 rounded-md border bg-muted/20 space-y-4">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-semibold">Công việc ({completedSubtasks}/{totalSubtasks})</h2>
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
                        column.subtasks.map(st => (
                          <Card key={st.id} className={`bg-background shadow-sm border-l-4 ${column.borderColor}`}>
                             <CardContent className="p-3">
                              <SubtaskItem 
                                  subtask={st}
                                  onToggle={(subtaskId) => onSubtaskToggle(task.id, subtaskId)}
                                  onTitleClick={() => handleSubtaskClick(st)}
                                  isClickable={column.isClickable}
                                  isInProgress={column.title === 'Đang làm' && !st.completed}
                              />
                             </CardContent>
                          </Card>
                        ))
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
