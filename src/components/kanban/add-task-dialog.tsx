'use client';

import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Plus, Trash2 } from 'lucide-react';
import type { Task, Subtask } from '@/lib/types';
import { Separator } from '@/components/ui/separator';

const taskSchema = z.object({
  title: z.string().min(3, 'Nhiệm vụ phải có ít nhất 3 ký tự.'),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  endDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  subtasks: z.array(z.object({
    title: z.string().min(1, "Tiêu đề công việc không được để trống."),
  })).optional(),
}).refine(data => {
    try {
      const [startDay, startMonth, startYear] = data.startDate.split('-').map(Number);
      const [endDay, endMonth, endYear] = data.endDate.split('-').map(Number);
      
      const startDateTime = new Date(startYear, startMonth - 1, startDay, ...data.startTime.split(':').map(Number));
      const endDateTime = new Date(endYear, endMonth - 1, endDay, ...data.endTime.split(':').map(Number));
      
      return endDateTime > startDateTime;
    } catch (e) {
      return false;
    }
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endDate"],
});


type TaskFormData = z.infer<typeof taskSchema>;

interface AddTaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onAddTask: (task: Task) => void;
}

export function AddTaskDialog({ isOpen, onOpenChange, onAddTask }: AddTaskDialogProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      endTime: '17:00',
      subtasks: [],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      form.reset();
    }
    onOpenChange(open);
  }

  function onSubmit(data: TaskFormData) {
    const newSubtasks: Subtask[] = data.subtasks ? data.subtasks.map(st => ({
      id: crypto.randomUUID(),
      title: st.title,
      completed: false,
    })) : [];

    const [startDay, startMonth, startYear] = data.startDate.split('-').map(Number);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
    
    const [endDay, endMonth, endYear] = data.endDate.split('-').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay, endHour, endMinute);

    const newTask: Task = {
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: 'To Do',
      createdAt: new Date(),
      startDate,
      endDate,
      subtasks: newSubtasks,
    };
    onAddTask(newTask);
    handleOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Thêm công việc mới</DialogTitle>
          <DialogDescription>
            Điền vào các chi tiết cho công việc mới của bạn. Bạn có thể thêm các công việc để chia nhỏ nó ra.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nhiệm vụ</FormLabel>
                  <FormControl>
                    <Input placeholder="ví dụ: Hoàn thành báo cáo dự án" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mô tả (Tùy chọn)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Thêm chi tiết về công việc..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Bắt đầu</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                         <FormControl>
                            <Input placeholder="31-12-2024" {...field} />
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giờ (HH:MM)</FormLabel>
                         <FormControl>
                            <Input placeholder="09:00" {...field} />
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-2">Kết thúc</h3>
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="endDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                         <FormControl>
                            <Input placeholder="31-12-2024" {...field} />
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Giờ (HH:MM)</FormLabel>
                        <FormControl>
                            <Input placeholder="17:00" {...field} />
                          </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            </div>

            <Separator />
            
            <div>
              <FormLabel>Công việc</FormLabel>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2">
                    <FormField
                      control={form.control}
                      name={`subtasks.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input placeholder={`Công việc ${index + 1}`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => append({ title: "" })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Thêm công việc
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => handleOpenChange(false)}>Hủy</Button>
              <Button type="submit">Tạo công việc</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
