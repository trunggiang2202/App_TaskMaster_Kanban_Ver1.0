
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { SidebarGroup } from '@/components/ui/sidebar';
import { Progress } from '@/components/ui/progress';
import { Clock, CheckCircle2, Calendar } from 'lucide-react';
import { isToday, startOfDay, isBefore, isAfter, format, isWithinInterval } from 'date-fns';
import { vi } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const calculateInitialTimeProgress = (task: Task) => {
    const now = new Date().getTime();
    const start = new Date(task.startDate).getTime();
    const end = new Date(task.endDate).getTime();
    
    if (now >= end) return 0;
    if (now < start) return 100;
    
    const percentage = ((end - now) / (end - start)) * 100;
    return Math.min(Math.max(percentage, 0), 100);
};

function TaskProgress({ task }: { task: Task }) {
  const [timeProgress, setTimeProgress] = React.useState(() => calculateInitialTimeProgress(task));
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
      const start = new Date(task.startDate).getTime();
      const end = new Date(task.endDate).getTime();
      
      if (now < start) {
        const distance = end - start;
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        let result = '';
        if (days > 0) result += `${days}d `;
        if (hours > 0 || days > 0) result += `${hours}h `;
        if (minutes > 0 || hours > 0 || days > 0) result += `${minutes}m `;
        return result.trim();
      }

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
      if (hours > 0) result += `${hours}h `;
      if (minutes > 0) result += `${minutes}m `;
      result += `${seconds}s`;
      
      if (result.trim() === '') return 'dưới 1 giây';
      return result.trim();
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
  
  const now = new Date();
  const isOverdue = task.status !== 'Done' && isAfter(now, task.endDate);
  const isUpcoming = isBefore(now, task.startDate);
  const isWarning = !isOverdue && timeProgress < 20;

  const getTimeLeftColor = () => {
    if (task.status === 'Done') return 'text-emerald-500';
    if (isOverdue) return 'text-destructive';
    if (isWarning) return 'text-destructive';
    if (isUpcoming) return 'text-sky-500';
    return 'text-sidebar-foreground/80';
  };

  const getIndicatorColor = (progress: number) => {
    if (progress > 60) {
      return 'bg-emerald-500';
    }
    if (progress > 30) {
      return 'bg-amber-500';
    }
    return 'bg-destructive';
  };

  const formattedStartDate = format(task.startDate, 'p, dd/MM/yyyy', { locale: vi });
  const formattedEndDate = format(task.endDate, 'p, dd/MM/yyyy', { locale: vi });
  const isStarted = !isUpcoming && !isOverdue && task.status !== 'Done';
  
  return (
    <div className="space-y-2">
       <div className="space-y-1.5 text-xs text-sidebar-foreground/70">
          <div className={cn("flex items-center gap-2", isStarted && "text-emerald-500")}>
            <Calendar size={12} />
            <span>Bắt đầu: {formattedStartDate}</span>
            {isStarted && <span>(Đã bắt đầu)</span>}
          </div>
          {task.status === 'Done' ? (
            <div className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 size={12} />
                <span>Đã hoàn thành</span>
            </div>
          ) : (
            <div className={cn("flex items-center gap-2", isOverdue && "text-destructive")}>
                <Calendar size={12} />
                <span>Kết thúc: {formattedEndDate}</span>
                {isOverdue && <span>(Đã quá hạn)</span>}
            </div>
          )}
          {task.status !== 'Done' && (
              <div className={`flex items-center gap-2 ${getTimeLeftColor()}`}>
                <Clock size={12} /> 
                <span>{isUpcoming ? 'Tổng thời gian' : isOverdue ? '' : 'Thời gian còn lại: '}{isOverdue ? 'Đã quá hạn' : timeLeft}</span>
              </div>
          )}
        </div>
        {!isOverdue && task.status !== 'Done' && (
            <Progress value={timeProgress} className={`h-1.5`} indicatorClassName={getIndicatorColor(timeProgress)} />
        )}
    </div>
  );
}

interface RecentTasksProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  activeFilter: 'all' | 'today' | 'week';
}


export function RecentTasks({ tasks, selectedTaskId, onSelectTask, activeFilter }: RecentTasksProps) {
  const recentTasks = [...tasks]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <SidebarGroup>
      <div className="space-y-3 px-2">
        {recentTasks.map(task => {
          return (
            <div 
              key={task.id}
              onClick={() => onSelectTask(task.id)}
              className={cn(
                  'p-2.5 rounded-lg space-y-2 relative group cursor-pointer transition-colors bg-sidebar-accent/50 hover:bg-sidebar-accent/80',
                  selectedTaskId === task.id ? 'ring-2 ring-sidebar-primary bg-sidebar-accent' : 'border border-transparent'
              )}
            >
              <div className="flex justify-between items-start">
                <p className="text-sm text-sidebar-foreground truncate pr-6">{task.title}</p>
              </div>
              
              <TaskProgress 
                task={task} 
              />
            </div>
          )
        })}
         {recentTasks.length === 0 && (
          <p className="text-sm text-center text-sidebar-foreground/60 py-4">
            {activeFilter === 'today' ? 'Không có nhiệm vụ nào cho hôm nay' : 
             activeFilter === 'week' ? 'Không có nhiệm vụ cho ngày này' :
             'Không có nhiệm vụ nào'}
          </p>
        )}
      </div>
    </SidebarGroup>
  );
}
