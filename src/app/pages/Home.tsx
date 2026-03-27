import { Compass, Play, BookOpen, Star, Trophy, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router';
import { useMemo, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Progress } from '../components/ui/progress';
import { Skeleton } from '../components/ui/skeleton';
import { Input } from '../components/ui/input';
import {
  useCourses,
  useGenerateRoadmap,
  useProfile,
  useProgressSummary,
  useRoadmapProgress,
  useRoadmaps,
} from '../../hooks';

export function Home() {
  const navigate = useNavigate();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { data: progress, isLoading: progressLoading } = useProgressSummary();
  const { data: roadmaps, isLoading: roadmapsLoading } = useRoadmaps();
  const { data: courses, isLoading: coursesLoading } = useCourses();
  const generateRoadmap = useGenerateRoadmap();

  const [customTopic, setCustomTopic] = useState('');

  const currentPathId = profile?.current_path?.id;
  const { data: currentPathProgress } = useRoadmapProgress(currentPathId ? String(currentPathId) : '');

  const currentPath = useMemo(
    () => roadmaps?.find((roadmap) => roadmap.id === currentPathId) ?? roadmaps?.[0] ?? null,
    [currentPathId, roadmaps]
  );

  const recentCourses = (courses ?? []).slice(0, 4);
  const hasRealCourses = recentCourses.length > 0;

  const handleGeneratePath = async () => {
    if (!customTopic.trim()) return;
    const roadmap = await generateRoadmap.mutateAsync(customTopic.trim());
    navigate(`/roadmap/${roadmap.id}`);
  };

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

  return (
    <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-foreground mb-2 tracking-tight flex items-center gap-3">
            <Trophy className="text-chart-1 w-8 h-8" />
            The Tavern
          </h1>
          <p className="text-muted-foreground text-lg">
            Rest, review your stats, and prepare for your next quest.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-3 border-border bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="text-primary w-5 h-5" />
              Generate Custom Path
            </CardTitle>
            <CardDescription className="text-muted-foreground font-serif">
              Enter a topic to generate an AI-driven roadmap tailored to your interests.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="e.g. Machine Learning, Rust Programming..."
                value={customTopic}
                onChange={(e) => setCustomTopic(e.target.value)}
                disabled={generateRoadmap.isPending}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleGeneratePath();
                  }
                }}
              />
              <Button
                onClick={() => void handleGeneratePath()}
                disabled={generateRoadmap.isPending || !customTopic.trim()}
                className="whitespace-nowrap w-full sm:w-auto"
              >
                {generateRoadmap.isPending ? 'Generating...' : 'Generate Custom Path'}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 border-border bg-card/50 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-foreground">
              <Compass className="text-primary" />
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-6 w-48" />
              ) : (
                currentPath?.title ?? 'Choose Your Path'
              )}
            </CardTitle>
            <CardDescription className="text-muted-foreground font-serif">
              {profileLoading || roadmapsLoading ? (
                <Skeleton className="h-4 w-64 mt-2" />
              ) : (
                currentPath?.description ?? 'Start your journey today'
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-background/80 p-5 rounded-sm border border-border flex justify-between items-center shadow-inner">
              <div className="space-y-1">
                <p className="text-sm font-serif font-medium text-muted-foreground uppercase tracking-wider">
                  Current Objective
                </p>
                <p className="font-bold text-foreground font-serif text-lg tracking-wide">
                  {profileLoading ? (
                    <Skeleton className="h-6 w-32 inline-block" />
                  ) : currentPath ? (
                    `Advance through ${currentPath.title}`
                  ) : (
                    'Choose your first path'
                  )}
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-primary font-serif">
                  {currentPathProgress?.completion_percentage ?? 0}%
                </p>
                <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                  Path Progress
                </p>
              </div>
            </div>
            <Button className="w-full mt-6 gap-2" size="lg" variant="default" asChild>
              <Link to={currentPath ? `/roadmap/${currentPath.id}` : '/roadmap'}>
                <Play className="w-4 h-4" /> Continue Journey
              </Link>
            </Button>
          </CardContent>
        </Card>

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
                {profileLoading ? (
                  <Skeleton className="h-6 w-8 inline-block" />
                ) : (
                  progress?.current_level ?? profile?.level ?? 1
                )}
              </span>
            </div>
            <div className="flex flex-col gap-2 p-3 bg-background/50 rounded-sm border border-border">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground font-serif italic">XP to next</span>
                <span className="text-chart-2 font-medium font-serif">
                  {progressLoading ? (
                    <Skeleton className="h-5 w-12 inline-block" />
                  ) : (
                    progress?.xp_to_next_level ?? profile?.xp_to_next_level ?? 0
                  )}
                </span>
              </div>
              <Progress
                value={progress?.level_progress_percentage ?? 0}
                className="h-1.5"
              />
            </div>
            <div className="flex justify-between items-center p-3 bg-background/50 rounded-sm border border-border">
              <span className="text-muted-foreground font-serif italic">Quests Completed</span>
              <span className="text-chart-1 font-medium font-serif">
                {profileLoading ? (
                  <Skeleton className="h-5 w-8 inline-block" />
                ) : (
                  progress?.total_lessons_completed ?? profile?.quests_completed ?? 0
                )}
              </span>
            </div>

            <Button variant="outline" className="w-full mt-2" asChild>
              <Link to="/profile">View Full Character Sheet</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-foreground flex items-center gap-2">
            <BookOpen className="text-primary" />
            My Quests
          </h2>
          <Button variant="outline" size="sm" asChild>
            <Link to="/roadmap">Explore Roadmaps</Link>
          </Button>
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
            recentCourses.map((course) => (
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
                        <span>Lessons</span>
                        <span>{course.total_lessons}</span>
                      </div>
                      <Progress value={course.status === 'ready' ? 100 : 40} className="h-2" />
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
    </div>
  );
}
