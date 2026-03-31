import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  BookOpen,
  ChevronRight,
  Cloud,
  Compass,
  Database,
  Monitor,
  Search,
  Server,
  Target,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import { CustomPathGenerator } from '../components/CustomPathGenerator';
import {
  useCourses,
  useProfile,
  useRoadmapProgresses,
  useRoadmaps,
  type RoadmapProgress,
} from '../../hooks';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Monitor,
  Server,
  Cloud,
  Database,
};

const colorMap: Record<string, string> = {
  'from-orange-500 to-amber-500': 'from-chart-1 to-chart-1/80',
  'from-emerald-600 to-green-500': 'from-chart-2 to-chart-2/80',
  'from-orange-600 to-red-500': 'from-destructive to-destructive/80',
  'from-purple-600 to-pink-500': 'from-chart-4 to-chart-4/80',
  'from-blue-500 to-cyan-500': 'from-chart-3 to-chart-3/80',
  'from-green-500 to-emerald-500': 'from-chart-2 to-chart-2/80',
  'from-purple-500 to-violet-500': 'from-primary to-primary/80',
};

export function RoadmapList() {
  const { data: roadmaps, isLoading, error } = useRoadmaps();
  const { data: profile } = useProfile();
  const { data: courses } = useCourses();

  const [query, setQuery] = useState('');

  const currentPathId = profile?.current_path?.id;
  const pathIds = useMemo(() => (roadmaps ?? []).map((roadmap) => roadmap.id), [roadmaps]);
  const roadmapProgressQueries = useRoadmapProgresses(pathIds);

  const roadmapProgressById = useMemo(() => {
    return pathIds.reduce<Map<number, RoadmapProgress>>((map, pathId, index) => {
      const progress = roadmapProgressQueries[index]?.data;
      if (progress) {
        map.set(pathId, progress);
      }
      return map;
    }, new Map());
  }, [pathIds, roadmapProgressQueries]);

  const roadmapProgressLoadingById = useMemo(() => {
    return pathIds.reduce<Map<number, boolean>>((map, pathId, index) => {
      map.set(pathId, roadmapProgressQueries[index]?.isLoading ?? false);
      return map;
    }, new Map());
  }, [pathIds, roadmapProgressQueries]);

  const filteredRoadmaps = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return roadmaps ?? [];

    return (roadmaps ?? []).filter((roadmap) => {
      const searchable = [
        roadmap.title,
        roadmap.description ?? '',
        ...(roadmap.nodes?.map((node) => node.topic.title) ?? []),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedQuery);
    });
  }, [query, roadmaps]);

  const currentPath = useMemo(
    () => roadmaps?.find((roadmap) => roadmap.id === currentPathId) ?? null,
    [currentPathId, roadmaps]
  );

  const totalCustomPaths = (roadmaps ?? []).filter((roadmap) => roadmap.is_custom).length;
  const activeCourseCount = (courses ?? []).filter((course) => course.status !== 'error').length;
  const currentPathProgress = currentPathId ? roadmapProgressById.get(currentPathId) : undefined;
  const isCurrentPathProgressLoading = currentPathId
    ? (roadmapProgressLoadingById.get(currentPathId) ?? false)
    : false;

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight flex items-center gap-3">
            <Compass className="text-primary w-8 h-8" />
            The Grand Cartographer&apos;s Hall
          </h1>
          <p className="text-muted-foreground text-lg">
            Choose your destiny. Which path will you walk today, adventurer?
          </p>
        </div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
          {[1, 2].map((i) => (
            <Card key={i} className="bg-card/40 border-border">
              <CardHeader className="space-y-3">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-card/40">
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
        <h2 className="text-2xl font-bold text-foreground mb-2">Failed to Load Roadmaps</h2>
        <p className="text-muted-foreground mb-6">
          There was an error loading the roadmaps. Please try again.
        </p>
        <Button onClick={() => window.location.reload()} variant="fantasy">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl sm:text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Compass className="text-primary w-8 h-8" />
            The Grand Cartographer&apos;s Hall
          </h1>
          <p className="max-w-3xl text-muted-foreground text-base sm:text-lg">
            Search existing questlines, explore any topic in the order that works for you, or
            forge a brand-new roadmap when the built-in paths are not enough.
          </p>
        </div>

        {currentPath && (
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link to={`/roadmap/${currentPath.id}`}>
              <Target className="w-4 h-4 mr-2" />
              Continue {currentPath.title}
            </Link>
          </Button>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)]">
        <Card className="border-border bg-card/50 backdrop-blur-md">
          <CardHeader className="space-y-4">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2 text-foreground">
                <Search className="text-chart-3 w-5 h-5" />
                Search Questlines
              </CardTitle>
              <CardDescription className="text-muted-foreground font-serif">
                Filter by roadmap title, description, or any topic already attached to a path.
              </CardDescription>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search roadmaps, topics, or learning directions..."
                className="pl-10"
              />
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Available Paths
                </p>
                <p className="mt-2 text-2xl font-bold text-foreground">{roadmaps?.length ?? 0}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Custom Paths
                </p>
                <p className="mt-2 text-2xl font-bold text-primary">{totalCustomPaths}</p>
              </div>
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Active Courses
                </p>
                <p className="mt-2 text-2xl font-bold text-chart-2">{activeCourseCount}</p>
              </div>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-background/60 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">
                    {query.trim()
                      ? `${filteredRoadmaps.length} questline${filteredRoadmaps.length === 1 ? '' : 's'} found`
                      : 'Browsing the full questline library'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Locked progression has been relaxed here, so you can jump into deeper topics
                    without the UI blocking you.
                  </p>
                </div>
                {currentPath && (
                  <Badge variant="outline" className="w-fit border-primary/40 text-primary">
                    Current Focus: {currentPath.title}
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6">
          <CustomPathGenerator
            className="border-border bg-card/50 backdrop-blur-md"
            title="Forge a Custom Questline"
            description="Generate a new roadmap for a niche skill, a deep-dive track, or a topic that does not exist in the current library yet."
          />

          <Card className="border-border bg-card/50 backdrop-blur-md">
            <CardContent className="space-y-4 pt-6">
              <div className="rounded-xl border border-border bg-background/70 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground font-semibold">
                  Current Focus
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground font-serif leading-snug">
                  {currentPath?.title ?? 'No questline selected yet'}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {currentPath
                    ? isCurrentPathProgressLoading
                      ? 'Loading current progress...'
                      : `${currentPathProgress?.completion_percentage ?? 0}% explored`
                    : 'Pick a path below to set your next direction.'}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {filteredRoadmaps.length === 0 ? (
        <Card className="border-dashed border-border bg-card/40">
          <CardContent className="p-8 text-center space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full border border-border bg-secondary/50 flex items-center justify-center">
              <Search className="w-6 h-6 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-xl font-semibold text-foreground">No matching questlines</h2>
              <p className="text-muted-foreground">
                Try a broader search term or forge a custom path for the exact skillset you want.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredRoadmaps.map((roadmap) => {
            const Icon = (roadmap.icon ? iconMap[roadmap.icon] : null) || Compass;
            const colorClass =
              (roadmap.colors ? colorMap[roadmap.colors] : null) || 'from-muted to-muted-foreground';
            const nodeCount = roadmap.nodes?.length || 0;
            const roadmapCourseCount = (courses ?? []).filter((course) =>
              roadmap.nodes?.some((node) => node.topic_id === course.topic_id)
            ).length;
            const isCurrentFocus = roadmap.id === currentPathId;
            const roadmapProgress = roadmapProgressById.get(roadmap.id);
            const isRoadmapProgressLoading = roadmapProgressLoadingById.get(roadmap.id) ?? false;
            const completionPercentage = roadmapProgress?.completion_percentage ?? 0;

            return (
              <Card
                key={roadmap.id}
                className="relative overflow-hidden group transition-all duration-300 hover:-translate-y-1 hover:shadow-lg bg-card/40 hover:bg-card/60 border-border"
              >
                <div
                  className={`absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full blur-[60px] bg-gradient-to-br ${colorClass} opacity-30 group-hover:opacity-50 transition-opacity`}
                />

                <CardHeader className="relative z-10 flex flex-row items-start gap-4 space-y-0">
                  <div
                    className={`w-14 h-14 rounded-xl flex items-center justify-center border border-border shadow-inner bg-gradient-to-br ${colorClass} text-foreground shrink-0`}
                  >
                    <Icon className="w-7 h-7" />
                  </div>
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-xl text-foreground">{roadmap.title}</CardTitle>
                      {isCurrentFocus && (
                        <Badge variant="outline" className="border-primary/40 text-primary">
                          Current Focus
                        </Badge>
                      )}
                      {roadmap.is_custom && (
                        <Badge variant="outline" className="border-chart-3/40 text-chart-3">
                          Custom
                        </Badge>
                      )}
                    </div>
                    <CardDescription className="line-clamp-3 text-muted-foreground">
                      {roadmap.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent className="relative z-10 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                        Topics
                      </p>
                      <p className="mt-2 text-lg font-semibold text-foreground">{nodeCount}</p>
                    </div>
                    <div className="rounded-lg border border-border bg-background/60 p-3">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground font-semibold">
                        Courses
                      </p>
                      <p className="mt-2 text-lg font-semibold text-chart-2">{roadmapCourseCount}</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{isCurrentFocus ? 'Current path progress' : 'Path progress'}</span>
                      {isRoadmapProgressLoading ? (
                        <Skeleton className="h-4 w-12" />
                      ) : (
                        <span>{completionPercentage}%</span>
                      )}
                    </div>
                    {isRoadmapProgressLoading ? (
                      <Skeleton className="h-2 w-full" />
                    ) : (
                      <Progress value={completionPercentage} className="h-2" />
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <Button asChild variant="fantasy" className="w-full justify-between group/btn">
                      <Link to={`/roadmap/${roadmap.id}`}>
                        <span className="flex items-center gap-2">
                          {roadmapCourseCount > 0 ? (
                            <>
                              <BookOpen className="w-4 h-4" /> Continue Exploring
                            </>
                          ) : (
                            <>
                              <Target className="w-4 h-4" /> Explore Path
                            </>
                          )}
                        </span>
                        <ChevronRight className="w-4 h-4 ml-2 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
