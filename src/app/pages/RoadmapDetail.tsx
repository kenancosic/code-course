import { useParams, Link, useNavigate } from "react-router";
import { ArrowLeft, BookOpen, CheckCircle2, Circle, Zap, Code, Loader2, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../../lib/utils";
import { useState } from "react";
import { useRoadmap, RoadmapNode, generateCourseStream } from "../../hooks";

// Layout constants
const CANVAS_WIDTH = 800;
const NODE_W = 180;
const NODE_H = 60;
const TIER_GAP = 140;
const TIER_START_Y = 60;

function computeNodePositions(nodes: RoadmapNode[]): Map<number, { x: number; y: number }> {
  // Group nodes by tier
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
    const totalWidth = group.length * NODE_W + (group.length - 1) * 40;
    const startX = (CANVAS_WIDTH - totalWidth) / 2;
    group.forEach((node, i) => {
      positions.set(node.id, { x: startX + i * (NODE_W + 40), y });
    });
  }

  return positions;
}

export function RoadmapDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data: roadmap, isLoading, error } = useRoadmap(pathId || "");
  const [selectedNode, setSelectedNode] = useState<RoadmapNode | null>(null);
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState("");
  const [generationLessons, setGenerationLessons] = useState<string[]>([]);

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
      onChunk: () => {
        // Content streaming — could show a progress indicator
      },
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

  if (isLoading) {
    return (
      <div className="h-full flex flex-col animate-in fade-in duration-300">
        <Skeleton className="h-10 w-48 mb-6" />
        <div className="flex-1 flex gap-6">
          <Skeleton className="flex-1 h-full" />
          <Skeleton className="w-80 h-full" />
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

  const nodes = roadmap.nodes ?? [];
  const connections = roadmap.connections ?? [];
  const positions = computeNodePositions(nodes);

  const maxY = nodes.length > 0
    ? Math.max(...[...positions.values()].map((p) => p.y)) + NODE_H + 60
    : 300;
  const canvasHeight = Math.max(maxY, 300);

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-700">
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white group">
          <Link to="/roadmap">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-emerald-400">
            {roadmap.title}
          </h1>
          {roadmap.description && (
            <p className="text-slate-400 mt-1 text-sm">{roadmap.description}</p>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Roadmap Canvas */}
        <div
          className="flex-1 relative bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-auto p-6 custom-scrollbar shadow-[inset_0_0_50px_rgba(0,0,0,0.5)]"
          style={{ minHeight: '400px' }}
        >
          <div className="relative" style={{ width: CANVAS_WIDTH, height: canvasHeight, margin: '0 auto' }}>
            {/* SVG connection lines */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ width: CANVAS_WIDTH, height: canvasHeight }}
            >
              {connections.map((conn) => {
                const from = positions.get(conn.from_node_id);
                const to = positions.get(conn.to_node_id);
                if (!from || !to) return null;
                const x1 = from.x + NODE_W / 2;
                const y1 = from.y + NODE_H;
                const x2 = to.x + NODE_W / 2;
                const y2 = to.y;
                return (
                  <line
                    key={conn.id}
                    x1={x1}
                    y1={y1}
                    x2={x2}
                    y2={y2}
                    stroke="#334155"
                    strokeWidth="2"
                    strokeDasharray="4 4"
                  />
                );
              })}
            </svg>

            {/* Nodes */}
            {nodes.map((node) => {
              const pos = positions.get(node.id);
              if (!pos) return null;
              const isSelected = selectedNode?.id === node.id;
              const Icon = node.tier === 1 ? Zap : node.tier >= 4 ? CheckCircle2 : Circle;

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "absolute flex flex-col items-center justify-center gap-1 rounded-lg border backdrop-blur-sm transition-all hover:scale-105 z-10 p-2 text-center",
                    "bg-slate-800/50 text-slate-300 border-slate-700 hover:border-indigo-500/60 hover:text-white",
                    isSelected && "ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900 border-indigo-500/80"
                  )}
                  style={{
                    left: pos.x,
                    top: pos.y,
                    width: NODE_W,
                    height: NODE_H,
                  }}
                >
                  <Icon className="w-4 h-4 shrink-0 text-indigo-400" />
                  <span className="text-xs font-semibold leading-tight line-clamp-2">{node.title}</span>
                </button>
              );
            })}

            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center text-slate-500">
                <p>No nodes found for this path.</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Panel for Node Detail */}
        {selectedNode ? (
          <div className="w-80 shrink-0 flex flex-col animate-in slide-in-from-right-8 duration-300">
            <Card className="h-full flex flex-col border-indigo-500/30 bg-slate-900/80 shadow-2xl overflow-hidden">
              <div className="h-2 w-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />
              <div className="p-6 flex-1 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="flex items-center gap-3 mb-4 text-purple-400">
                  <Sparkles className="w-6 h-6" />
                  <span className="text-xs font-bold uppercase tracking-wider">Quest Details</span>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedNode.title}</h3>

                <div className="flex items-center gap-2 mb-6">
                  <span className="px-2 py-1 text-xs font-semibold rounded-md border bg-slate-800 text-slate-400 border-slate-700">
                    Tier {selectedNode.tier}
                  </span>
                </div>

                {selectedNode.description && (
                  <p className="text-slate-300 leading-relaxed mb-8">{selectedNode.description}</p>
                )}

                {selectedNode.topic_keywords && (
                  <div className="mb-8">
                    <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Keywords</p>
                    <p className="text-slate-400 text-sm">{selectedNode.topic_keywords}</p>
                  </div>
                )}

                <div className="space-y-3 mt-auto">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Available Actions</h4>

                  {isGenerating ? (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm text-indigo-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{generationStatus}</span>
                      </div>
                      {generationLessons.length > 0 && (
                        <div className="text-xs text-slate-500 space-y-1">
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
                    <Button
                      onClick={handleGenerateCourse}
                      variant="fantasy"
                      className="w-full justify-start gap-3 relative overflow-hidden group"
                    >
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <Sparkles className="w-4 h-4" /> Generate Course
                    </Button>
                  )}

                  <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Read Lore (Theory)
                  </Button>

                  <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50">
                    <Code className="w-4 h-4 text-emerald-400" /> Code Trials
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        ) : (
          <div className="w-80 shrink-0 flex flex-col items-center justify-center text-slate-500 border border-slate-800 rounded-xl bg-slate-900/40 p-8">
            <BookOpen className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-center">Select a node to view details and start your quest</p>
          </div>
        )}
      </div>
    </div>
  );
}
