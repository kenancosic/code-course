import { Compass, Play, BookOpen, Star, Trophy, Scroll } from "lucide-react";
import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { Progress } from "../components/ui/Progress";
import { Skeleton } from "../components/ui/skeleton";
import { useProfile, useRoadmaps, useProgressSummary, useCourses } from "../../hooks";

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string;
  preferences: {
    emailNotifications: boolean;
    publicProfile: boolean;
  };
  level?: number;
  xp_to_next_level?: number;
  quests_completed?: number;
  current_path?: string;
  current_path_progress?: number;
  current_roadmap_id?: string;
  current_node_id?: string;
}

export function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile() as { data: Profile | undefined; isLoading: boolean };
  const { data: progress, isLoading: progressLoading } = useProgressSummary();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const recentCourses = courses?.slice(0, 4) || [];

  const currentPath = profile?.current_path || roadmaps?.[0]?.title || "Choose Your Path";
  const currentPathDescription = roadmaps?.[0]?.description || "Start your journey today";
  const pathProgress = profile?.current_path_progress || 0;
  const continueLink = profile?.current_roadmap_id 
    ? `/roadmap/${profile.current_roadmap_id}` 
    : "/roadmap";

  const level = profile?.level ?? 1;
  const xpToNext = profile?.xp_to_next_level ?? 1000;
  const questsCompleted = profile?.quests_completed ?? 0;

  const totalXp = progress?.total_xp ?? 0;
  const xpToNextLevel = progress?.xp_to_next_level ?? xpToNext;
  const currentLevelXp = progress?.current_level_xp ?? 0;
  const progressPercentage = xpToNextLevel > 0 
    ? Math.round(((totalXp - currentLevelXp) / xpToNextLevel) * 100)
    : 0;

  const getStatusBadge = (status: string) => {
    const statusLower = status.toLowerCase();
    if (statusLower === "completed") {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
        In Progress
      </span>
    );
  };

  const getCourseProgress = (course: { status: string; total_lessons: number }) => {
    if (course.status.toLowerCase() === "completed") {
      return { completed: course.total_lessons, percentage: 100 };
    }
    return { completed: 0, percentage: 0 };
  };

  const hasRealCourses = recentCourses.length > 0;

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
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                currentPath
              )}
            </CardTitle>
            <CardDescription>
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-4 w-64 mt-1" />
              ) : (
                currentPathDescription
              )}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-slate-300">
                <span>Progress: {progressLoading ? <Skeleton className="h-4 w-8 inline-block" /> : `${progressPercentage}%`}</span>
                <span>{pathProgress > 0 ? "Continue your journey" : "Begin your journey"}</span>
              </div>
              <Progress value={progressPercentage} className="h-3" />
            </div>
            
            <div className="bg-slate-900/60 p-4 rounded-md border border-slate-800 flex justify-between items-center">
              <div>
                <h4 className="font-medium text-slate-200">
                  {profileLoading ? <Skeleton className="h-5 w-32" /> : (profile?.current_path ? "Continue Learning" : "Start Learning")}
                </h4>
                <p className="text-sm text-slate-500">
                  {profileLoading ? <Skeleton className="h-4 w-48 mt-1" /> : (profile?.current_path ? "Resume where you left off." : "Explore available roadmaps and begin your quest.")}
                </p>
              </div>
              <Button variant="fantasy" size="sm" className="gap-2 shrink-0" asChild>
                <Link to={continueLink}>
                  <Play className="w-4 h-4" /> {profile?.current_path ? "Continue" : "Explore"}
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
                {profileLoading ? <Skeleton className="h-7 w-8 inline-block" /> : level}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <span className="text-slate-300">XP to next</span>
              <span className="text-emerald-400 font-medium">
                {profileLoading ? <Skeleton className="h-5 w-16 inline-block" /> : xpToNext.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-slate-900/40 rounded-lg border border-slate-800/50">
              <span className="text-slate-300">Quests Completed</span>
              <span className="text-blue-400 font-medium">
                {profileLoading ? <Skeleton className="h-5 w-8 inline-block" /> : questsCompleted}
              </span>
            </div>
            
            <Button variant="outline" className="w-full mt-2" asChild>
               <Link to="/profile">View Full Character Sheet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Quests Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-200 flex items-center gap-2">
            <BookOpen className="text-indigo-400" />
            My Quests
          </h2>
          {hasRealCourses && (
            <Button variant="outline" size="sm" asChild>
              <Link to="/courses">View All</Link>
            </Button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {coursesLoading ? (
            [1, 2, 3, 4].map((i) => (
              <Card key={i} className="bg-slate-900/40 border-slate-800">
                <CardContent className="p-5 space-y-4">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : hasRealCourses ? (
            recentCourses.map((course) => {
              const courseProgress = getCourseProgress(course);
              return (
                <Link key={course.id} to={`/course/${course.id}`} className="block">
                  <Card className="h-full hover:border-indigo-500/50 transition-all cursor-pointer group bg-slate-900/40 border-slate-800 hover:bg-slate-900/60">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors line-clamp-2">
                          {course.title}
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-400">
                          <span>Progress</span>
                          <span>{courseProgress.completed}/{course.total_lessons} lessons</span>
                        </div>
                        <Progress value={courseProgress.percentage} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-emerald-400 font-medium">
                          {course.total_xp} XP
                        </span>
                        {getStatusBadge(course.status)}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })
          ) : (
            <div className="col-span-full">
              <Card className="bg-slate-900/40 border-slate-800 border-dashed">
                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-slate-800/50 flex items-center justify-center border border-slate-700">
                    <Compass className="text-slate-400 w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-slate-300">No Active Quests</h3>
                    <p className="text-sm text-slate-500 max-w-md">
                      You haven&apos;t started any quests yet. Choose a path and begin your journey!
                    </p>
                  </div>
                  <Button variant="fantasy" className="mt-2" asChild>
                    <Link to="/roadmap">Explore Roadmaps</Link>
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Grimoire Section - Only show placeholder content if no real courses */}
      {!hasRealCourses && (
        <>
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
            ) : (
              roadmaps?.flatMap(r => r.courses || []).slice(0, 4).map((course) => (
                <Card key={course.id} className="hover:border-indigo-500/50 transition-colors cursor-pointer group bg-slate-900/40">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-slate-700">
                       <Scroll className="text-amber-200 w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-slate-200 group-hover:text-indigo-300 transition-colors">{course.title}</h4>
                      <p className="text-xs text-slate-500 mt-1">{course.total_lessons} lessons • {course.total_xp} XP</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
