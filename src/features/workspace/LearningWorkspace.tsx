import { ReactNode, useState } from 'react';
import { Menu } from 'lucide-react';
import { useIsMobile } from '../../app/components/ui/use-mobile';
import { Button } from '../../app/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '../../app/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../app/components/ui/tabs';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../../app/components/ui/resizable';
import { ScrollArea } from '../../app/components/ui/scroll-area';
import { cn } from '../../lib/utils';

interface WorkspaceHeaderProps {
  title: string;
  subtitle?: string;
  meta?: ReactNode;
  actions?: ReactNode;
}

interface LearningWorkspaceProps {
  header: WorkspaceHeaderProps;
  railTitle: string;
  railDescription?: string;
  rail: ReactNode;
  instructionTitle: string;
  instructionMeta?: ReactNode;
  instruction: ReactNode;
  workspaceTitle: string;
  workspaceMeta?: ReactNode;
  workspace: ReactNode;
  footer?: ReactNode;
  className?: string;
}

function WorkspaceHeader({ title, subtitle, meta, actions }: WorkspaceHeaderProps) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-card/50 px-5 py-4 shadow-[0_0_50px_rgba(0,0,0,0.18)] backdrop-blur-md lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h1 className="text-3xl font-serif font-bold tracking-tight text-foreground">{title}</h1>
        {subtitle ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
        {meta ? <div className="mt-3 flex flex-wrap gap-2">{meta}</div> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

function PanelLabel({
  title,
  meta,
}: {
  title: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
      <div className="min-w-0">
        <div className="text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          {title}
        </div>
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </div>
  );
}

export function LearningWorkspace({
  header,
  railTitle,
  railDescription,
  rail,
  instructionTitle,
  instructionMeta,
  instruction,
  workspaceTitle,
  workspaceMeta,
  workspace,
  footer,
  className,
}: LearningWorkspaceProps) {
  const isMobile = useIsMobile();
  const [railOpen, setRailOpen] = useState(false);

  return (
    <div className={cn('flex h-full min-h-0 flex-col gap-4 overflow-hidden', className)}>
      <WorkspaceHeader {...header} />

      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-border/70 bg-card/35 shadow-[0_0_100px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3 border-b border-border/70 px-4 py-3">
            <div className="min-w-0">
              <div className="text-sm font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                {instructionTitle}
              </div>
              <p className="truncate text-xs text-muted-foreground/70">{workspaceTitle}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setRailOpen(true)} className="shrink-0">
              <Menu className="mr-2 h-4 w-4" />
              Rail
            </Button>
          </div>

          <Tabs defaultValue="instruction" className="flex min-h-0 flex-1 flex-col overflow-hidden p-3">
            <TabsList className="w-full">
              <TabsTrigger value="instruction">Briefing</TabsTrigger>
              <TabsTrigger value="workspace">Workspace</TabsTrigger>
            </TabsList>
            <TabsContent value="instruction" className="mt-3 min-h-0 overflow-hidden">
              <ScrollArea className="h-full min-h-[18rem] rounded-2xl border border-border/70 bg-background/35">
                <div className="p-4">
                  {instructionMeta ? <div className="mb-4 flex flex-wrap gap-2">{instructionMeta}</div> : null}
                  {instruction}
                </div>
              </ScrollArea>
            </TabsContent>
            <TabsContent value="workspace" className="mt-3 min-h-0 overflow-hidden">
              <div className="flex h-full min-h-[24rem] flex-col overflow-hidden rounded-2xl border border-border/70 bg-background/35">
                <PanelLabel title={workspaceTitle} meta={workspaceMeta} />
                <div className="min-h-0 flex-1 overflow-hidden">{workspace}</div>
              </div>
            </TabsContent>
          </Tabs>

          {footer ? <div className="border-t border-border/70 p-3">{footer}</div> : null}

          <Sheet open={railOpen} onOpenChange={setRailOpen}>
            <SheetContent side="left" className="w-[min(88vw,24rem)]">
              <SheetHeader>
                <SheetTitle>{railTitle}</SheetTitle>
                {railDescription ? <SheetDescription>{railDescription}</SheetDescription> : null}
              </SheetHeader>
              <ScrollArea className="min-h-0 flex-1 pr-2">{rail}</ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-border/70 bg-card/35 shadow-[0_0_100px_rgba(0,0,0,0.22)] backdrop-blur-xl">
          <ResizablePanelGroup direction="horizontal" className="min-h-0">
            <ResizablePanel defaultSize={24} minSize={18} maxSize={32} className="min-h-0 overflow-hidden">
              <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border/70">
                <PanelLabel title={railTitle} />
                {railDescription ? (
                  <p className="border-b border-border/70 px-4 py-3 text-sm text-muted-foreground">
                    {railDescription}
                  </p>
                ) : null}
                <ScrollArea className="min-h-0 flex-1 pr-2">{rail}</ScrollArea>
              </div>
            </ResizablePanel>

            <ResizableHandle withHandle />

            <ResizablePanel defaultSize={76} minSize={48} className="min-h-0 overflow-hidden">
              <ResizablePanelGroup direction="horizontal" className="min-h-0">
                <ResizablePanel defaultSize={48} minSize={34} className="min-h-0 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-col overflow-hidden border-r border-border/70">
                    <PanelLabel title={instructionTitle} meta={instructionMeta} />
                    <ScrollArea className="min-h-0 flex-1 pr-2">
                      <div className="p-4">{instruction}</div>
                    </ScrollArea>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={52} minSize={38} className="min-h-0 overflow-hidden">
                  <div className="flex h-full min-h-0 flex-col overflow-hidden">
                    <PanelLabel title={workspaceTitle} meta={workspaceMeta} />
                    <div className="min-h-0 flex-1 overflow-hidden">{workspace}</div>
                    {footer ? <div className="border-t border-border/70 p-3">{footer}</div> : null}
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      )}
    </div>
  );
}

export type { WorkspaceHeaderProps };

