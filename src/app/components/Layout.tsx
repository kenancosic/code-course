import { Outlet, Link, useLocation } from 'react-router';
import { Compass, Swords, Scroll, ScrollText, User, Flame } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useProfile } from '../../hooks/use-profile';
import { Skeleton } from './ui/skeleton';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from './ui/sidebar';

const NAV_ITEMS = [
  { path: '/', icon: Flame, label: 'Tavern (Home)' },
  { path: '/roadmap', icon: Compass, label: 'Questlines (Roadmap)' },
  { path: '/practice', icon: Swords, label: 'Arena (Practice)' },
  { path: '/create', icon: Scroll, label: 'Forge (Create)' },
  { path: '/profile', icon: User, label: 'Character Sheet' },
];

export function Layout() {
  const { data: profile, isLoading } = useProfile();
  const location = useLocation();

  return (
    <SidebarProvider className="bg-background text-foreground font-sans overflow-hidden h-svh min-h-0">
      {/* Sidebar */}
      <Sidebar collapsible="icon" className="border-r border-border bg-sidebar z-20">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10 pointer-events-none mix-blend-overlay"></div>

        <SidebarHeader className="h-20 flex flex-row items-center px-6 border-b border-border shrink-0 gap-3 relative z-10 bg-background/50 backdrop-blur-sm justify-between group-data-[collapsible=icon]:p-2 group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-3 overflow-hidden group-data-[collapsible=icon]:hidden">
            <div className="w-10 h-10 shrink-0 rounded-sm bg-primary/20 flex items-center justify-center border border-primary/50 shadow-[0_0_15px_rgba(196,181,157,0.2)]">
              <ScrollText className="w-6 h-6 text-primary" />
            </div>
            <span className="font-serif font-bold text-xl tracking-widest uppercase text-foreground">
              Mythic<span className="text-primary opacity-80">Code</span>
            </span>
          </div>
          <SidebarTrigger className="shrink-0 text-muted-foreground hover:text-foreground hover:bg-secondary/40" />
        </SidebarHeader>

        <SidebarContent className="py-6 px-4 space-y-2 relative z-10 custom-scrollbar group-data-[collapsible=icon]:px-2">
          <SidebarMenu className="space-y-2">
            {NAV_ITEMS.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    tooltip={item.label}
                    isActive={isActive}
                    className={cn(
                      'w-full flex items-center gap-3 px-4 py-6 h-auto rounded-sm transition-all duration-300 group/nav relative overflow-hidden',
                      isActive
                        ? 'bg-secondary/80 text-primary border border-border shadow-inner'
                        : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40 border border-transparent',
                      'group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:justify-center'
                    )}
                  >
                    <Link to={item.path}>
                      {isActive && (
                        <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary shadow-[0_0_10px_rgba(196,181,157,0.8)]" />
                      )}
                      <item.icon
                        className={cn(
                          'w-5 h-5 shrink-0 transition-transform duration-300 group-hover/nav:scale-110',
                          isActive
                            ? 'text-primary drop-shadow-[0_0_8px_rgba(196,181,157,0.5)]'
                            : 'group-hover/nav:text-foreground'
                        )}
                      />
                      <span className="font-serif font-medium tracking-wide text-sm group-data-[collapsible=icon]:hidden">
                        {item.label}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarContent>

        <SidebarFooter className="p-4 border-t border-border bg-background/30 relative z-10 group-data-[collapsible=icon]:p-2">
          <div className="flex items-center gap-3 bg-card p-3 rounded-sm border border-border shadow-sm group-hover:border-primary/50 transition-colors cursor-pointer group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:shadow-none">
            <div className="w-12 h-12 rounded-sm bg-secondary flex items-center justify-center border-2 border-primary overflow-hidden shadow-inner shrink-0 relative group-data-[collapsible=icon]:w-8 group-data-[collapsible=icon]:h-8 group-data-[collapsible=icon]:border">
              {isLoading ? (
                <Skeleton className="w-full h-full" />
              ) : (
                <img
                  src={
                    profile?.avatar_seed
                      ? `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile.avatar_seed}`
                      : `https://api.dicebear.com/7.x/adventurer/svg?seed=${profile?.display_name || 'Felix'}`
                  }
                  alt="Avatar"
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
              )}
              <div className="absolute inset-0 ring-1 ring-inset ring-black/10"></div>
            </div>
            <div className="flex-1 min-w-0 flex flex-col justify-center group-data-[collapsible=icon]:hidden">
              {isLoading ? (
                <>
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </>
              ) : (
                <>
                  <p className="text-sm font-serif font-bold text-foreground truncate tracking-wide">
                    {profile?.display_name || 'Sir Codealot'}
                  </p>
                  <p className="text-xs font-serif italic text-primary truncate">
                    Lvl {profile?.level || 1} {profile?.title || 'Novice Coder'}
                  </p>
                </>
              )}
            </div>
          </div>
        </SidebarFooter>
      </Sidebar>

      {/* Main Content */}
      <SidebarInset className="relative flex flex-1 min-h-0 flex-col overflow-hidden bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] bg-repeat custom-scrollbar bg-background">
        {/* Subtle background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-secondary/30 blur-[150px] rounded-full pointer-events-none" />

        <div className="z-10 mx-auto flex w-full max-w-[1600px] flex-1 min-h-0 flex-col overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-10">
          <Outlet />
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
