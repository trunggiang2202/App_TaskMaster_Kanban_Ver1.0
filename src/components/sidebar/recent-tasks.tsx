
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { SidebarGroup } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, Calendar } from 'lucide-react';
import { isToday, startOfDay, isBefore, isAfter, format } from 'date-fns';

function TaskProgress({ task }: { task: Task }) {
  const [timeProgress, setTimeProgress] = React.useState(100);
  const [timeLeft, setTimeLeft] = React.useState('');
  
  React.useEffect(() => {
    const calculateTimeProgress = () => {
      const now = new Date().getTime();
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      
      if (now >= end) return 0;
      if (now < start) return 100;
      
      const percentage = ((end - now) / (end - start)) * 100;
      return Math.min(Math.max(percentage, 0), 100);
    };

    const calculateTimeLeft = () => {
      if (task.status === 'Done') {
        return 'Đã hoàn thành';
      }

      const now = new Date().getTime();
      const end = new Date(task.endDate).getTime();
      const distance = end - now;

      if (distance < 0) {
        return 'Đã quá hạn';
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);
      
      let result = '';
      if (days > 0) result += `${days}d `;
      if (hours > 0 || days > 0) result += `${hours}h `;
      if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      
      return result.trim() === '' ? '0s' : result.trim();
    }

    const updateTimes = () => {
        setTimeProgress(calculateTimeProgress());
        setTimeLeft(calculateTimeLeft());
    };
    
    updateTimes();
    
    if (task.status !== 'Done') {
      const interval = setInterval(updateTimes, 1000);
      return () => clearInterval(interval);
    }
  }, [task.startDate, task.endDate, task.status]);
  
  const isOverdue = timeProgress === 0 && task.status !== 'Done';
  const isWarning = timeProgress < 20 && task.status !== 'Done';

  const getProgressColor = () => {
    if (isOverdue || isWarning) {
      return 'bg-destructive'; // Red
    }
    return 'bg-emerald-500'; // Green
  };

  const getTimeLeftColor = () => {
    if (task.status === 'Done') return 'text-emerald-500';
    if (isOverdue || isWarning) return 'text-destructive';
    return 'text-sidebar-foreground/80';
  };

  const formattedStartDate = format(task.startDate, 'dd/MM/yyyy HH:mm');
  const formattedEndDate = format(task.endDate, 'dd/MM/yyyy HH:mm');
  
  return (
    <div className="space-y-2">
       <div className="space-y-1 text-xs text-sidebar-foreground/70">
          <div className="flex items-center gap-2">
            <Calendar size={12} />
            <span>Bắt đầu: {formattedStartDate}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar size={12} />
            <span>Kết thúc: {formattedEndDate}</span>
          </div>
        </div>
      <div>
        <div className="flex justify-between items-center mb-1 text-xs">
          <span className={`flex items-center gap-1.5 font-semibold ${getTimeLeftColor()}`}>
            <Clock size={12} /> Thời gian còn lại: {timeLeft}
          </span>
        </div>
        <Progress value={timeProgress} className="h-1.5 bg-sidebar-accent" indicatorClassName={getProgressColor()} />
      </div>
    </div>
  );
}

const TodaySubtasksInfo: React.FC<{ task: Task }> = ({ task }) => {
    const now = new Date();
    
    // "In Progress" subtasks are today's tasks
    const todaySubtasks = task.subtasks.filter(st => !st.completed && st.startDate && isAfter(now, st.startDate));
    
    const uncompletedTodaySubtasks = todaySubtasks.length;

    if (uncompletedTodaySubtasks === 0) {
        return (
            <div className="text-xs text-emerald-500 flex items-center gap-1 mt-1 font-semibold">
                <CheckCircle2 size={14} />
                Công việc hôm nay đã xong
            </div>
        );
    }

    return (
        <div className="text-xs text-sidebar-foreground/70 mt-1">
            {uncompletedTodaySubtasks} công việc hôm nay
        </div>
    );
};


interface RecentTasksProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  activeFilter: 'all' | 'today';
}


export function RecentTasks({ tasks, selectedTaskId, onSelectTask, activeFilter }: RecentTasksProps) {
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <SidebarGroup>
      <div className="space-y-3 px-2">
        {recentTasks.map(task => (
          <div 
            key={task.id}
            onClick={() => onSelectTask(task.id)}
            className={`p-2.5 rounded-lg space-y-2 relative group cursor-pointer transition-colors ${selectedTaskId === task.id ? 'bg-sidebar-accent/50' : 'bg-sidebar-accent'}`}
          >
            <div className="flex justify-between items-start">
              <p className="text-sm font-medium text-sidebar-foreground truncate pr-6">{task.title}</p>
            </div>
            <TaskProgress 
              task={task} 
            />
            {activeFilter === 'today' && <TodaySubtasksInfo task={task} />}
          </div>
        ))}
         {recentTasks.length === 0 && (
          <p className="text-sm text-center text-sidebar-foreground/60 py-4">Không có nhiệm vụ nào cho hôm nay</p>
        )}
      </div>
    </SidebarGroup>
  );
}
