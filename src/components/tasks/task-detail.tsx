'use client';

import * as React from 'react';
import type { Task, Subtask, Status, Attachment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format, isAfter, isBefore, isToday, startOfDay } from 'date-fns';
import { Calendar, Clock, Edit, FileText, ListChecks, LoaderCircle, Paperclip, Trash2, Circle, Check, Download, AlertTriangle } from 'lucide-react';

const statusConfig: { [key in Status]: { label: string; color: string; } } = {
  'To Do': { label: 'Cần làm', color: 'bg-sky-500' },
  'In Progress': { label: 'Đang thực hiện', color: 'bg-amber-500' },
  'Done': { label: 'Hoàn thành', color: 'bg-emerald-500' },
};

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
    taskStatus: Status;
    onToggle: (subtaskId: string) => void;
}

const SubtaskItem: React.FC<SubtaskItemProps> = ({ subtask, taskStatus, onToggle }) => {
    const isSubtaskInProgress = taskStatus === 'In Progress' && !subtask.completed;

    return (
        <div 
            key={subtask.id} 
            className="flex flex-col p-3 rounded-md bg-muted/50"
        >
            <div 
                className="flex items-start gap-3"
            >
                {isSubtaskInProgress ? (
                    <LoaderCircle className="h-5 w-5 mt-0.5 text-amber-500 shrink-0 animate-spin" />
                ) : subtask.completed ? (
                    <div className="h-5 w-5 flex items-center justify-center bg-primary rounded-full shrink-0 cursor-pointer" onClick={() => onToggle(subtask.id)}>
                        <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                ) : (
                    <div className="h-5 w-5 mt-0.5 shrink-0 cursor-pointer" onClick={() => onToggle(subtask.id)}>
                      <Circle className="h-5 w-5 text-muted-foreground" />
                    </div>
                )}
                <div className="flex-1">
                    <span className={`text-sm ${subtask.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                        {subtask.title}
                    </span>
                    {subtask.description && <p className="text-xs text-muted-foreground">{subtask.description}</p>}
                </div>
            </div>
            {subtask.attachments && subtask.attachments.length > 0 && (
              <div className="pl-8 pt-2 space-y-2">
                 {subtask.attachments.map((att, index) => <AttachmentItem key={index} attachment={att} />)}
              </div>
            )}
        </div>
    )
};


interface TaskDetailProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

type SubtaskStatus = 'Chưa làm' | 'Đang làm' | 'Xong' | 'Trễ';

export default function TaskDetail({ task, onUpdateTask, onDeleteTask, onEditTask }: TaskDetailProps) {
  const [formattedRange, setFormattedRange] = React.useState('');

  React.useEffect(() => {
    if (task) {
      const start = format(task.startDate, 'MMM d, yyyy, HH:mm');
      const end = format(task.endDate, 'MMM d, yyyy, HH:mm');
      setFormattedRange(`${start} - ${end}`);
    }
  }, [task]);

  const handleSubtaskToggle = (subtaskId: string) => {
    // This function is disabled as per user request
  };
  
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);

  const categorizedSubtasks = React.useMemo(() => {
    const categories: Record<SubtaskStatus, Subtask[]> = {
      'Chưa làm': [],
      'Đang làm': [],
      'Xong': [],
      'Trễ': [],
    };

    const today = startOfDay(new Date());

    task.subtasks.forEach(st => {
      if (st.completed) {
        categories['Xong'].push(st);
        return;
      }

      const stStartDate = st.startDate ? startOfDay(st.startDate) : null;
      const stEndDate = st.endDate ? startOfDay(st.endDate) : null;

      if (stEndDate && isBefore(stEndDate, today)) {
          categories['Trễ'].push(st);
      } else if (stStartDate && (isAfter(stStartDate, today))) {
          categories['Chưa làm'].push(st);
      } else {
          categories['Đang làm'].push(st);
      }
    });

    return categories;
  }, [task.subtasks]);


  const kanbanColumns: { title: SubtaskStatus, icon: React.ReactNode, subtasks: Subtask[] }[] = [
    { title: 'Chưa làm', icon: <Clock className="h-4 w-4 text-sky-500" />, subtasks: categorizedSubtasks['Chưa làm'] },
    { title: 'Đang làm', icon: <LoaderCircle className="h-4 w-4 text-amber-500 animate-spin" />, subtasks: categorizedSubtasks['Đang làm'] },
    { title: 'Trễ', icon: <AlertTriangle className="h-4 w-4 text-destructive" />, subtasks: categorizedSubtasks['Trễ'] },
    { title: 'Xong', icon: <Check className="h-4 w-4 text-emerald-500" />, subtasks: categorizedSubtasks['Xong'] },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Badge className={`${statusConfig[task.status].color} hover:${statusConfig[task.status].color} text-white`}>
            {statusConfig[task.status].label}
          </Badge>
          <div className="flex items-center gap-2">
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
        <h1 className="text-3xl font-bold font-headline tracking-tight">{task.title}</h1>
      </div>

      {/* Date Range */}
      <div className="flex items-center gap-2 text-muted-foreground">
        <Calendar className="h-5 w-5" />
        <span>{formattedRange}</span>
      </div>
      
      <Separator />

      {/* Description */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <FileText className="h-5 w-5" />
          <h2 className="text-lg">Mô tả</h2>
        </div>
        <p className="text-muted-foreground leading-relaxed pl-7">
          {task.description || 'Không có mô tả cho nhiệm vụ này.'}
        </p>
      </div>
      
       {/* Main Task Attachments */}
      {task.attachments && task.attachments.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-semibold">
            <Paperclip className="h-5 w-5" />
            <h2 className="text-lg">Tệp đính kèm</h2>
          </div>
          <div className="pl-7 grid grid-cols-1 md:grid-cols-2 gap-2">
            {task.attachments.map((att, index) => <AttachmentItem key={index} attachment={att} />)}
          </div>
        </div>
      )}

      {/* Subtasks */}
      {totalSubtasks > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 font-semibold">
            <ListChecks className="h-5 w-5" />
            <h2 className="text-lg">Công việc ({completedSubtasks}/{totalSubtasks})</h2>
          </div>
          <div className="pl-7 space-y-2">
            <Progress value={subtaskProgress} className="h-2 mb-4" />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
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
                                taskStatus={task.status}
                                onToggle={handleSubtaskToggle}
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
  );
}
