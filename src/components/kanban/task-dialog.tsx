
'use client';

import { useEffect, useRef, useState } from 'react';
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
import { Plus, Trash2, Paperclip, X } from 'lucide-react';
import type { Task, Subtask, Attachment } from '@/lib/types';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import Image from 'next/image';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


const attachmentSchema = z.object({
  name: z.string(),
  url: z.string(),
  type: z.enum(['image', 'file']).optional(),
});

const subtaskSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  startDate: z.string().optional(),
  startTime: z.string().optional(),
  startPeriod: z.enum(['AM', 'PM']).optional(),
  endDate: z.string().optional(),
  endTime: z.string().optional(),
  endPeriod: z.enum(['AM', 'PM']).optional(),
  attachments: z.array(attachmentSchema).optional(),
});

const convertTo24Hour = (time: string, period: 'AM' | 'PM') => {
    let [hours, minutes] = time.split(':').map(Number);
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const parseDateTime = (dateStr: string, timeStr: string, period: 'AM' | 'PM') => {
    try {
        const time24 = convertTo24Hour(timeStr, period);
        const [day, month, year] = dateStr.split('-').map(Number);
        const [hour, minute] = time24.split(':').map(Number);
        return new Date(year, month - 1, day, hour, minute);
    } catch {
        return null;
    }
};

const taskSchema = z.object({
  title: z.string().min(3, 'Nhiệm vụ phải có ít nhất 3 ký tự.'),
  description: z.string().optional(),
  startDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  startTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  startPeriod: z.enum(['AM', 'PM']),
  endDate: z.string().regex(/^\d{2}-\d{2}-\d{4}$/, "Định dạng ngày phải là DD-MM-YYYY"),
  endTime: z.string().regex(/^\d{1,2}:\d{2}$/, "Định dạng giờ phải là HH:MM"),
  endPeriod: z.enum(['AM', 'PM']),
  subtasks: z.array(subtaskSchema).optional(),
}).refine(data => {
    const startDateTime = parseDateTime(data.startDate, data.startTime, data.startPeriod);
    const endDateTime = parseDateTime(data.endDate, data.endTime, data.endPeriod);
    return endDateTime && startDateTime && endDateTime > startDateTime;
}, {
    message: "Thời gian kết thúc phải sau thời gian bắt đầu.",
    path: ["endDate"],
}).refine(data => {
  if (data.subtasks) {
    for (const subtask of data.subtasks) {
      if (subtask.title && subtask.title.trim() !== '') {
        if (!subtask.startDate || !subtask.startTime || !subtask.startPeriod || !subtask.endDate || !subtask.endTime || !subtask.endPeriod) {
          return false; // Invalid if a subtask with a title is missing any deadline field
        }
        const startSubtaskTime = parseDateTime(subtask.startDate, subtask.startTime, subtask.startPeriod);
        const endSubtaskTime = parseDateTime(subtask.endDate, subtask.endTime, subtask.endPeriod);
        if (!startSubtaskTime || !endSubtaskTime || endSubtaskTime <= startSubtaskTime) {
            return false; // Subtask end time must be after start time
        }
      }
    }
  }
  return true;
}, {
  message: "Công việc con có tiêu đề phải có deadline hợp lệ (ngày/giờ/AM-PM bắt đầu và kết thúc, và thời gian kết thúc phải sau thời gian bắt đầu).",
  path: ["subtasks"],
}).refine(data => {
    const taskStartDateTime = parseDateTime(data.startDate, data.startTime, data.startPeriod);
    const taskEndDateTime = parseDateTime(data.endDate, data.endTime, data.endPeriod);

    if (!taskStartDateTime || !taskEndDateTime || !data.subtasks) {
        return true; // Cannot validate if parent dates are invalid or no subtasks
    }

    for (const subtask of data.subtasks) {
        if (subtask.title && subtask.title.trim() !== '' && subtask.startDate && subtask.startTime && subtask.startPeriod && subtask.endDate && subtask.endTime && subtask.endPeriod) {
            const subtaskStartDateTime = parseDateTime(subtask.startDate, subtask.startTime, subtask.startPeriod);
            const subtaskEndDateTime = parseDateTime(subtask.endDate, subtask.endTime, subtask.endPeriod);

            if (!subtaskStartDateTime || !subtaskEndDateTime) {
                continue; // Already handled by previous refine
            }

            if (subtaskStartDateTime < taskStartDateTime || subtaskEndDateTime > taskEndDateTime) {
                return false; // Subtask deadline is outside parent task's deadline
            }
        }
    }
    return true;
}, {
    message: "Deadline của công việc con phải nằm trong khoảng thời gian của nhiệm vụ cha.",
    path: ["subtasks"],
}).refine(data => {
    const hasAtLeastOneSubtask = data.subtasks && data.subtasks.filter(st => st.title && st.title.trim() !== '').length > 0;
    return hasAtLeastOneSubtask;
}, {
    message: "Nhiệm vụ phải có ít nhất một công việc.",
    path: ["subtasks"],
});

type TaskFormData = z.infer<typeof taskSchema>;

interface TaskDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (task: Task) => void;
  taskToEdit?: Task;
}

