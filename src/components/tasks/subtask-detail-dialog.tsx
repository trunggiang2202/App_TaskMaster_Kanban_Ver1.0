
'use client';

import * as React from 'react';
import type { Subtask, Attachment } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Paperclip, Download } from 'lucide-react';
import Image from 'next/image';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const AttachmentItem: React.FC<{ attachment: Attachment }> = ({ attachment }) => {
    const [isZoomed, setIsZoomed] = React.useState(false);

    if (attachment.type === 'image') {
        if (isZoomed) {
            return (
                <div 
                    className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 cursor-zoom-out"
                    onClick={() => setIsZoomed(false)}
                >
                    <Image src={attachment.url} alt={attachment.name} width={1200} height={900} className="max-w-[90vw] max-h-[90vh] object-contain" />
                </div>
            );
        }

        return (
            <div 
                className="relative cursor-zoom-in w-full h-20"
                onClick={() => setIsZoomed(true)}
            >
                <Image src={attachment.url} alt={attachment.name} fill className="object-cover rounded-md" />
            </div>
        );
    }
    
    return (
      <a 
        href={attachment.url} 
        target="_blank" 
        rel="noopener noreferrer" 
        download={attachment.name}
        className="flex items-center gap-2 p-2 rounded-md bg-muted/50 hover:bg-muted/80 transition-colors text-sm"
      >
        <Paperclip className="h-4 w-4 text-muted-foreground" />
        <span className="flex-1 truncate text-foreground">{attachment.name}</span>
        <Download className="h-4 w-4 text-muted-foreground" />
      </a>
    );
};

interface SubtaskDetailDialogProps {
  subtask: Subtask | null;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SubtaskDetailDialog({ subtask, isOpen, onOpenChange }: SubtaskDetailDialogProps) {
  if (!subtask) {
    return null;
  }
  
  const attachments = subtask.attachments || [];
  const imageAttachments = attachments.filter(att => att.type === 'image');
  const fileAttachments = attachments.filter(att => att.type !== 'image');

  const defaultTab = imageAttachments.length > 0 ? "images" : fileAttachments.length > 0 ? "files" : "images";

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>{subtask.title}</DialogTitle>
          <DialogDescription>
            Chi tiết cho công việc.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Mô tả</h3>
                <div className="p-3 rounded-md border bg-primary/10 min-h-[60px]">
                    <p className="text-sm text-foreground leading-relaxed">
                        {subtask.description || <span className="text-muted-foreground">Không có mô tả.</span>}
                    </p>
                </div>
            </div>

            <div className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">Tệp đính kèm</h3>
                 <div className="p-3 rounded-md border bg-primary/10 min-h-[120px]">
                    {attachments.length > 0 ? (
                        <Tabs defaultValue={defaultTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="images" disabled={imageAttachments.length === 0}>
                                    Ảnh ({imageAttachments.length})
                                </TabsTrigger>
                                <TabsTrigger value="files" disabled={fileAttachments.length === 0}>
                                    Tệp ({fileAttachments.length})
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="images">
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 pt-4">
                                    {imageAttachments.map((att, index) => <AttachmentItem key={`img-${index}`} attachment={att} />)}
                                </div>
                            </TabsContent>
                            <TabsContent value="files">
                                <div className="space-y-2 pt-4">
                                    {fileAttachments.map((att, index) => <AttachmentItem key={`file-${index}`} attachment={att} />)}
                                </div>
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <div className="flex items-center justify-center h-full pt-4">
                          <p className="text-sm text-muted-foreground">Không có tệp đính kèm.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
