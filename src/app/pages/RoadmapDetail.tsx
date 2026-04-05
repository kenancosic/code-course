import { useParams, Link, useNavigate } from 'react-router';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Loader2,
  Sparkles,
  Play,
  Trophy,
  ChevronRight,
  Scroll,
  Target,
  Star,
  Flame,
  GraduationCap,
  Shield,
  ScrollText,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../../lib/utils';
import React, { useState, useMemo, useEffect } from 'react';
import {
  useRoadmap,
  RoadmapNode,
  useCourses,
  generateCourseStream,
  Course,
  useTopic,
} from '../../hooks';
import { Checkbox } from '../components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '../components/ui/sheet';

// Node status types
type NodeStatus = 'recommended' | 'available' | 'in-progress' | 'completed';

interface NodeWithStatus extends RoadmapNode {
  status: NodeStatus;
  progress: number;
  course?: Course;
  prerequisites: number[];
}

function getCourseCompletionPercentage(course: Course | null | undefined): number {
  return course?.user_progress?.completion_percentage ?? 0;
}

function isCourseCompleted(course: Course | null | undefined): boolean {
  return getCourseCompletionPercentage(course) >= 100;
}

function isCourseStarted(course: Course | null | undefined): boolean {
  return getCourseCompletionPercentage(course) > 0;
}

function getCourseRecencyScore(course: Course): number {
  const createdAt = course.created_at ? Date.parse(course.created_at) : 0;
  return Number.isNaN(createdAt) ? 0 : createdAt;
}

function selectPrimaryCourseForTopic(courses: Course[] | undefined, topicId: number): Course | null {
  const topicCourses = (courses ?? []).filter((course) => course.topic_id === topicId);
  if (topicCourses.length === 0) return null;

  const newestFirst = (left: Course, right: Course) =>
    getCourseRecencyScore(right) - getCourseRecencyScore(left) || right.id - left.id;

  const completedCourse = topicCourses.filter(isCourseCompleted).sort(newestFirst)[0];
  if (completedCourse) return completedCourse;

  const startedCourse = topicCourses.filter(isCourseStarted).sort(newestFirst)[0];
  if (startedCourse) return startedCourse;

  const generatingCourse = topicCourses.filter((course) => course.status === 'generating').sort(newestFirst)[0];
  if (generatingCourse) return generatingCourse;

  const readyZeroProgressCourse = topicCourses
    .filter((course) => course.status === 'ready' && !isCourseStarted(course))
    .sort(newestFirst)[0];
  if (readyZeroProgressCourse) return readyZeroProgressCourse;

  return null;
}

function getCourseActionLabel(course: Course | null | undefined): string {
  if (!course) return 'Generate Course';
  if (isCourseCompleted(course)) return 'Review Course';
  if (course.status === 'generating' || isCourseStarted(course)) return 'Continue Course';
  return 'Start Course';
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return 'from-stone-500 to-stone-600';
    case 2:
      return 'from-emerald-500 to-emerald-600';
    case 3:
      return 'from-blue-500 to-blue-600';
    case 4:
      return 'from-purple-500 to-purple-600';
    case 5:
      return 'from-amber-500 to-amber-600';
    default:
      return 'from-rose-500 to-rose-600';
  }
}

function getTierGlow(tier: number): string {
  switch (tier) {
    case 1:
      return 'shadow-stone-500/30';
    case 2:
      return 'shadow-emerald-500/30';
    case 3:
      return 'shadow-blue-500/30';
    case 4:
      return 'shadow-purple-500/30';
    case 5:
      return 'shadow-amber-500/30';
    default:
      return 'shadow-rose-500/30';
  }
}

function getStatusIcon(status: NodeStatus) {
  switch (status) {
    case 'completed':
      return CheckCircle2;
    case 'in-progress':
      return Play;
    case 'available':
      return Circle;
    case 'recommended':
      return Shield;
  }
}

function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case 'completed':
      return 'text-emerald-400 border-emerald-500/50 bg-emerald-500/10';
    case 'in-progress':
      return 'text-amber-400 border-amber-500/50 bg-amber-500/10';
    case 'available':
      return 'text-blue-400 border-blue-500/50 bg-blue-500/10';
    case 'recommended':
      return 'text-violet-200 border-violet-500/40 bg-violet-500/10';
  }
}

