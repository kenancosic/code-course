import { useMemo } from 'react';
import { BookOpen, Compass, Play, ScrollText, Star, Swords, Trophy } from 'lucide-react';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import {
  useCourses,
  useProfile,
  useProgressSummary,
  useRoadmapProgress,
  useRoadmaps,
} from '../../hooks';

export function Home() {
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: progress, isLoading: progressLoading } = useProgressSummary();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: courses, isLoading: coursesLoading } = useCourses();

  const currentPathId = profile?.current_path?.id;
  const { data: currentPathProgress } = useRoadmapProgress(currentPathId ? String(currentPathId) : '');

  const currentPath = useMemo(
    () => roadmaps?.find((roadmap) => roadmap.id === currentPathId) ?? roadmaps?.[0] ?? null,
    [currentPathId, roadmaps]
  );

  const recentCourses = (courses ?? []).slice(0, 4);
  const hasRealCourses = recentCourses.length > 0;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-chart-2/20 text-chart-2 border border-chart-2/30">
            Ready
          </span>
        );
      case 'generating':
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-primary/20 text-primary border border-primary/30">
            Generating
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/20 text-destructive border border-destructive/30">
            Error
          </span>
        );
    }
  };

  const getCourseProgressValue = (status: string) => {
    if (status === 'ready') return 70;
    if (status === 'generating') return 35;
    return 8;
  };

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Trophy className="text-chart-1 w-8 h-8" />
            The Tavern
          </h1>
          <p className="max-w-2xl text-muted-foreground text-base sm:text-lg">
            Rest, review your progress, and jump back into the questline that matters most.
          </p>
        </div>
        <Button variant="outline" className="w-full sm:w-auto" asChild>
          <Link to="/roadmap">
            <Compass className="w-4 h-4 mr-2" />
            Open Questlines
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.95fr)]">
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardHeader className="space-y-4">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="space-y-2">
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <Compass className="text-primary" />
                  {profileLoading || roadmapsLoading ? (
                    <Skeleton className="h-6 w-52" />
                  ) : (
                    currentPath?.title ?? 'Choose Your Path'
                  )}
                </CardTitle>
                <CardDescription className="max-w-xl text-muted-foreground font-serif">
                  {profileLoading || roadmapsLoading ? (
                    <Skeleton className="h-4 w-72" />
                  ) : (
                    currentPath?.description ?? "Pick a questline in the Cartographer's Hall to begin."
                  )}
                </CardDescription>
              </div>
              <div className="rounded-xl border border-border bg-background/70 px-4 py-3 min-w-[12rem]">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                  Path Progress
                </p>
                <p className="mt-2 text-3xl font-bold text-primary">
                  {currentPathProgress?.completion_percentage ?? 0}%
                </p>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Current Objective
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground font-serif leading-snug">
                  {profileLoading ? (
                    <Skeleton className="h-6 w-36" />
                  ) : currentPath ? (
                    `Advance through ${currentPath.title}`
                  ) : (
                    'Choose your first questline'
                  )}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Total Lessons
                </p>
                <p className="mt-2 text-2xl font-bold text-chart-2">
                  {progressLoading ? <Skeleton className="h-7 w-16" /> : progress?.total_lessons_completed ?? 0}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Courses Started
                </p>
                <p className="mt-2 text-2xl font-bold text-chart-3">
                  {coursesLoading ? <Skeleton className="h-7 w-16" /> : courses?.length ?? 0}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button className="w-full sm:flex-1 gap-2" size="lg" asChild>
              <Link to={currentPath ? `/roadmap/${currentPath.id}` : '/roadmap'}>
                <Play className="w-4 h-4" />
                Continue Journey
              </Link>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" size="lg" asChild>
              <Link to="/practice">
                <Swords className="w-4 h-4 mr-2" />
                Train in the Arena
              </Link>
            </Button>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <Card className="border-border bg-card/50 backdrop-blur-md">
            <CardHeader className="pb-3 border-b border-border">
              <CardTitle className="text-lg flex items-center gap-2 text-foreground">
                <Star className="text-chart-1" />
                Hero Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <p className="text-sm font-serif italic text-muted-foreground">Level</p>
                  <p className="mt-2 text-2xl font-bold text-primary font-serif">
                    {profileLoading ? (
                      <Skeleton className="h-7 w-10" />
                    ) : (
                      progress?.current_level ?? profile?.level ?? 1
                    )}
                  </p>
                </div>
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-serif italic text-muted-foreground">XP to next</p>
                    <p className="text-sm font-medium text-chart-2 font-serif">
                      {progressLoading ? (
                        <Skeleton className="h-5 w-14" />
                      ) : (
                        progress?.xp_to_next_level ?? profile?.xp_to_next_level ?? 0
                      )}
                    </p>
                  </div>
                  <Progress value={progress?.level_progress_percentage ?? 0} className="h-2 mt-3" />
                </div>
              </div>

              <div className="rounded-xl border border-border bg-background/60 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Questline Tools
                </p>
                <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                  Searching paths and generating custom roadmap skillsets now lives in the
                  Cartographer&apos;s Hall so exploration and course setup happen in one place.
                </p>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link to="/roadmap">
                    <ScrollText className="w-4 h-4 mr-2" />
                    Open the Cartographer&apos;s Hall
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="text-primary" />
            My Quests
          </h2>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
            <Link to="/roadmap">Explore Roadmaps</Link>
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
            recentCourses.map((course) => (
              <Link key={course.id} to={`/course/${course.id}`} className="block h-full">
                <Card className="h-full hover:border-primary/50 transition-all cursor-pointer group bg-card/40 border-border hover:bg-card/60">
                  <CardContent className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 min-w-0">
                        {course.title}
                      </h4>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Lessons</span>
                        <span>{course.total_lessons}</span>
                      </div>
                      <Progress value={getCourseProgressValue(course.status)} className="h-2" />
                    </div>

                    <div className="flex items-center justify-between gap-3 pt-2">
                      <span className="text-xs text-chart-2 font-medium">{course.total_xp} XP</span>
                      {getStatusBadge(course.status)}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))
          ) : (
            <div className="col-span-full">
              <Card className="bg-card/40 border-border border-dashed">
                <CardContent className="p-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center border border-border">
                    <Compass className="text-muted-foreground w-8 h-8" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-lg font-medium text-foreground">No Active Quests</h3>
                    <p className="text-sm text-muted-foreground/80 max-w-md">
                      You haven&apos;t started any quests yet. Open the questline hall and build your
                      next course from there.
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
    </div>
  );
}
