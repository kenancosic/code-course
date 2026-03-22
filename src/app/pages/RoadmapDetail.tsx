import { useParams, Link, useNavigate } from "react-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Circle,
  Zap,
  Code,
  Loader2,
  Sparkles,
  Lock,
  Play,
  Trophy,
  ChevronRight,
  Scroll,
  Target,
  Clock,
  Star,
  Flame,
  ChevronLeft,
  GraduationCap,
  Sword,
  Shield,
  Crown,
  ScrollText,
} from "lucide-react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Skeleton } from "../components/ui/skeleton";
import { Progress } from "../components/ui/progress";
import { Badge } from "../components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";
import { cn } from "../../lib/utils";
import { useState, useMemo, useEffect } from "react";
import {
  useRoadmap,
  RoadmapNode,
  useRoadmapProgress,
  useCourses,
  generateCourseStream,
  Course,
} from "../../hooks";

// Layout constants
const CANVAS_WIDTH = 900;
const NODE_W = 200;
const NODE_H = 80;
const TIER_GAP = 160;
const TIER_START_Y = 80;

// Node status types
type NodeStatus = "locked" | "available" | "in-progress" | "completed";

interface NodeWithStatus extends RoadmapNode {
  status: NodeStatus;
  progress: number;
  course?: Course;
  prerequisites: number[];
}

function computeNodePositions(nodes: RoadmapNode[]): Map<number, { x: number; y: number }> {
  const tiers = new Map<number, RoadmapNode[]>();
  for (const node of nodes) {
    const t = node.tier ?? 1;
    if (!tiers.has(t)) tiers.set(t, []);
    tiers.get(t)!.push(node);
  }

  const positions = new Map<number, { x: number; y: number }>();
  const sortedTiers = [...tiers.keys()].sort((a, b) => a - b);

  for (const tier of sortedTiers) {
    const group = tiers.get(tier)!;
    const y = TIER_START_Y + (tier - 1) * TIER_GAP;
    const totalWidth = group.length * NODE_W + (group.length - 1) * 48;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    group.forEach((node, i) => {
      positions.set(node.id, { x: startX + i * (NODE_W + 48), y });
    });
  }

  return positions;
}

function getTierIcon(tier: number) {
  switch (tier) {
    case 1:
      return Scroll;
    case 2:
      return BookOpen;
    case 3:
      return Sword;
    case 4:
      return Shield;
    default:
      return Crown;
  }
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1:
      return "from-stone-500 to-stone-600";
    case 2:
      return "from-emerald-500 to-emerald-600";
    case 3:
      return "from-blue-500 to-blue-600";
    case 4:
      return "from-purple-500 to-purple-600";
    case 5:
      return "from-amber-500 to-amber-600";
    default:
      return "from-rose-500 to-rose-600";
  }
}

function getTierGlow(tier: number): string {
  switch (tier) {
    case 1:
      return "shadow-stone-500/30";
    case 2:
      return "shadow-emerald-500/30";
    case 3:
      return "shadow-blue-500/30";
    case 4:
      return "shadow-purple-500/30";
    case 5:
      return "shadow-amber-500/30";
    default:
      return "shadow-rose-500/30";
  }
}

function getStatusIcon(status: NodeStatus) {
  switch (status) {
    case "completed":
      return CheckCircle2;
    case "in-progress":
      return Play;
    case "available":
      return Circle;
    case "locked":
      return Lock;
  }
}

function getStatusColor(status: NodeStatus): string {
  switch (status) {
    case "completed":
      return "text-emerald-400 border-emerald-500/50 bg-emerald-500/10";
    case "in-progress":
      return "text-amber-400 border-amber-500/50 bg-amber-500/10";
    case "available":
      return "text-blue-400 border-blue-500/50 bg-blue-500/10";
    case "locked":
      return "text-slate-500 border-slate-600/50 bg-slate-700/20";
  }
}

function getStatusGlow(status: NodeStatus): string {
  switch (status) {
    case "completed":
      return "shadow-emerald-500/20";
    case "in-progress":
      return "shadow-amber-500/20";
    case "available":
      return "shadow-blue-500/20";
    case "locked":
      return "";
  }
}

