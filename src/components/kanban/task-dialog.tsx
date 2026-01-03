'use client';

import { useEffect } from 'react';
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
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const subtaskSchema = z.object({
  title: z.string().min(1, "Tiêu đề công việc không được để trống."),
});

const taskSchema = z.object({
  title: z.string().min(3, 'Nhiệm vụ phải có ít nhất 3 ký tự.'),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  endDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  subtasks: z.array(subtaskSchema).optional(),
}).refine(data => {
    try {
      const [startDay, startMonth, startYear] = data.startDate.split('-').map(Number);
      const [startHour, startMinute] = data.startTime.split(':').map(Number);
      const startDateTime = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
      
      const [endDay, endMonth, endYear] = data.endDate.split('-').map(Number);
      const [endHour, endMinute] = data.endTime.split(':').map(Number);
      const endDateTime = new Date(endYear, endMonth - 1, endDay, endHour, endMinute);
      
      return endDateTime > startDateTime;
    } catch (e) {
      return false;
    }
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endDate"],
});


type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task) => void;
  taskToEdit?: Task;
}

export function TaskDialog({ isOpen, onOpenChange, onSubmit, taskToEdit }: TaskDialogProps) {
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
  
  useEffect(() => {
    if (taskToEdit) {
      form.reset({
        title: taskToEdit.title,
        description: taskToEdit.description || '',
        startDate: format(taskToEdit.startDate, 'dd-MM-yyyy'),
        startTime: format(taskToEdit.startDate, 'HH:mm'),
        endDate: format(taskToEdit.endDate, 'dd-MM-yyyy'),
        endTime: format(taskToEdit.endDate, 'HH:mm'),
        subtasks: taskToEdit.subtasks.map(st => ({
          title: st.title,
        })),
      });
    } else {
      form.reset({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        startTime: '09:00',
        endTime: '17:00',
        subtasks: [],
      });
    }
  }, [taskToEdit, form.reset]);

  function handleSubmit(data: TaskFormData) {
    const [startDay, startMonth, startYear] = data.startDate.split('-').map(Number);
    const [startHour, startMinute] = data.startTime.split(':').map(Number);
    const startDate = new Date(startYear, startMonth - 1, startDay, startHour, startMinute);
    
    const [endDay, endMonth, endYear] = data.endDate.split('-').map(Number);
    const [endHour, endMinute] = data.endTime.split(':').map(Number);
    const endDate = new Date(endYear, endMonth - 1, endDay, endHour, endMinute);

    const newSubtasks: Subtask[] = data.subtasks ? data.subtasks.map((st, index) => {
        return {
          id: taskToEdit?.subtasks[index]?.id || crypto.randomUUID(),
          title: st.title,
          completed: taskToEdit?.subtasks[index]?.completed || false,
        };
    }) : [];

    const task: Task = {
      id: taskToEdit?.id || crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: taskToEdit?.status || 'To Do',
      createdAt: taskToEdit?.createdAt || new Date(),
      startDate,
      endDate,
      subtasks: newSubtasks,
    };
    onSubmit(task);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Chỉnh sửa công việc' : 'Thêm công việc mới'}</DialogTitle>
          <DialogDescription>
            {taskToEdit ? 'Cập nhật chi tiết công việc của bạn.' : 'Điền vào các chi tiết cho công việc mới của bạn. Bạn có thể thêm các công việc để chia nhỏ nó ra.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Bắt đầu</h3>
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

            <div className="space-y-2">
              <h3 className="text-sm font-medium">Kết thúc</h3>
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

            <Separator />
            
            <div>
              <FormLabel>Công việc</FormLabel>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto pr-2">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex items-center gap-2 bg-muted/50 rounded-md p-1 pr-2">
                    <FormField
                      control={form.control}
                      name={`subtasks.${index}.title`}
                      render={({ field }) => (
                        <FormItem className="flex-grow">
                          <FormControl>
                            <Input 
                              placeholder={`Công việc ${index + 1}`} 
                              {...field} 
                              className="border-none bg-transparent shadow-none focus-visible:ring-0" 
                            />
                          </FormControl>
                          <FormMessage className="pl-3" />
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
                Thêm Công việc
              </Button>
            </div>

            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
              <Button type="submit">{taskToEdit ? 'Lưu thay đổi' : 'Tạo công việc'}</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
