
'use client';

import * as React from 'react';
import type { Task } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { isBefore, isAfter, startOfDay } from 'date-fns';
import { TrendingUp, Circle, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

interface StatsData {
  tasks: {
    inProgress: number;
    upcoming: number;
    done: number;
    overdue: number;
    total: number;
  };
  subtasks: {
    inProgress: number;
    upcoming: number;
    done: number;
    overdue: number;
    total: number;
  };
}

const COLORS = {
  inProgress: 'hsl(var(--chart-2))', // Amber
  upcoming: 'hsl(var(--chart-1))', // Sky
  done: 'hsl(var(--chart-3))', // Emerald
  overdue: 'hsl(var(--destructive))', // Destructive
};

export function StatsView({ tasks }: { tasks: Task[] }) {
  const stats = React.useMemo<StatsData>(() => {
    const now = new Date();
    const today = startOfDay(now);
    
    const initialStats: StatsData = {
      tasks: { inProgress: 0, upcoming: 0, done: 0, overdue: 0, total: tasks.length },
      subtasks: { inProgress: 0, upcoming: 0, done: 0, overdue: 0, total: 0 },
    };

    return tasks.reduce((acc, task) => {
      // Task stats
      if (task.status === 'Done') {
        acc.tasks.done++;
      } else if (isBefore(today, startOfDay(task.startDate))) {
        acc.tasks.upcoming++;
      } else if (isAfter(now, task.endDate)) {
        acc.tasks.overdue++;
      } else {
        acc.tasks.inProgress++;
      }

      // Subtask stats
      acc.subtasks.total += task.subtasks.length;
      task.subtasks.forEach(subtask => {
        if (subtask.completed) {
          acc.subtasks.done++;
        } else if (!subtask.startDate || !subtask.endDate) {
          // If no dates, consider it upcoming
          acc.subtasks.upcoming++;
        } else if (isBefore(today, startOfDay(subtask.startDate))) {
          acc.subtasks.upcoming++;
        } else if (isAfter(now, subtask.endDate)) {
          acc.subtasks.overdue++;
        } else {
          acc.subtasks.inProgress++;
        }
      });

      return acc;
    }, initialStats);
  }, [tasks]);

  const taskChartData = [
    { name: 'Đang làm', value: stats.tasks.inProgress, color: COLORS.inProgress },
    { name: 'Sắp làm', value: stats.tasks.upcoming, color: COLORS.upcoming },
    { name: 'Đã xong', value: stats.tasks.done, color: COLORS.done },
    { name: 'Quá hạn', value: stats.tasks.overdue, color: COLORS.overdue },
  ].filter(item => item.value > 0);

  const subtaskChartData = [
    { name: 'Đang làm', value: stats.subtasks.inProgress, color: COLORS.inProgress },
    { name: 'Sắp làm', value: stats.subtasks.upcoming, color: COLORS.upcoming },
    { name: 'Đã xong', value: stats.subtasks.done, color: COLORS.done },
    { name: 'Quá hạn', value: stats.subtasks.overdue, color: COLORS.overdue },
  ].filter(item => item.value > 0);

  const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card className="bg-muted/30">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between gap-4">
            <h1 className="text-3xl font-bold font-headline tracking-tight flex items-center gap-3">
                <TrendingUp className="h-8 w-8" />
                Thống kê công việc
            </h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Đang làm" value={stats.subtasks.inProgress} icon={<Clock className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Sắp làm" value={stats.subtasks.upcoming} icon={<Circle className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Đã xong" value={stats.subtasks.done} icon={<CheckCircle2 className="h-4 w-4 text-muted-foreground" />} />
            <StatCard title="Quá hạn" value={stats.subtasks.overdue} icon={<AlertTriangle className="h-4 w-4 text-muted-foreground" />} />
        </div>
        <div className="grid gap-6 md:grid-cols-2">
            <Card>
                <CardHeader>
                    <CardTitle>Tổng quan Nhiệm vụ ({stats.tasks.total})</CardTitle>
                </CardHeader>
                <CardContent>
                    {stats.tasks.total > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={taskChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                                {`${(percent * 100).toFixed(0)}%`}
                                            </text>
                                        );
                                    }}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {taskChartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} nhiệm vụ`, undefined]}/>
                                <Legend iconSize={12} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                            <p>Chưa có dữ liệu nhiệm vụ.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
             <Card>
                <CardHeader>
                    <CardTitle>Tổng quan Công việc con ({stats.subtasks.total})</CardTitle>
                </CardHeader>
                <CardContent>
                     {stats.subtasks.total > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={subtaskChartData}
                                    cx="50%"
                                    cy="50%"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                        const x = cx + radius * Math.cos(-midAngle * (Math.PI / 180));
                                        const y = cy + radius * Math.sin(-midAngle * (Math.PI / 180));
                                        return (
                                            <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" className="text-xs font-bold">
                                                {`${(percent *-100).toFixed(0)}%`}
                                            </text>
                                        );
                                    }}
                                    outerRadius={100}
                                    fill="#8884d8"
                                    dataKey="value"
                                >
                                    {subtaskChartData.map((entry) => (
                                        <Cell key={`cell-${entry.name}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => [`${value} công việc`, undefined]}/>
                                <Legend iconSize={12} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                         <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                            <p>Chưa có dữ liệu công việc con.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
