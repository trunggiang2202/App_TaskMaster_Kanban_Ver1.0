'use client';

import * as React from 'react';
import type { Task, Subtask, Status, Attachment } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Calendar, Clock, Edit, FileText, ListChecks, LoaderCircle, Paperclip, Trash2, Circle, Check, Download } from 'lucide-react';

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

interface TaskDetailProps {
  task: Task;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onEditTask: (task: Task) => void;
}

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
    const updatedSubtasks = task.subtasks.map(st =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    );
    onUpdateTask({ ...task, subtasks: updatedSubtasks });
  };
  
  const completedSubtasks = task.subtasks.filter(st => st.completed).length;
  const totalSubtasks = task.subtasks.length;
  const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : (task.status === 'Done' ? 100 : 0);

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
        <div className="space-y-3 pl-7">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
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
          <div className="pl-7 space-y-3">
             <Progress value={subtaskProgress} className="h-2" />
            {task.subtasks.map(subtask => {
                const isSubtaskInProgress = task.status === 'In Progress' && !subtask.completed;
                return (
                    <div 
                        key={subtask.id} 
                        className="flex flex-col p-3 rounded-md bg-muted/50"
                    >
                        <div 
                            className="flex items-start gap-3 cursor-pointer"
                            onClick={() => handleSubtaskToggle(subtask.id)}
                        >
                            {isSubtaskInProgress ? (
                                <LoaderCircle className="h-5 w-5 mt-0.5 text-amber-500 shrink-0 animate-spin" />
                            ) : subtask.completed ? (
                                <div className="h-5 w-5 flex items-center justify-center bg-primary rounded-full shrink-0">
                                    <Check className="h-3 w-3 text-primary-foreground" />
                                </div>
                            ) : (
                                <Circle className="h-5 w-5 mt-0.5 text-muted-foreground shrink-0" />
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
            })}
          </div>
        </div>
      )}

      {/* Main Attachments Section */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 font-semibold">
          <Paperclip className="h-5 w-5" />
          <h2 className="text-lg">Tệp đính kèm</h2>
        </div>
        <div className="pl-7 text-sm text-muted-foreground">
            {(!task.attachments || task.attachments.length === 0) ? (
              <p>Chưa có tệp đính kèm nào.</p>
            ) : (
               <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                 {task.attachments.map((att, index) => <AttachmentItem key={index} attachment={att} />)}
               </div>
            )}
        </div>
      </div>
    </div>
  );
}
