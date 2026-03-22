import { Link } from "react-router";
import { Compass, Database, Monitor, Server, Cloud, ChevronRight, Lock, Loader2 } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { Skeleton } from "../components/ui/skeleton";
import { useRoadmaps } from "../../hooks";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Cloud,
  Database,
};

const colorMap: Record<string, string> = {
  "from-orange-500 to-amber-500": "from-orange-500 to-amber-500",
  "from-emerald-600 to-green-500": "from-emerald-600 to-green-500",
  "from-orange-600 to-red-500": "from-orange-600 to-red-500",
  "from-purple-600 to-pink-500": "from-purple-600 to-pink-500",
  "from-blue-500 to-cyan-500": "from-blue-500 to-cyan-500",
  "from-green-500 to-emerald-500": "from-green-500 to-emerald-500",
  "from-purple-500 to-violet-500": "from-purple-500 to-violet-500",
};

export function RoadmapList() {
  const { data: roadmaps, isLoading, error } = useRoadmaps();

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Compass className="text-indigo-400 w-8 h-8" />
            The Grand Cartographer's Hall
          </h1>
          <p className="text-slate-400 text-lg">Choose your destiny. Which path will you walk today, adventurer?</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-900/40">
              <CardHeader className="flex flex-row items-start gap-4 space-y-0">
                <Skeleton className="w-14 h-14 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-2 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Compass className="w-16 h-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Roadmaps</h2>
        <p className="text-slate-400 mb-6">There was an error loading the roadmaps. Please try again.</p>
        <Button onClick={() => window.location.reload()} variant="fantasy">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
          <Compass className="text-indigo-400 w-8 h-8" />
          The Grand Cartographer's Hall
        </h1>
        <p className="text-slate-400 text-lg">Choose your destiny. Which path will you walk today, adventurer?</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {roadmaps?.map((roadmap) => {
          const Icon = (roadmap.icon ? iconMap[roadmap.icon] : null) || Compass;
          const colorClass = (roadmap.colors ? colorMap[roadmap.colors] : null) || "from-slate-600 to-slate-500";
          const nodeCount = roadmap.nodes?.length || 0;
          
          return (
            <Card 
              key={roadmap.id} 
              className="relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(99,102,241,0.3)] bg-slate-900/40 hover:bg-slate-800/60"
            >
              {/* Background Gradient Slash */}
              <div className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-[60px] bg-gradient-to-br ${colorClass} opacity-30 group-hover:opacity-50 transition-opacity`} />
              
              <CardHeader className="flex flex-row items-start gap-4 space-y-0 relative z-10">
                <div className={`w-14 h-14 rounded-xl flex items-center justify-center bg-slate-800 border border-slate-700 shadow-inner group-hover:scale-110 transition-transform bg-gradient-to-br ${colorClass} bg-opacity-10 text-white`}>
                  <Icon className="w-7 h-7" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-xl flex items-center justify-between">
                    <span className="text-slate-100">{roadmap.title}</span>
                    {roadmap.is_locked && <Lock className="w-4 h-4 text-slate-500" />}
                  </CardTitle>
                  <CardDescription className="mt-2 line-clamp-2 text-slate-400">{roadmap.description}</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 relative z-10">
                <div className="flex justify-between text-xs text-slate-500 font-medium tracking-wider uppercase">
                  <span>{nodeCount} Topics</span>
                  <span>0% Explored</span>
                </div>
                <Progress value={0} className="h-2" />
                
                <div className="pt-4 flex justify-end">
                  <Button asChild variant="fantasy" className="w-full justify-between group/btn">
                    <Link to={`/roadmap/${roadmap.id}`}>
                      Embark on Quest <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