function getStatusGlow(status: NodeStatus): string {
  switch (status) {
    case 'completed':
      return 'shadow-emerald-500/20';
    case 'in-progress':
      return 'shadow-amber-500/20';
    case 'available':
      return 'shadow-blue-500/20';
    case 'recommended':
      return 'shadow-violet-500/20';
  }
}

export function RoadmapDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data: roadmap, isLoading: roadmapLoading, error } = useRoadmap(pathId || '');
  const { data: courses } = useCourses();
  const [selectedNode, setSelectedNode] = useState<NodeWithStatus | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState('');
  const [generationLessons, setGenerationLessons] = useState<string[]>([]);

  // Subtopic selection state
  const [isSubtopicSheetOpen, setIsSubtopicSheetOpen] = useState(false);
  const [selectedSubtopics, setSelectedSubtopics] = useState<Set<number>>(new Set());
  const { data: topicDetails, isLoading: topicLoading } = useTopic(selectedNode?.topic_id ?? null);

  // Build connection map for prerequisites
  const connectionMap = useMemo(() => {
    const map = new Map<number, number[]>();
    if (roadmap?.connections) {
      for (const conn of roadmap.connections) {
        if (!map.has(conn.to_node_id)) {
          map.set(conn.to_node_id, []);
        }
        map.get(conn.to_node_id)!.push(conn.from_node_id);
      }
    }
    return map;
  }, [roadmap]);

  // Compute node statuses
  const nodesWithStatus = useMemo((): NodeWithStatus[] => {
    if (!roadmap?.nodes) return [];

    return roadmap.nodes.map((node) => {
      const course = selectPrimaryCourseForTopic(courses, node.topic_id);
      const prerequisites = connectionMap.get(node.id) || [];
      const completionPercentage = getCourseCompletionPercentage(course);

      // Determine status based on roadmap availability and course lifecycle
      let status: NodeStatus = node.status === 'locked' ? 'recommended' : 'available';
      let nodeProgress = completionPercentage;

      if (node.status === 'completed' || completionPercentage >= 100) {
        status = 'completed';
        nodeProgress = 100;
      } else if (course) {
        if (course.status === 'generating' || completionPercentage > 0) {
          status = 'in-progress';
          nodeProgress = completionPercentage;
        } else {
          status = node.status === 'locked' ? 'recommended' : 'available';
        }
      }

      return {
        ...node,
        status,
        progress: nodeProgress,
        course: course ?? undefined,
        prerequisites,
      };
    });
  }, [roadmap, courses, connectionMap]);

  // Auto-select first available node if none selected
  const hasInitialized = React.useRef(false);
  useEffect(() => {
    if (nodesWithStatus.length > 0 && !hasInitialized.current) {
      const availableNode = nodesWithStatus.find(
        (n) => n.status === 'available' || n.status === 'in-progress' || n.status === 'recommended'
      );
      if (availableNode) {
        // Defer state updates to avoid cascading renders
        queueMicrotask(() => {
          setSelectedNode(availableNode);
          // Only open panel by default on larger screens
          if (window.innerWidth >= 1024) {
            setIsPanelOpen(true);
          }
        });
        hasInitialized.current = true;
      }
    }
  }, [nodesWithStatus]);

  // Group nodes by tier for flex layout
  const nodesByTier = useMemo(() => {
    const tiers = new Map<number, NodeWithStatus[]>();
    for (const node of nodesWithStatus) {
      const t = node.tier ?? 1;
      if (!tiers.has(t)) tiers.set(t, []);
      tiers.get(t)!.push(node);
    }
    return new Map([...tiers.entries()].sort((a, b) => a[0] - b[0]));
  }, [nodesWithStatus]);

  const handleGenerateCourse = () => {
    if (!selectedNode) return;

    // If topic has subtopics, open the subtopic selection sheet
    if (topicDetails && topicDetails.subtopics && topicDetails.subtopics.length > 0) {
      setIsSubtopicSheetOpen(true);
      return;
    }

    // Otherwise generate directly with just the main topic
    generateCourseWithTopics([selectedNode.topic_id]);
  };

  const generateCourseWithTopics = (topicIds: number[]) => {
    setIsGenerating(true);
    setGenerationStatus('Initiating course generation...');
    setGenerationLessons([]);

    generateCourseStream(topicIds, {
      onStatus: (data) => {
        setGenerationStatus((data.message as string) || 'Processing...');
        if (data.lessons) {
          setGenerationLessons(data.lessons as string[]);
        }
      },
      onChunk: () => {},
      onComplete: (data) => {
        setIsGenerating(false);
        setIsSubtopicSheetOpen(false);
        const courseId = data.course_id;
        if (courseId) {
          navigate(`/course/${courseId}`);
        }
      },
      onError: (data) => {
        setIsGenerating(false);
        setGenerationStatus(`Error: ${data.message || 'Generation failed'}`);
      },
    });
  };

  const handleSubtopicToggle = (subtopicId: number) => {
    setSelectedSubtopics((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(subtopicId)) {
        newSet.delete(subtopicId);
      } else {
        newSet.add(subtopicId);
      }
      return newSet;
    });
  };

  const handleGenerateFromSubtopics = () => {
    if (!selectedNode) return;

    const topicIds = [selectedNode.topic_id, ...Array.from(selectedSubtopics)];
    generateCourseWithTopics(topicIds);
  };

  const handleSelectAllSubtopics = () => {
    if (!topicDetails?.subtopics) return;
    setSelectedSubtopics(new Set(topicDetails.subtopics.map((s) => s.id)));
  };

  const handleClearSubtopics = () => {
    setSelectedSubtopics(new Set());
  };

  const handleContinueCourse = () => {
    if (selectedNode?.course) {
      navigate(`/course/${selectedNode.course.id}`);
    }
  };

  const handleSelectNode = (node: NodeWithStatus) => {
    setSelectedNode(node);
    setIsPanelOpen(true);
  };

  // Calculate stats
  const stats = useMemo(() => {
    const completed = nodesWithStatus.filter((n) => n.status === 'completed').length;
    const inProgress = nodesWithStatus.filter((n) => n.status === 'in-progress').length;
    const available = nodesWithStatus.filter((n) => n.status === 'available').length;
    const recommended = nodesWithStatus.filter((n) => n.status === 'recommended').length;
    const totalXP = nodesWithStatus.reduce((sum, n) => sum + (n.course?.total_xp || 0), 0);
    return { completed, inProgress, available, recommended, totalXP, total: nodesWithStatus.length };
  }, [nodesWithStatus]);

  const completionPercentage =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  // Get next recommended node
  const nextRecommendedNode = useMemo(() => {
    return nodesWithStatus.find(
      (n) => n.status === 'available' || n.status === 'in-progress' || n.status === 'recommended'
    );
  }, [nodesWithStatus]);

  if (roadmapLoading) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="flex-1 flex gap-6">
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-96 h-full hidden lg:block" />
        </div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Path Not Found</h2>
        <p className="text-slate-400 mb-6">
          The path you are looking for does not exist in the archives.
        </p>
        <Button asChild variant="fantasy">
          <Link to="/roadmap">Back to Hall</Link>
        </Button>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col animate-in fade-in duration-700">
        {/* Header with Progress */}
        <div className="flex flex-col gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-slate-400 hover:text-white group"
            >
              <Link to="/roadmap">
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" />{' '}
                Back
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-600">
                  {roadmap.title}
                </span>
              </h1>
              {roadmap.description && (
                <p className="text-slate-400 mt-1 text-sm">{roadmap.description}</p>
              )}
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 px-4 py-4 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {completionPercentage}%
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">Path Complete</p>
              <Progress value={completionPercentage} className="h-2 mt-3" />
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.completed}/{stats.total}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">
                Quests Completed
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400" />
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.inProgress + stats.available + stats.recommended}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">
                Open For Exploration
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-orange-400" />
                <span className="text-xl sm:text-2xl font-bold text-white">
                  {stats.totalXP.toLocaleString()}
                </span>
              </div>
              <p className="mt-2 text-xs uppercase tracking-wider text-slate-400">XP Pool</p>
            </div>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0 relative">
          {/* Roadmap Canvas */}
          <div
            className={cn(
              'flex-1 relative bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-y-auto overflow-x-hidden custom-scrollbar shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] transition-all duration-300'
            )}
            style={{ minHeight: '400px' }}
          >
            {/* Side Panel Toggle (Mobile overlay) */}
            <Button
              variant="outline"
              size="sm"
              className={cn(
                'fixed bottom-6 right-6 z-40 lg:hidden shadow-xl rounded-full h-12 w-12 p-0 bg-slate-800 border-slate-600 text-white',
                isPanelOpen && 'hidden'
              )}
              onClick={() => setIsPanelOpen(true)}
            >
              <ScrollText className="w-5 h-5" />
            </Button>

            <div className="flex flex-col items-center p-4 sm:p-8 gap-10 sm:gap-16 min-h-full">
              {nodesWithStatus.length === 0 && (
                <div className="flex items-center justify-center text-slate-500 h-64">
                  <p>No nodes found for this path.</p>
                </div>
              )}

              {Array.from(nodesByTier.entries()).map(([tier, nodes]) => (
                <div key={tier} className="relative w-full flex flex-col items-center gap-6">
                  {/* Tier Label (Desktop) */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 hidden md:flex items-center gap-2 z-0">
                    <div
                      className={cn(
                        'w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br shadow-lg opacity-80',
                        getTierColor(tier)
                      )}
                    >
                      <span className="text-sm font-bold text-white">{tier}</span>
                    </div>
                  </div>

                  {/* Tier Label (Mobile) */}
                  <div className="md:hidden flex items-center gap-2 self-start w-full px-2">
                    <div className="h-px bg-slate-800 flex-1" />
                    <div
                      className={cn(
                        'px-3 py-1 rounded-full flex items-center justify-center bg-gradient-to-br shadow-lg',
                        getTierColor(tier)
                      )}
                    >
                      <span className="text-xs font-bold text-white">Tier {tier}</span>
                    </div>
                    <div className="h-px bg-slate-800 flex-1" />
                  </div>

                  {/* Nodes in this Tier */}
                  <div className="flex flex-wrap justify-center gap-4 sm:gap-6 w-full md:w-auto md:px-16 z-10">
                    {nodes.map((node) => {
                      const isSelected = selectedNode?.id === node.id;
                      const StatusIcon = getStatusIcon(node.status);
                      const statusColor = getStatusColor(node.status);
                      const statusGlow = getStatusGlow(node.status);
                      const tierGlow = getTierGlow(node.tier);

                      return (
                        <Tooltip key={node.id}>
                          <TooltipTrigger asChild>
                            <button
                              onClick={() => handleSelectNode(node)}
                              className={cn(
                                'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 z-10 p-3 text-center group',
                                'w-full sm:w-[14rem] min-h-[5.5rem] shrink-0',
                                'hover:scale-105 hover:-translate-y-1',
                                statusColor,
                                isSelected &&
                                  cn(
                                    'ring-2 ring-offset-2 ring-offset-slate-950 scale-105 shadow-xl',
                                    statusGlow
                                  ),
                                !isSelected && cn('shadow-lg hover:shadow-xl', tierGlow)
                              )}
                            >
                              {/* Progress bar for in-progress */}
                              {node.status === 'in-progress' && (
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50 rounded-b-xl overflow-hidden">
                                  <div
                                    className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                                    style={{ width: `${node.progress}%` }}
                                  />
                                </div>
                              )}

                              <div className="flex items-center gap-2 w-full">
                                <div
                                  className={cn(
                                    'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                                    node.status === 'completed' && 'bg-emerald-500/20',
                                    node.status === 'in-progress' && 'bg-amber-500/20',
                                    node.status === 'available' && 'bg-blue-500/20',
                                    node.status === 'recommended' && 'bg-violet-500/15'
                                  )}
                                >
                                  <StatusIcon className="w-4 h-4" />
                                </div>

                                <div className="flex-1 text-left min-w-0">
                                  <span className="text-xs sm:text-sm font-semibold leading-tight line-clamp-2 block">
                                    {node.topic.title}
                                  </span>
                                  {node.status === 'in-progress' && (
                                    <span className="text-[10px] text-amber-400 font-medium">
                                      {node.progress}%
                                    </span>
                                  )}
                                  {node.status === 'recommended' && (
                                    <span className="text-[10px] text-violet-200 font-medium">
                                      Open for deep dive
                                    </span>
                                  )}
                                </div>

                                {node.course && (
                                  <BookOpen className="w-3 h-3 text-indigo-400 shrink-0 hidden sm:block" />
                                )}
                              </div>
                              <div className="flex w-full items-center justify-between gap-2 text-[10px] uppercase tracking-[0.2em]">
                                <span className="truncate opacity-80">
                                  {node.course
                                    ? node.status === 'completed'
                                      ? 'Review course'
                                      : 'Open course'
                                    : node.status === 'recommended'
                                      ? 'Deep dive available'
                                      : 'Generate course'}
                                </span>
                                <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-70" />
                              </div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs hidden sm:block">
                            <div className="space-y-1">
                              <p className="font-semibold">{node.topic.title}</p>
                              <p className="text-xs text-muted-foreground">Tier {node.tier}</p>
                              {node.status === 'recommended' && node.prerequisites.length > 0 && (
                                <p className="text-xs text-muted-foreground/80">
                                  Suggested before diving deeper:{' '}
                                  {node.prerequisites
                                    .map((p) => roadmap.nodes.find((n) => n.id === p)?.topic.title)
                                    .join(', ')}
                                </p>
                              )}
                              {node.course && (
                                <p className="text-xs text-primary">
                                  Course available • {node.course.total_xp} XP
                                </p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Side Panel Overlay (Mobile) */}
          <div
            className={cn(
              'fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden transition-opacity duration-300',
              isPanelOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
            onClick={() => setIsPanelOpen(false)}
          />

          {/* Side Panel for Node Detail */}
          <div
            className={cn(
              'fixed top-0 right-0 bottom-0 z-50 lg:static lg:z-auto', // Fixed on mobile, static on desktop
              'shrink-0 flex flex-col transition-transform lg:transition-all duration-300 overflow-hidden',
              'w-full sm:w-[85vw] sm:max-w-sm lg:w-96',
              'bg-slate-900 border-l border-slate-700/50 lg:border-none shadow-2xl lg:shadow-none',
              isPanelOpen
                ? 'translate-x-0 lg:opacity-100'
                : 'translate-x-full lg:w-0 lg:opacity-0 lg:translate-x-0'
            )}
          >
            {selectedNode ? (
              <Card className="h-full flex flex-col border-none rounded-none lg:rounded-xl lg:border-slate-700/50 lg:bg-slate-900/90 shadow-2xl overflow-hidden">
                {/* Header gradient bar */}
                <div
                  className={cn(
                    'h-2 w-full shrink-0 bg-gradient-to-r',
                    getTierColor(selectedNode.tier)
                  )}
                />

                <CardHeader className="pb-4 relative shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-4 lg:hidden text-slate-400 hover:text-white"
                    onClick={() => setIsPanelOpen(false)}
                  >
                    <ChevronRight className="w-5 h-5" />
                  </Button>

                  <div className="flex items-center gap-2 mb-2 pr-8">
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-xs',
                        selectedNode.status === 'completed' &&
                          'border-emerald-500/50 text-emerald-400',
                        selectedNode.status === 'in-progress' &&
                          'border-amber-500/50 text-amber-400',
                        selectedNode.status === 'available' && 'border-blue-500/50 text-blue-400',
                        selectedNode.status === 'recommended' &&
                          'border-violet-500/40 text-violet-200'
                      )}
                    >
                      {selectedNode.status === 'completed' && (
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                      )}
                      {selectedNode.status === 'in-progress' && <Play className="w-3 h-3 mr-1" />}
                      {selectedNode.status === 'available' && <Circle className="w-3 h-3 mr-1" />}
                      {selectedNode.status === 'recommended' && (
                        <Shield className="w-3 h-3 mr-1" />
                      )}
                      {selectedNode.status.replace('-', ' ').toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      Tier {selectedNode.tier}
                    </Badge>
                  </div>

                  <CardTitle className="text-xl text-white leading-tight pr-4">
                    {selectedNode.topic.title}
                  </CardTitle>

                  {selectedNode.topic.description && (
                    <CardDescription className="text-slate-400 mt-2 leading-relaxed">
                      {selectedNode.topic.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  {/* Progress indicator */}
                  {selectedNode.status === 'in-progress' && (
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-amber-400">Progress</span>
                        <span className="text-sm font-bold text-amber-400">
                          {selectedNode.progress}%
                        </span>
                      </div>
                      <Progress value={selectedNode.progress} className="h-2" />
                    </div>
                  )}

                  {/* Prerequisites */}
                  {selectedNode.prerequisites.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Suggested Foundations
                      </h4>
                      <div className="space-y-1">
                        {selectedNode.prerequisites.map((prereqId) => {
                          const prereq = nodesWithStatus.find((n) => n.id === prereqId);
                          const isCompleted = prereq?.status === 'completed';
                          return (
                            <div
                              key={prereqId}
                              className={cn(
                                'flex items-center gap-2 text-sm py-1 px-2 rounded',
                                isCompleted
                                  ? 'text-emerald-400 bg-emerald-500/10'
                                  : 'text-slate-300 bg-slate-800/50'
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-3 h-3 shrink-0" />
                              ) : (
                                <Shield className="w-3 h-3 shrink-0 text-violet-300" />
                              )}
                              <span className="truncate">{prereq?.topic.title || 'Unknown'}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Course Info */}
                  {selectedNode.course && (
                    <div className="p-4 bg-indigo-500/10 rounded-lg border border-indigo-500/20 space-y-3">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-indigo-400" />
                        <span className="font-semibold text-indigo-300">
                          {isCourseCompleted(selectedNode.course)
                            ? 'Course Complete'
                            : selectedNode.course.status === 'generating'
                              ? 'Course Generating'
                              : isCourseStarted(selectedNode.course)
                                ? 'Course In Progress'
                                : 'Course Ready'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div className="flex items-center gap-2 text-slate-400">
                          <ScrollText className="w-4 h-4" />
                          <span>{selectedNode.course.total_lessons} lessons</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400">
                          <Star className="w-4 h-4" />
                          <span>{selectedNode.course.total_xp} XP</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Keywords (removed) */}

                  {/* Actions */}
                  <div className="mt-auto pt-4 space-y-3 pb-6 lg:pb-0">
                    {isGenerating ? (
                      <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-indigo-400">
                          <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          <span className="truncate">{generationStatus}</span>
                        </div>
                        {generationLessons.length > 0 && (
                          <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                            {generationLessons.map((title, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span className="truncate">{title}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <>
                        {selectedNode.course ? (
                          <Button
                            onClick={handleContinueCourse}
                            variant="fantasy"
                            className="w-full justify-center gap-2 relative overflow-hidden group"
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                            {getCourseActionLabel(selectedNode.course) === 'Review Course' ? (
                              <>
                                <Scroll className="w-4 h-4" /> Review Course
                              </>
                            ) : getCourseActionLabel(selectedNode.course) === 'Start Course' ? (
                              <>
                                <Play className="w-4 h-4" /> Start Course
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" /> Continue Course
                              </>
                            )}
                          </Button>
                        ) : (
                          <div className="space-y-3">
                            <Button
                              onClick={handleGenerateCourse}
                              variant="fantasy"
                              className="w-full justify-center gap-2 relative overflow-hidden group"
                            >
                              <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                              <Sparkles className="w-4 h-4" />
                              {selectedNode.status === 'recommended'
                                ? 'Generate Deep Dive Course'
                                : 'Generate Course'}
                            </Button>
                            {selectedNode.status === 'recommended' && (
                              <p className="text-xs text-slate-400 leading-relaxed">
                                You can start here immediately. The topics above are guidance, not a
                                hard lock.
                              </p>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : nextRecommendedNode ? (
              <Card className="h-full flex flex-col border-none rounded-none lg:rounded-xl lg:border-slate-700/50 bg-slate-900 lg:bg-slate-900/90 shadow-2xl overflow-hidden items-center justify-center p-8 text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-4 lg:hidden text-slate-400 hover:text-white"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Next Quest</h3>
                <p className="text-slate-400 text-sm mb-4">{nextRecommendedNode.topic.title}</p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedNode(nextRecommendedNode)}
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  View Quest <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ) : (
              <Card className="h-full flex flex-col border-none rounded-none lg:rounded-xl lg:border-slate-700/50 bg-slate-900 lg:bg-slate-900/90 shadow-2xl overflow-hidden items-center justify-center p-8 text-center relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-4 lg:hidden text-slate-400 hover:text-white"
                  onClick={() => setIsPanelOpen(false)}
                >
                  <ChevronRight className="w-5 h-5" />
                </Button>
                <Trophy className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Path Complete!</h3>
                <p className="text-slate-400 text-sm">You have mastered all quests in this path.</p>
              </Card>
            )}
          </div>
        </div>
      </div>

      {/* Subtopic Selection Sheet */}
      <Sheet open={isSubtopicSheetOpen} onOpenChange={setIsSubtopicSheetOpen}>
        <SheetContent className="w-[min(92vw,32rem)] border-border/70 bg-card/95 text-foreground backdrop-blur-xl">
          <SheetHeader className="border-b border-border/70 px-6 py-5">
            <SheetTitle className="font-serif text-2xl text-foreground">Select Subtopics</SheetTitle>
            <SheetDescription className="text-muted-foreground">
              Choose which subtopics to include in your course for{' '}
              <strong>{selectedNode?.topic.title}</strong>
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {topicLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : topicDetails?.subtopics && topicDetails.subtopics.length > 0 ? (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/70 bg-background/35 px-4 py-3 text-sm">
                  <button
                    onClick={handleSelectAllSubtopics}
                    className="font-medium text-primary transition-colors hover:text-primary/80"
                  >
                    Select All
                  </button>
                  <span className="text-border">|</span>
                  <button
                    onClick={handleClearSubtopics}
                    className="text-muted-foreground transition-colors hover:text-foreground"
                  >
                    Clear
                  </button>
                  <span className="ml-auto text-muted-foreground">{selectedSubtopics.size} selected</span>
                </div>

                <div className="space-y-2">
                  {topicDetails.subtopics.map((subtopic) => (
                    <label
                      key={subtopic.id}
                      className={cn(
                        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
                        selectedSubtopics.has(subtopic.id)
                          ? 'border-primary/40 bg-primary/10'
                          : 'border-border/70 bg-background/35 hover:bg-background/55'
                      )}
                    >
                      <Checkbox
                        checked={selectedSubtopics.has(subtopic.id)}
                        onCheckedChange={() => handleSubtopicToggle(subtopic.id)}
                        className="mt-0.5"
                      />
                      <div className="flex-1">
                        <p className="font-medium text-foreground">{subtopic.title}</p>
                        {subtopic.description && (
                          <p className="mt-1 text-sm text-muted-foreground">{subtopic.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">
                No subtopics available for this topic.
              </p>
            )}
          </div>

          <SheetFooter className="border-t border-border/70 px-6 py-4">
            {isGenerating ? (
              <div className="w-full space-y-3">
                <div className="flex items-center gap-2 text-sm text-primary">
                  <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                  <span className="truncate">{generationStatus}</span>
                </div>
                {generationLessons.length > 0 && (
                  <div className="max-h-32 space-y-1 overflow-y-auto text-xs text-muted-foreground">
                    {generationLessons.map((title, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-3 h-3 shrink-0 text-chart-2" />
                        <span className="truncate">{title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex w-full flex-col gap-3 sm:flex-row">
                <Button
                  variant="outline"
                  onClick={() => setIsSubtopicSheetOpen(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="fantasy"
                  onClick={handleGenerateFromSubtopics}
                  className="flex-1"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {selectedSubtopics.size === 0
                    ? 'Generate Course (main topic only)'
                    : `Generate Course (${selectedSubtopics.size + 1} topics)`}
                </Button>
              </div>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}