export function RoadmapDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data: roadmap, isLoading: roadmapLoading, error } = useRoadmap(pathId || "");
  const { data: progress } = useRoadmapProgress(pathId || "");
  const { data: courses } = useCourses();
  const [selectedNode, setSelectedNode] = useState<NodeWithStatus | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(true);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationLessons, setGenerationLessons] = useState<string[]>([]);

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
  }, [roadmap?.connections]);

  // Compute node statuses
  const nodesWithStatus = useMemo((): NodeWithStatus[] => {
    if (!roadmap?.nodes) return [];

    return roadmap.nodes.map((node) => {
      const course = courses?.find((c) => c.roadmap_node_id === node.id);
      const prerequisites = connectionMap.get(node.id) || [];

      // Determine status based on course and progress
      let status: NodeStatus = "locked";
      let nodeProgress = 0;

      if (course) {
        if (course.status === "completed") {
          status = "completed";
          nodeProgress = 100;
        } else if (course.status === "in_progress") {
          status = "in-progress";
          // Calculate progress from lessons if available
          const completedLessons = course.lessons?.filter((l) => l.content_markdown).length || 0;
          nodeProgress = course.total_lessons > 0
            ? Math.round((completedLessons / course.total_lessons) * 100)
            : 0;
        } else {
          status = "available";
        }
      } else if (node.tier === 1) {
        status = "available";
      } else {
        // Check if prerequisites are completed
        const prereqsCompleted = prerequisites.every((prereqId) => {
          const prereqCourse = courses?.find((c) => c.roadmap_node_id === prereqId);
          return prereqCourse?.status === "completed";
        });
        if (prereqsCompleted) {
          status = "available";
        }
      }

      return {
        ...node,
        status,
        progress: nodeProgress,
        course,
        prerequisites,
      };
    });
  }, [roadmap?.nodes, courses, connectionMap]);

  // Auto-select first available node if none selected
  useEffect(() => {
    if (nodesWithStatus.length > 0 && !selectedNode) {
      const availableNode = nodesWithStatus.find(
        (n) => n.status === "available" || n.status === "in-progress"
      );
      if (availableNode) {
        setSelectedNode(availableNode);
      }
    }
  }, [nodesWithStatus, selectedNode]);

  const positions = computeNodePositions(nodesWithStatus);

  const handleGenerateCourse = () => {
    if (!selectedNode) return;
    setIsGenerating(true);
    setGenerationStatus("Initiating course generation...");
    setGenerationLessons([]);

    generateCourseStream(selectedNode.id, {
      onStatus: (data) => {
        setGenerationStatus((data.message as string) || "Processing...");
        if (data.lessons) {
          setGenerationLessons(data.lessons as string[]);
        }
      },
      onChunk: () => {},
      onComplete: (data) => {
        setIsGenerating(false);
        const courseId = data.course_id;
        if (courseId) {
          navigate(`/course/${courseId}`);
        }
      },
      onError: (data) => {
        setIsGenerating(false);
        setGenerationStatus(`Error: ${data.message || "Generation failed"}`);
      },
    });
  };

  const handleContinueCourse = () => {
    if (selectedNode?.course) {
      navigate(`/course/${selectedNode.course.id}`);
    }
  };

  // Calculate stats
  const stats = useMemo(() => {
    const completed = nodesWithStatus.filter((n) => n.status === "completed").length;
    const inProgress = nodesWithStatus.filter((n) => n.status === "in-progress").length;
    const available = nodesWithStatus.filter((n) => n.status === "available").length;
    const totalXP = nodesWithStatus.reduce((sum, n) => sum + (n.course?.total_xp || 0), 0);
    return { completed, inProgress, available, totalXP, total: nodesWithStatus.length };
  }, [nodesWithStatus]);

  const completionPercentage = stats.total > 0
    ? Math.round((stats.completed / stats.total) * 100)
    : 0;

  // Get next recommended node
  const nextRecommendedNode = useMemo(() => {
    return nodesWithStatus.find((n) => n.status === "available" || n.status === "in-progress");
  }, [nodesWithStatus]);

  if (roadmapLoading) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="flex-1 flex gap-6">
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-96 h-full" />
        </div>
      </div>
    );
  }

  if (error || !roadmap) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Path Not Found</h2>
        <p className="text-slate-400 mb-6">The path you are looking for does not exist in the archives.</p>
        <Button asChild variant="fantasy">
          <Link to="/roadmap">Back to Hall</Link>
        </Button>
      </div>
    );
  }

  const maxY = nodesWithStatus.length > 0
    ? Math.max(...[...positions.values()].map((p) => p.y)) + NODE_H + 80
    : 400;
  const canvasHeight = Math.max(maxY, 400);

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col animate-in fade-in duration-700">
        {/* Header with Progress */}
        <div className="flex flex-col gap-4 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white group">
              <Link to="/roadmap">
                <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
              </Link>
            </Button>
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
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
          <div className="flex flex-wrap items-center gap-6 px-4 py-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-400" />
                <span className="text-2xl font-bold text-white">{completionPercentage}%</span>
              </div>
              <div className="flex flex-col">
                <span className="text-xs text-slate-500 uppercase tracking-wider">Path Complete</span>
                <div className="w-32">
                  <Progress value={completionPercentage} className="h-2" />
                </div>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">{stats.completed}/{stats.total}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">Quests Done</span>
              </div>
            </div>

            <div className="h-8 w-px bg-slate-700 hidden sm:block" />

            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <div className="flex flex-col">
                <span className="text-lg font-bold text-white">{stats.totalXP.toLocaleString()}</span>
                <span className="text-xs text-slate-500 uppercase tracking-wider">XP Earned</span>
              </div>
            </div>

            {stats.inProgress > 0 && (
              <>
                <div className="h-8 w-px bg-slate-700 hidden sm:block" />
                <div className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-amber-400" />
                  <div className="flex flex-col">
                    <span className="text-lg font-bold text-white">{stats.inProgress}</span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">In Progress</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
          {/* Roadmap Canvas */}
          <div
            className={cn(
              "flex-1 relative bg-slate-950/60 rounded-xl border border-slate-800/80 overflow-auto custom-scrollbar shadow-[inset_0_0_80px_rgba(0,0,0,0.6)] transition-all duration-300",
              !isPanelOpen && "mr-0"
            )}
            style={{ minHeight: "400px" }}
          >
            {/* Tier Labels */}
            <div className="absolute left-4 top-0 bottom-0 w-12 flex flex-col pointer-events-none">
              {[...new Set(nodesWithStatus.map((n) => n.tier))].sort((a, b) => a - b).map((tier) => (
                <div
                  key={tier}
                  className="flex items-center gap-2"
                  style={{
                    position: "absolute",
                    top: TIER_START_Y + (tier - 1) * TIER_GAP + NODE_H / 2,
                    transform: "translateY(-50%)",
                  }}
                >
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br shadow-lg", getTierColor(tier))}>
                    <span className="text-xs font-bold text-white">{tier}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative pl-16" style={{ width: CANVAS_WIDTH + 64, height: canvasHeight, margin: "0 auto" }}>
              {/* SVG connection lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ width: CANVAS_WIDTH, height: canvasHeight, left: 64 }}
              >
                <defs>
                  <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="activeLineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                    <feMerge>
                      <feMergeNode in="coloredBlur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {roadmap.connections?.map((conn) => {
                  const from = positions.get(conn.from_node_id);
                  const to = positions.get(conn.to_node_id);
                  if (!from || !to) return null;

                  const fromNode = nodesWithStatus.find((n) => n.id === conn.from_node_id);
                  const toNode = nodesWithStatus.find((n) => n.id === conn.to_node_id);
                  const isActive = fromNode?.status === "completed" || fromNode?.status === "in-progress";

                  const x1 = from.x + NODE_W / 2;
                  const y1 = from.y + NODE_H;
                  const x2 = to.x + NODE_W / 2;
                  const y2 = to.y;

                  // Curved path
                  const midY = (y1 + y2) / 2;
                  const path = `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`;

                  return (
                    <g key={conn.id}>
                      <path
                        d={path}
                        fill="none"
                        stroke={isActive ? "url(#activeLineGradient)" : "url(#lineGradient)"}
                        strokeWidth={isActive ? "3" : "2"}
                        strokeDasharray={isActive ? "0" : "5,5"}
                        className={cn(
                          "transition-all duration-500",
                          isActive && "animate-pulse"
                        )}
                        filter={isActive ? "url(#glow)" : undefined}
                      />
                      {isActive && (
                        <circle r="3" fill="#10b981">
                          <animateMotion dur="2s" repeatCount="indefinite" path={path} />
                        </circle>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Nodes */}
              {nodesWithStatus.map((node) => {
                const pos = positions.get(node.id);
                if (!pos) return null;
                const isSelected = selectedNode?.id === node.id;
                const StatusIcon = getStatusIcon(node.status);
                const TierIcon = getTierIcon(node.tier);
                const statusColor = getStatusColor(node.status);
                const statusGlow = getStatusGlow(node.status);
                const tierGlow = getTierGlow(node.tier);

                return (
                  <Tooltip key={node.id}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => setSelectedNode(node)}
                        className={cn(
                          "absolute flex flex-col items-center justify-center gap-2 rounded-xl border-2 backdrop-blur-sm transition-all duration-300 z-10 p-3 text-center group",
                          "hover:scale-105 hover:-translate-y-1",
                          statusColor,
                          isSelected && cn("ring-2 ring-offset-2 ring-offset-slate-950 scale-105 shadow-xl", statusGlow),
                          !isSelected && cn("shadow-lg hover:shadow-xl", tierGlow),
                          node.status === "locked" && "opacity-60 cursor-not-allowed hover:scale-100 hover:translate-y-0"
                        )}
                        style={{
                          left: pos.x,
                          top: pos.y,
                          width: NODE_W,
                          height: NODE_H,
                        }}
                        disabled={node.status === "locked"}
                      >
                        {/* Progress bar for in-progress */}
                        {node.status === "in-progress" && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800/50 rounded-b-xl overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-amber-400 to-orange-400 transition-all duration-500"
                              style={{ width: `${node.progress}%` }}
                            />
                          </div>
                        )}

                        <div className="flex items-center gap-2 w-full">
                          <div className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                            node.status === "completed" && "bg-emerald-500/20",
                            node.status === "in-progress" && "bg-amber-500/20",
                            node.status === "available" && "bg-blue-500/20",
                            node.status === "locked" && "bg-slate-700/30"
                          )}>
                            <StatusIcon className={cn("w-4 h-4", node.status === "locked" && "text-slate-500")} />
                          </div>

                          <div className="flex-1 text-left min-w-0">
                            <span className="text-xs font-semibold leading-tight line-clamp-2 block">
                              {node.title}
                            </span>
                            {node.status === "in-progress" && (
                              <span className="text-[10px] text-amber-400 font-medium">{node.progress}%</span>
                            )}
                          </div>

                          {node.course && (
                            <BookOpen className="w-3 h-3 text-indigo-400 shrink-0" />
                          )}
                        </div>

                        {/* Hover quick actions */}
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pointer-events-none">
                          {node.status === "available" && !node.course && (
                            <Badge variant="secondary" className="text-[10px] bg-blue-500/20 text-blue-300 border-blue-500/30">
                              <Sparkles className="w-3 h-3 mr-1" /> Generate
                            </Badge>
                          )}
                          {node.course && (
                            <Badge variant="secondary" className={cn(
                              "text-[10px]",
                              node.status === "completed"
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                                : "bg-amber-500/20 text-amber-300 border-amber-500/30"
                            )}>
                              {node.status === "completed" ? "Completed" : "Continue"}
                            </Badge>
                          )}
                        </div>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="space-y-1">
                        <p className="font-semibold">{node.title}</p>
                        <p className="text-xs text-slate-400">Tier {node.tier}</p>
                        {node.status === "locked" && node.prerequisites.length > 0 && (
                          <p className="text-xs text-slate-500">
                            Requires: {node.prerequisites.map((p) => roadmap.nodes.find((n) => n.id === p)?.title).join(", ")}
                          </p>
                        )}
                        {node.course && (
                          <p className="text-xs text-indigo-400">
                            Course available • {node.course.total_xp} XP
                          </p>
                        )}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })}

              {nodesWithStatus.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                  <p>No nodes found for this path.</p>
                </div>
              )}
            </div>
          </div>

          {/* Side Panel Toggle (Mobile) */}
          <Button
            variant="outline"
            size="sm"
            className="absolute right-4 top-20 z-20 lg:hidden"
            onClick={() => setIsPanelOpen(!isPanelOpen)}
          >
            {isPanelOpen ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>

          {/* Side Panel for Node Detail */}
          <div
            className={cn(
              "shrink-0 flex flex-col transition-all duration-300 overflow-hidden",
              isPanelOpen ? "w-96 opacity-100" : "w-0 opacity-0"
            )}
          >
            {selectedNode ? (
              <Card className="h-full flex flex-col border-slate-700/50 bg-slate-900/90 shadow-2xl overflow-hidden">
                {/* Header gradient bar */}
                <div className={cn("h-2 w-full bg-gradient-to-r", getTierColor(selectedNode.tier))} />

                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs",
                        selectedNode.status === "completed" && "border-emerald-500/50 text-emerald-400",
                        selectedNode.status === "in-progress" && "border-amber-500/50 text-amber-400",
                        selectedNode.status === "available" && "border-blue-500/50 text-blue-400",
                        selectedNode.status === "locked" && "border-slate-600 text-slate-500"
                      )}
                    >
                      {selectedNode.status === "completed" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {selectedNode.status === "in-progress" && <Play className="w-3 h-3 mr-1" />}
                      {selectedNode.status === "available" && <Circle className="w-3 h-3 mr-1" />}
                      {selectedNode.status === "locked" && <Lock className="w-3 h-3 mr-1" />}
                      {selectedNode.status.replace("-", " ").toUpperCase()}
                    </Badge>
                    <Badge variant="secondary" className="text-xs">
                      <Target className="w-3 h-3 mr-1" />
                      Tier {selectedNode.tier}
                    </Badge>
                  </div>

                  <CardTitle className="text-xl text-white leading-tight">{selectedNode.title}</CardTitle>

                  {selectedNode.description && (
                    <CardDescription className="text-slate-400 mt-2 leading-relaxed">
                      {selectedNode.description}
                    </CardDescription>
                  )}
                </CardHeader>

                <CardContent className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
                  {/* Progress indicator */}
                  {selectedNode.status === "in-progress" && (
                    <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-amber-400">Progress</span>
                        <span className="text-sm font-bold text-amber-400">{selectedNode.progress}%</span>
                      </div>
                      <Progress value={selectedNode.progress} className="h-2" />
                    </div>
                  )}

                  {/* Prerequisites */}
                  {selectedNode.prerequisites.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Shield className="w-3 h-3" /> Prerequisites
                      </h4>
                      <div className="space-y-1">
                        {selectedNode.prerequisites.map((prereqId) => {
                          const prereq = nodesWithStatus.find((n) => n.id === prereqId);
                          const isCompleted = prereq?.status === "completed";
                          return (
                            <div
                              key={prereqId}
                              className={cn(
                                "flex items-center gap-2 text-sm py-1 px-2 rounded",
                                isCompleted ? "text-emerald-400 bg-emerald-500/10" : "text-slate-500 bg-slate-800/50"
                              )}
                            >
                              {isCompleted ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Lock className="w-3 h-3" />
                              )}
                              <span className="truncate">{prereq?.title || "Unknown"}</span>
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
                        <span className="font-semibold text-indigo-300">Course Generated</span>
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

                  {/* Keywords */}
                  {selectedNode.topic_keywords && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Topics
                      </h4>
                      <div className="flex flex-wrap gap-1">
                        {selectedNode.topic_keywords.split(",").map((kw, i) => (
                          <Badge key={i} variant="outline" className="text-xs border-slate-700 text-slate-400">
                            {kw.trim()}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="mt-auto pt-4 space-y-3">
                    {isGenerating ? (
                      <div className="space-y-3 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                        <div className="flex items-center gap-2 text-sm text-indigo-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>{generationStatus}</span>
                        </div>
                        {generationLessons.length > 0 && (
                          <div className="text-xs text-slate-500 space-y-1 max-h-32 overflow-y-auto">
                            {generationLessons.map((title, i) => (
                              <div key={i} className="flex items-center gap-2">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                <span>{title}</span>
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
                            {selectedNode.status === "completed" ? (
                              <>
                                <Scroll className="w-4 h-4" /> Review Course
                              </>
                            ) : (
                              <>
                                <Play className="w-4 h-4" /> Continue Course
                              </>
                            )}
                          </Button>
                        ) : selectedNode.status !== "locked" ? (
                          <Button
                            onClick={handleGenerateCourse}
                            variant="fantasy"
                            className="w-full justify-center gap-2 relative overflow-hidden group"
                            disabled={selectedNode.status === "locked"}
                          >
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                            <Sparkles className="w-4 h-4" /> Generate Course
                          </Button>
                        ) : (
                          <Button
                            disabled
                            variant="outline"
                            className="w-full justify-center gap-2 border-slate-700 text-slate-500"
                          >
                            <Lock className="w-4 h-4" /> Complete Prerequisites
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : nextRecommendedNode ? (
              <Card className="h-full flex flex-col border-slate-700/50 bg-slate-900/90 shadow-2xl overflow-hidden items-center justify-center p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mb-4">
                  <Target className="w-8 h-8 text-amber-400" />
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">Next Quest</h3>
                <p className="text-slate-400 text-sm mb-4">{nextRecommendedNode.title}</p>
                <Button
                  variant="outline"
                  onClick={() => setSelectedNode(nextRecommendedNode)}
                  className="border-amber-500/50 text-amber-400 hover:bg-amber-500/10"
                >
                  View Quest <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </Card>
            ) : (
              <Card className="h-full flex flex-col border-slate-700/50 bg-slate-900/90 shadow-2xl overflow-hidden items-center justify-center p-8 text-center">
                <Trophy className="w-16 h-16 text-emerald-400 mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Path Complete!</h3>
                <p className="text-slate-400 text-sm">You have mastered all quests in this path.</p>
              </Card>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
