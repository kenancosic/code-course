import { useParams, Link } from "react-router";
import { ArrowLeft, BookOpen, Terminal, CheckCircle2, Circle, Zap, Code, ShieldAlert, Sparkles, Loader2 } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent } from "../components/ui/Card";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../../lib/utils";
import { useState } from "react";
import { useRoadmap } from "../../hooks";

export function RoadmapDetail() {
  const { pathId } = useParams<{ pathId: string }>();
  const { data: roadmap, isLoading, error } = useRoadmap(pathId || "");
  const [selectedNode, setSelectedNode] = useState<any>(null);

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

  // Generate mock nodes from courses data
  const nodes = roadmap.courses?.map((courseId: string, index: number) => ({
    id: courseId,
    title: `Course ${index + 1}`,
    status: index === 0 ? 'current' : 'locked',
    pos: { x: 50, y: index * 20 },
    desc: "Explore this course to unlock new skills and knowledge.",
  })) || [];

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
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Roadmap Canvas */}
        <div className="flex-1 relative bg-slate-900/40 rounded-xl border border-slate-800/80 overflow-y-auto p-12 custom-scrollbar shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]" style={{ minHeight: '600px' }}>
          {/* SVG Lines for connections */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ minHeight: '600px' }}>
            {nodes.map((_, idx) => idx < nodes.length - 1 && (
              <line 
                key={idx}
                x1="50%" 
                y1={`${idx * 160 + 40}px`}
                x2="50%" 
                y2={`${(idx + 1) * 160 + 40}px`}
                stroke="#334155" 
                strokeWidth="2" 
                strokeDasharray="4 4" 
              />
            ))}
          </svg>

          <div className="relative w-full h-full flex justify-center">
            {nodes.map((node: any, idx: number) => {
              const Icon = node.status === 'completed' ? CheckCircle2 : node.status === 'current' ? Zap : Circle;
              const statusColor = 
                node.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.4)]' : 
                node.status === 'current' ? 'bg-amber-500/20 text-amber-400 border-amber-500/80 shadow-[0_0_20px_rgba(245,158,11,0.6)] animate-pulse' : 
                'bg-slate-800/50 text-slate-500 border-slate-700';

              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNode(node)}
                  className={cn(
                    "absolute transform -translate-x-1/2 -translate-y-1/2 w-48 p-3 rounded-lg border backdrop-blur-sm flex flex-col items-center justify-center gap-2 transition-all hover:scale-105 z-10",
                    statusColor,
                    selectedNode?.id === node.id && "ring-2 ring-purple-500 ring-offset-2 ring-offset-slate-900"
                  )}
                  style={{
                    left: `${node.pos.x}%`,
                    top: `${idx * 160 + 40}px`
                  }}
                >
                  <Icon className="w-6 h-6" />
                  <span className="text-sm font-semibold text-center">{node.title}</span>
                </button>
              );
            })}
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
                  <span className={cn(
                    "px-2 py-1 text-xs font-semibold rounded-md border",
                    selectedNode.status === 'completed' ? "bg-emerald-950/50 text-emerald-400 border-emerald-800" :
                    selectedNode.status === 'current' ? "bg-amber-950/50 text-amber-400 border-amber-800" :
                    "bg-slate-800 text-slate-400 border-slate-700"
                  )}>
                    {selectedNode.status.toUpperCase()}
                  </span>
                </div>

                <p className="text-slate-300 leading-relaxed mb-8">{selectedNode.desc}</p>

                <div className="space-y-3 mt-auto">
                  <h4 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-2">Available Actions</h4>
                  
                  <Button asChild variant="fantasy" className="w-full justify-start gap-3 relative overflow-hidden group">
                    <Link to={`/course/${selectedNode.id}`}>
                      <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
                      <Sparkles className="w-4 h-4" /> Start Course
                    </Link>
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50">
                    <BookOpen className="w-4 h-4 text-blue-400" /> Read Lore (Theory)
                  </Button>
                  
                  <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50">
                    <Code className="w-4 h-4 text-emerald-400" /> Code Trials
                  </Button>

                  <Button variant="outline" className="w-full justify-start gap-3 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50">
                    <ShieldAlert className="w-4 h-4 text-red-400" /> GitHub Evaluation
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
