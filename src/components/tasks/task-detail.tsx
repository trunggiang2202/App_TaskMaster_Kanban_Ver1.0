'use client';

import * as React from 'react';
import type { Task, Subtask, Status, Attachment } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, Clock, Edit, ListChecks, LoaderCircle, Paperclip, Trash2, Circle, Check, Download } from 'lucide-react';
import { SubtaskDetailDialog } from './subtask-detail-dialog';

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
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, onToggle, onTitleClick, isClickable }) => {
    const handleToggle = () => {
        if (isClickable) {
            onToggle(subtask.id);
        }
    };

    return (
        <div 
            key={subtask.id} 
            className="flex flex-col p-3 rounded-md bg-muted/50 cursor-pointer"
            onClick={onTitleClick}
        >
            <div className="flex items-start gap-3">
                 {subtask.completed ? (
                    <div className="h-5 w-5 flex items-center justify-center bg-primary rounded-full shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
                        <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                ) : (
                    isClickable ? (
                        <div className="h-5 w-5 mt-0.5 shrink-0 cursor-pointer" onClick={(e) => { e.stopPropagation(); handleToggle(); }}>
                          <Circle className="h-5 w-5 text-muted-foreground" />
                        </div>
                    ) : (
                        <div className="h-5 w-5 mt-0.5 shrink-0">
                           <div className="w-5 h-5" />
                        </div>
                    )
                )}
                <div className="flex-1">
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

    const today = startOfDay(new Date());

    task.subtasks.forEach(st => {
      if (st.completed) {
        categories['Xong'].push(st);
        return;
      }

      const stStartDate = st.startDate ? startOfDay(st.startDate) : null;
      
      if (stStartDate && isAfter(stStartDate, today)) {
          categories['Chưa làm'].push(st);
      } else {
          categories['Đang làm'].push(st);
      }
    });

    return categories;
  }, [task.subtasks]);


  const kanbanColumns: { title: SubtaskStatus, icon: React.ReactNode, subtasks: Subtask[], isClickable: boolean }[] = [
    { title: 'Chưa làm', icon: <Clock className="h-4 w-4 text-sky-500" />, subtasks: categorizedSubtasks['Chưa làm'], isClickable: false },
    { title: 'Đang làm', icon: <LoaderCircle className="h-4 w-4 text-amber-500 animate-spin" />, subtasks: categorizedSubtasks['Đang làm'], isClickable: true },
    { title: 'Xong', icon: <Check className="h-4 w-4 text-emerald-500" />, subtasks: categorizedSubtasks['Xong'], isClickable: true },
  ];

  return (
    <>
      <div className="p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
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

        {/* Date Range */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-5 w-5" />
          <span>{formattedRange}</span>
        </div>
        
        <Separator />

        {/* Description */}
        <div className="p-4 rounded-md border bg-muted/20 space-y-3">
          <div className="flex items-center font-semibold">
            <h2 className="text-lg">Mô tả</h2>
          </div>
          <p className="text-muted-foreground leading-relaxed">
            {task.description || 'Không có mô tả cho nhiệm vụ này.'}
          </p>
        </div>
        
        {/* Subtasks */}
        {totalSubtasks > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 font-semibold">
              <ListChecks className="h-5 w-5" />
              <h2 className="text-lg">Công việc ({completedSubtasks}/{totalSubtasks})</h2>
            </div>
            <div className="pl-7 space-y-2">
              <Progress value={subtaskProgress} className="h-2 mb-4" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {kanbanColumns.map(column => (
                  <div key={column.title} className="flex flex-col">
                    <div className="flex items-center gap-2 mb-2">
                      {column.icon}
                      <h3 className="font-semibold text-sm">{column.title} ({column.subtasks.length})</h3>
                    </div>
                    <div className="bg-muted/30 rounded-lg p-2 space-y-2 min-h-24">
                      {column.subtasks.length > 0 ? (
                        column.subtasks.map(st => (
                          <Card key={st.id} className="bg-background shadow-sm">
                             <CardContent className="p-0">
                              <SubtaskItem 
                                  subtask={st}
                                  onToggle={(subtaskId) => onSubtaskToggle(task.id, subtaskId)}
                                  onTitleClick={() => handleSubtaskClick(st)}
                                  isClickable={column.isClickable}
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
