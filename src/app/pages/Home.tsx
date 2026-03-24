import { Compass, Play, BookOpen, Star, Trophy, Scroll } from "lucide-react";
import { Link } from "react-router";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Progress } from "../components/ui/progress";
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
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-chart-2/20 text-chart-2 border border-chart-2/30">
          Completed
        </span>
      );
    }
    return (
      <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
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
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight flex items-center gap-3">
            <Trophy className="text-chart-1 w-8 h-8" />
            The Tavern
          </h1>
          <p className="text-muted-foreground text-lg">Rest, review your stats, and prepare for your next quest.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Current Quest Widget */}
        <Card className="md:col-span-2 border-border bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Compass className="text-primary" />
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                currentPath
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-serif">
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-4 w-64 mt-2" />
              ) : (
                currentPathDescription
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background/80 p-5 rounded-sm border border-border flex justify-between items-center shadow-inner">
              <div className="space-y-1">
                <p className="text-sm font-serif font-medium text-muted-foreground uppercase tracking-wider">Current Objective</p>
                <p className="font-bold text-foreground font-serif text-lg tracking-wide">
                  {profileLoading ? <Skeleton className="h-6 w-32 inline-block" /> : "Complete basic training"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary font-serif">{pathProgress}%</p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Path Progress</p>
              </div>
            </div>
            <Button className="w-full mt-6 gap-2" size="lg" variant="default" asChild>
              <Link to={continueLink}>
                <Play className="w-4 h-4" /> Continue Journey
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Quick Stats Widget */}
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardHeader className="pb-2 border-b border-border">
            <CardTitle className="text-lg flex items-center gap-2 text-foreground">
              <Star className="text-chart-1" />
              Hero Stats
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            <div className="flex justify-between items-center p-3 bg-background/50 rounded-sm border border-border">
              <span className="text-muted-foreground font-serif italic">Level</span>
              <span className="text-primary font-bold text-lg font-serif">
                {profileLoading ? <Skeleton className="h-6 w-8 inline-block" /> : level}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3 bg-background/50 rounded-sm border border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-serif italic">XP to next</span>
                <span className="text-chart-2 font-medium font-serif">
                  {progressLoading ? <Skeleton className="h-5 w-12 inline-block" /> : xpToNextLevel}
                </span>
              </div>
              <Progress value={progressPercentage} className="h-1.5" />
            </div>
            <div className="flex justify-between items-center p-3 bg-background/50 rounded-sm border border-border">
              <span className="text-muted-foreground font-serif italic">Quests Completed</span>
              <span className="text-chart-1 font-medium font-serif">
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
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="text-primary" />
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
              <Card key={i} className="bg-card/40 border-border">
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
                  <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group bg-card/40 border-border hover:bg-card/60">
                    <CardContent className="p-5 space-y-4">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                          {course.title}
                        </h4>
                      </div>
                      
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Progress</span>
                          <span>{courseProgress.completed}/{course.total_lessons} lessons</span>
                        </div>
                        <Progress value={courseProgress.percentage} className="h-2" />
                      </div>
                      
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs text-chart-2 font-medium">
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
              <Card className="bg-card/40 border-border border-dashed">
                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                    <Compass className="text-muted-foreground w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-foreground">No Active Quests</h3>
                    <p className="text-sm text-muted-foreground/70 max-w-md">
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
          <h2 className="text-2xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
            <BookOpen className="text-chart-1" />
            Grimoire (Recent Artifacts)
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {roadmapsLoading ? (
              [1, 2, 3, 4].map((i) => (
                <Card key={i} className="bg-card/40">
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
                <Card key={course.id} className="hover:border-primary/50 transition-colors cursor-pointer group bg-card/40">
                  <CardContent className="p-5 flex flex-col items-center text-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center group-hover:scale-110 transition-transform shadow-[0_0_10px_rgba(0,0,0,0.5)] border border-border">
                       <Scroll className="text-chart-1/70 w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors">{course.title}</h4>
                      <p className="text-xs text-muted-foreground/70 mt-1">{course.total_lessons} lessons • {course.total_xp} XP</p>
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
