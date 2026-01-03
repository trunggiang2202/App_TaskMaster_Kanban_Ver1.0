import { SidebarTrigger } from '@/components/ui/sidebar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

type FilterType = 'all' | 'today';

interface HeaderProps {
  activeFilter: FilterType;
  onFilterChange: (filter: FilterType) => void;
}


export default function Header({ activeFilter, onFilterChange }: HeaderProps) {
  const userAvatar = PlaceHolderImages.find(img => img.id === 'user-avatar');

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b bg-card px-4 md:px-6 sticky top-0 z-10">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="md:hidden" />
        <h1 className="text-xl font-semibold font-headline hidden md:block">Kanban Board</h1>
        <Tabs value={activeFilter} onValueChange={(value) => onFilterChange(value as FilterType)} className="w-[200px]">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="today">Hôm nay</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <Avatar>
        {userAvatar && <AvatarImage src={userAvatar.imageUrl} data-ai-hint={userAvatar.imageHint} />}
        <AvatarFallback>U</AvatarFallback>
      </Avatar>
    </header>
  );
}
