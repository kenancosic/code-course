import { Compass, Play, BookOpen, Star, Trophy, Scroll } from "lucide-react";
import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { Skeleton } from "../components/ui/skeleton";
import { useProfile, useRoadmaps } from "../../hooks";

export function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();

  const recentCourses = roadmaps?.flatMap(r => r.courses || []).slice(0, 4) || [];

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight flex items-center gap-3">
            <Trophy className="text-yellow-400 w-8 h-8" />
            The Tavern
          </h1>
          <p className="text-slate-400 text-lg">Rest, review your stats, and prepare for your next quest.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Quest Widget */}
        <Card className="md:col-span-2 border-indigo-500/30 bg-indigo-950/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-100">
              <Compass className="text-indigo-400" />
              {roadmapsLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                roadmaps?.[0]?.title || "Choose Your Path"
              )}
            </CardTitle>
            <CardDescription>
              {roadmapsLoading ? (
                <Skeleton className="h-4 w-64 mt-1" />
              ) : (
                roadmaps?.[0]?.description || "Start your journey today"
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Progress: 0%</span>
                <span>Begin your journey</span>
              </div>
              <Progress value={0} className="h-3" />
            </div>
            
            <div className="bg-slate-900/60 p-4 rounded-md border border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="font-medium text-slate-200">
                  {roadmapsLoading ? <Skeleton className="h-5 w-32" /> : "Start Learning"}
                </h4>
                <p className="text-sm text-slate-500">
                  {roadmapsLoading ? <Skeleton className="h-4 w-48 mt-1" /> : "Explore available roadmaps and begin your quest."}
                </p>
              </div>
              <Button variant="fantasy" size="sm" className="gap-2 shrink-0" asChild>
                <Link to="/roadmap">
                  <Play className="w-4 h-4" /> Explore
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats Widget */}
        <Card className="border-purple-500/30 bg-purple-950/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-purple-100">
              <Star className="text-yellow-400 fill-yellow-400" />
              Hero Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <span className="text-slate-300">Level</span>
              <span className="text-xl font-bold text-purple-300">
                {profileLoading ? <Skeleton className="h-7 w-8 inline-block" /> : "1"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <span className="text-slate-300">XP to next</span>
              <span className="text-emerald-400 font-medium">
                {profileLoading ? <Skeleton className="h-5 w-16 inline-block" /> : "1,000"}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <span className="text-slate-300">Quests Completed</span>
              <span className="text-blue-400 font-medium">
                {profileLoading ? <Skeleton className="h-5 w-8 inline-block" /> : "0"}
              </span>
            </div>
            
            <Button variant="outline" className="w-full mt-2" asChild>
               <Link to="/profile">View Full Character Sheet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <h2 className="text-2xl font-semibold text-slate-200 mt-8 mb-4 flex items-center gap-2">
        <BookOpen className="text-amber-500" />
        Grimoire (Recent Artifacts)
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {roadmapsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-900/40">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-24 mx-auto" />
                  <Skeleton className="h-3 w-16 mx-auto" />
                </div>
              </CardContent>
            </Card>
          ))
        ) : recentCourses.length > 0 ? (
          recentCourses.map((courseId, i) => (
            <Card key={courseId} className="hover:border-indigo-500/50 transition-colors cursor-pointer group bg-slate-900/40">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-slate-700">
                   <Scroll className="text-amber-200 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">Course {i + 1}</h4>
                  <p className="text-xs text-slate-500 mt-1">Ready to start</p>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          [1, 2, 3, 4].map((i) => (
            <Card key={i} className="hover:border-indigo-500/50 transition-colors cursor-pointer group bg-slate-900/40">
              <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-slate-700">
                   <Scroll className="text-amber-200 w-6 h-6" />
                </div>
                <div>
                  <h4 className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">Course Fragment {i}</h4>
                  <p className="text-xs text-slate-500 mt-1">Generated 2 days ago</p>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