export function TaskDialog({ isOpen, onOpenChange, onSubmit, taskToEdit }: TaskDialogProps) {
  const subtaskAttachmentRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [activeTab, setActiveTab] = useState('task');

  const convertTo12Hour = (date: Date) => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return {
      time: `${hours12}:${String(minutes).padStart(2, '0')}`,
      period: ampm as 'AM' | 'PM'
    };
  };

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: '',
      description: '',
      startDate: '',
      endDate: '',
      startTime: '09:00',
      startPeriod: 'AM',
      endTime: '05:00',
      endPeriod: 'PM',
      subtasks: [],
    },
    mode: 'onChange', // Validate on change to disable/enable button
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "subtasks",
  });
  
  useEffect(() => {
    if (isOpen) {
      setActiveTab('task'); // Reset to the first tab whenever the dialog opens
      if (taskToEdit) {
        const start = convertTo12Hour(taskToEdit.startDate);
        const end = convertTo12Hour(taskToEdit.endDate);
        form.reset({
          title: taskToEdit.title,
          description: taskToEdit.description || '',
          startDate: format(taskToEdit.startDate, 'dd-MM-yyyy'),
          startTime: start.time,
          startPeriod: start.period,
          endDate: format(taskToEdit.endDate, 'dd-MM-yyyy'),
          endTime: end.time,
          endPeriod: end.period,
          subtasks: taskToEdit.subtasks.map(st => {
            const subStart = st.startDate ? convertTo12Hour(st.startDate) : { time: '', period: 'AM' as const };
            const subEnd = st.endDate ? convertTo12Hour(st.endDate) : { time: '', period: 'PM' as const };
            return {
              title: st.title,
              description: st.description || '',
              startDate: st.startDate ? format(st.startDate, 'dd-MM-yyyy') : '',
              startTime: subStart.time,
              startPeriod: subStart.period,
              endDate: st.endDate ? format(st.endDate, 'dd-MM-yyyy') : '',
              endTime: subEnd.time,
              endPeriod: subEnd.period,
              attachments: st.attachments || [],
            };
          }),
        });
      } else {
        form.reset({
          title: '',
          description: '',
          startDate: '',
          endDate: '',
          startTime: '09:00',
          startPeriod: 'AM',
          endTime: '05:00',
          endPeriod: 'PM',
          subtasks: [{ title: "", description: "", startDate: '', startTime: '09:00', startPeriod: 'AM', endDate: '', endTime: '05:00', endPeriod: 'PM', attachments: [] }],
        });
      }
    }
  }, [taskToEdit, form, isOpen]);

  const parseDate = (dateStr?: string, timeStr?: string, period?: 'AM' | 'PM'): Date | undefined => {
    if (!dateStr || !timeStr || !period) return undefined;
    const dt = parseDateTime(dateStr, timeStr, period);
    return dt ?? undefined;
  };

  function handleSubmit(data: TaskFormData) {
    const taskStartDate = parseDate(data.startDate, data.startTime, data.startPeriod);
    const taskEndDate = parseDate(data.endDate, data.endTime, data.endPeriod);

    if (!taskStartDate || !taskEndDate) return;


    const newSubtasks: Subtask[] = data.subtasks ? data.subtasks
      .filter(st => st.title && st.title.trim() !== '') // Only include subtasks with a title
      .map((st, index) => {
        const subtaskStartDate = parseDate(st.startDate, st.startTime, st.startPeriod);
        const subtaskEndDate = parseDate(st.endDate, st.endTime, st.endPeriod);
        return {
          id: taskToEdit?.subtasks[index]?.id || crypto.randomUUID(),
          title: st.title,
          description: st.description,
          completed: taskToEdit?.subtasks[index]?.completed || false,
          startDate: subtaskStartDate,
          endDate: subtaskEndDate,
          attachments: st.attachments,
        };
    }) : [];

    const task: Task = {
      id: taskToEdit?.id || crypto.randomUUID(),
      title: data.title,
      description: data.description,
      status: taskToEdit?.status || 'To Do',
      createdAt: taskToEdit?.createdAt || new Date(),
      startDate: taskStartDate,
      endDate: taskEndDate,
      subtasks: newSubtasks,
    };
    onSubmit(task);
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, field: any, index: number) => {
      const file = e.target.files?.[0];
      if (file) {
          const isImage = file.type.startsWith('image/');
          if (isImage) {
            const reader = new FileReader();
            reader.onload = (readEvent) => {
                const newAttachment = { name: file.name, url: readEvent.target?.result as string, type: 'image' as const };
                const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
                form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment]);
            };
            reader.readAsDataURL(file);
          } else {
            const newAttachment = { name: file.name, url: URL.createObjectURL(file), type: 'file' as const };
            const currentAttachments = form.getValues(`subtasks.${index}.attachments`) || [];
            form.setValue(`subtasks.${index}.attachments`, [...currentAttachments, newAttachment]);
          }
      }
  };

  const triggerValidation = async () => {
    const result = await form.trigger(["title", "description", "startDate", "startTime", "startPeriod", "endDate", "endTime", "endPeriod"]);
    if (result) {
        setActiveTab('subtasks');
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        form.clearErrors();
      }
      onOpenChange(open);
    }}>
      <DialogContent className="sm:max-w-[625px] flex flex-col max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{taskToEdit ? 'Chỉnh sửa nhiệm vụ' : 'Thêm nhiệm vụ mới'}</DialogTitle>
          <DialogDescription>
            {taskToEdit ? 'Cập nhật chi tiết nhiệm vụ của bạn.' : 'Điền vào các chi tiết cho nhiệm vụ mới của bạn. Bạn có thể thêm các công việc để chia nhỏ nó ra.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 flex flex-col min-h-0">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="task">Nhiệm vụ</TabsTrigger>
                <TabsTrigger value="subtasks">Công việc</TabsTrigger>
              </TabsList>
              
              <TabsContent value="task" className="flex-1 flex flex-col min-h-0 space-y-4 pt-4">
                  <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-2 custom-scrollbar space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tên nhiệm vụ</FormLabel>
                          <FormControl>
                            <Input placeholder="Tên nhiệm vụ" {...field} className="bg-primary/5"/>
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
                            <Textarea placeholder="Thêm chi tiết về nhiệm vụ..." {...field} className="bg-primary/5"/>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="space-y-2">
                      <FormLabel>Bắt đầu</FormLabel>
                      <div className="border p-3 rounded-md">
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                            <FormField
                              control={form.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                  <FormControl>
                                      <Input placeholder="31-12-2024" {...field} className="bg-primary/5"/>
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
                                  <FormLabel>Giờ</FormLabel>
                                  <FormControl>
                                      <Input placeholder="09:00" {...field} className="w-24 bg-primary/5"/>
                                    </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                                control={form.control}
                                name="startPeriod"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                        value={field.value}
                                      >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="AM" />
                                          </FormControl>
                                          <FormLabel className="font-normal">AM</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="PM" />
                                          </FormControl>
                                          <FormLabel className="font-normal">PM</FormLabel>
                                        </FormItem>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                          </div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <FormLabel>Kết thúc</FormLabel>
                      <div className="border p-3 rounded-md">
                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                            <FormField
                              control={form.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ngày (DD-MM-YYYY)</FormLabel>
                                  <FormControl>
                                      <Input placeholder="31-12-2024" {...field} className="bg-primary/5"/>
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
                                  <FormLabel>Giờ</FormLabel>
                                  <FormControl>
                                      <Input placeholder="05:00" {...field} className="w-24 bg-primary/5"/>
                                    </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                                control={form.control}
                                name="endPeriod"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormControl>
                                      <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex flex-col space-y-1"
                                        value={field.value}
                                      >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="AM" />
                                          </FormControl>
                                          <FormLabel className="font-normal">AM</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                          <FormControl>
                                            <RadioGroupItem value="PM" />
                                          </FormControl>
                                          <FormLabel className="font-normal">PM</FormLabel>
                                        </FormItem>
                                      </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                          </div>
                      </div>
                    </div>
                  </div>
                  <DialogFooter className="pt-4 mt-auto">
                    <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Hủy</Button>
                    <Button type="button" onClick={triggerValidation}>Tiếp tục</Button>
                  </DialogFooter>
              </TabsContent>

              <TabsContent value="subtasks" className="flex-1 flex flex-col min-h-0 space-y-4 pt-4">
                <div className="flex-1 overflow-y-auto pr-6 -mr-6 py-2 custom-scrollbar space-y-4">
                  <div className="space-y-2">
                      <Accordion type="multiple" className="w-full space-y-2">
                        {fields.map((field, index) => {
                            const subtaskAttachments = form.watch(`subtasks.${index}.attachments`) || [];
                            return (
                              <AccordionItem value={`item-${index}`} key={field.id} className="bg-muted/50 rounded-md border-b-0">
                                  <div className="flex items-center w-full p-1 pr-2">
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
                                      <AccordionTrigger className="p-2 hover:no-underline [&[data-state=open]>svg]:rotate-180">
                                      </AccordionTrigger>
                                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-8 w-8">
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                      </Button>
                                  </div>
                                  <AccordionContent className="px-3 pb-3">
                                    <div className="space-y-4 p-4 rounded-md border bg-background">
                                      <FormField
                                        control={form.control}
                                        name={`subtasks.${index}.description`}
                                        render={({ field }) => (
                                          <FormItem>
                                            <h4 className="text-xs font-medium text-muted-foreground">Mô tả (Tùy chọn)</h4>
                                            <FormControl>
                                              <Textarea placeholder="Thêm chi tiết cho công việc..." {...field} className="bg-primary/5" />
                                            </FormControl>
                                            <FormMessage />
                                          </FormItem>
                                        )}
                                      />
                                      <FormField
                                          control={form.control}
                                          name={`subtasks.${index}.attachments`}
                                          render={({ field: subtaskField }) => (
                                              <FormItem>
                                                  <Button type="button" variant="outline" size="sm" onClick={() => subtaskAttachmentRefs.current[index]?.click()}>
                                                      <Paperclip className="mr-2 h-4 w-4" />
                                                      Đính kèm tệp
                                                  </Button>
                                                  <FormControl>
                                                      <Input
                                                          type="file"
                                                          className="hidden"
                                                          ref={(el) => { subtaskAttachmentRefs.current[index] = el; }}
                                                          onChange={(e) => handleFileChange(e, subtaskField, index)}
                                                      />
                                                  </FormControl>
                                                  <div className="mt-2 grid grid-cols-3 gap-2">
                                                      {subtaskAttachments.map((attachment, attachmentIndex) => (
                                                          <div key={attachmentIndex} className="relative group">
                                                            {attachment.type === 'image' ? (
                                                              <Image src={attachment.url} alt={attachment.name} width={100} height={100} className="w-full h-24 object-cover rounded-md" />
                                                            ) : (
                                                              <div className="w-full h-24 bg-muted rounded-md flex items-center justify-center p-2">
                                                                <p className="text-xs text-center text-muted-foreground truncate">{attachment.name}</p>
                                                              </div>
                                                            )}
                                                            <Button 
                                                                type="button" 
                                                                variant="destructive" 
                                                                size="icon" 
                                                                className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity" 
                                                                onClick={() => {
                                                                    const current = form.getValues(`subtasks.${index}.attachments`) || [];
                                                                    form.setValue(`subtasks.${index}.attachments`, current.filter((_, i) => i !== attachmentIndex));
                                                                }}>
                                                                <X className="h-4 w-4" />
                                                            </Button>
                                                          </div>
                                                      ))}
                                                  </div>
                                                  <FormMessage />
                                              </FormItem>
                                          )}
                                      />
                                      <div className="space-y-2">
                                          <h4 className="text-xs font-medium text-muted-foreground">Bắt đầu</h4>
                                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.startDate`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input placeholder="DD-MM-YYYY" {...field} className="bg-primary/5" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.startTime`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input placeholder="HH:MM" {...field} className="w-24 bg-primary/5" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.startPeriod`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                      <RadioGroup
                                                      onValueChange={field.onChange}
                                                      defaultValue={field.value}
                                                      className="flex flex-col space-y-1"
                                                      value={field.value}
                                                      >
                                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                                          <FormControl>
                                                          <RadioGroupItem value="AM" />
                                                          </FormControl>
                                                          <FormLabel className="font-normal">AM</FormLabel>
                                                      </FormItem>
                                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                                          <FormControl>
                                                          <RadioGroupItem value="PM" />
                                                          </FormControl>
                                                          <FormLabel className="font-normal">PM</FormLabel>
                                                      </FormItem>
                                                      </RadioGroup>
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                        </div>
                                        <div className="space-y-2">
                                          <h4 className="text-xs font-medium text-muted-foreground">Kết thúc</h4>
                                          <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-end">
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.endDate`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input placeholder="DD-MM-YYYY" {...field} className="bg-primary/5" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.endTime`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                    <Input placeholder="HH:MM" {...field} className="w-24 bg-primary/5" />
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                            <FormField
                                              control={form.control}
                                              name={`subtasks.${index}.endPeriod`}
                                              render={({ field }) => (
                                                <FormItem>
                                                  <FormControl>
                                                      <RadioGroup
                                                      onValueChange={field.onChange}
                                                      defaultValue={field.value}
                                                      className="flex flex-col space-y-1"
                                                      value={field.value}
                                                      >
                                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                                          <FormControl>
                                                          <RadioGroupItem value="AM" />
                                                          </FormControl>
                                                          <FormLabel className="font-normal">AM</FormLabel>
                                                      </FormItem>
                                                      <FormItem className="flex items-center space-x-2 space-y-0">
                                                          <FormControl>
                                                          <RadioGroupItem value="PM" />
                                                          </FormControl>
                                                          <FormLabel className="font-normal">PM</FormLabel>
                                                      </FormItem>
                                                      </RadioGroup>
                                                  </FormControl>
                                                  <FormMessage />
                                                </FormItem>
                                              )}
                                            />
                                          </div>
                                        </div>
                                    </div>
                                  </AccordionContent>
                                </AccordionItem>
                            )
                          })}
                      </Accordion>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2"
                      onClick={() => append({ title: "", description: "", startDate: '', startTime: '09:00', startPeriod: 'AM', endDate: '', endTime: '05:00', endPeriod: 'PM', attachments: [] })}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Thêm Công việc
                    </Button>
                  </div>
                  {form.formState.errors.subtasks && <FormMessage>{form.formState.errors.subtasks.message}</FormMessage>}
                </div>

                <DialogFooter className="pt-4 mt-auto">
                   <Button type="button" variant="outline" onClick={() => setActiveTab('task')}>Quay lại</Button>
                   <Button type="submit" disabled={!form.formState.isValid}>{taskToEdit ? 'Lưu thay đổi' : 'Tạo nhiệm vụ'}</Button>
                </DialogFooter>
              </TabsContent>
            </Tabs>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

    