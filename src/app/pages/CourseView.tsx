import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckCircle,
  Clock,
  Loader2,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Progress } from '../components/ui/progress';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { cn } from '../../lib/utils';
import { useCompleteLesson, useCourse, useCourseProgress, useEvaluateLesson } from '../../hooks';

function triggerCelebration() {
  confetti({
    particleCount: 120,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#34d399', '#fbbf24', '#60a5fa', '#a78bfa'],
  });
}

function estimateMinutes(markdown: string | null): number {
  if (!markdown) return 1;
  return Math.max(1, Math.ceil(markdown.split(/\s+/).length / 200));
}

export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const numericCourseId = Number(courseId);

  const { data: course, isLoading: courseLoading, error } = useCourse(courseId || '');
  const { data: progress } = useCourseProgress(courseId || '');
  const completeLesson = useCompleteLesson();
  const evaluateLesson = useEvaluateLesson();

  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    feedback: string;
    suggestions?: string;
    xp_earned: number;
  } | null>(null);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  const lessons = useMemo(
    () => (course ? [...course.lessons].sort((a, b) => a.sort_order - b.sort_order) : []),
    [course]
  );

  const resetTaskState = () => {
    setAnswer('');
    setEvaluationResult(null);
  };

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const completedLessonIds = new Set(
    (progress?.lessons ?? []).filter((lesson) => lesson.completed).map((lesson) => lesson.lesson_id)
  );

  const currentIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : 0;
  const progressPercentage = progress?.completion_percentage ?? 0;
  const estimatedMinutes = estimateMinutes(activeLesson?.content_markdown ?? null);

  const selectLesson = (lessonId: number) => {
    setActiveLessonId(lessonId);
    resetTaskState();
  };

  const handleEvaluate = async () => {
    if (!activeLesson || !numericCourseId) return;

    const result = await evaluateLesson.mutateAsync({
      course_id: numericCourseId,
      lesson_id: activeLesson.id,
      answer,
    });

    setEvaluationResult(result);
    if (result.is_correct) {
      triggerCelebration();
    }
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !numericCourseId) return;

    const result = await completeLesson.mutateAsync({
      lesson_id: activeLesson.id,
      course_id: numericCourseId,
      time_spent_seconds: estimatedMinutes * 60,
    });

    setXpEarned(result.xp_earned);
    setShowXpAnimation(true);
    triggerCelebration();
    window.setTimeout(() => setShowXpAnimation(false), 2500);
  };

  if (courseLoading) {
    return (
      <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[18rem_1fr] gap-6">
          <Skeleton className="h-full w-full" />
          <Skeleton className="h-full w-full" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center">
        <BookOpen className="w-16 h-16 text-muted-foreground/50 mb-4" />
        <h2 className="text-2xl font-bold text-foreground mb-2">Course Not Found</h2>
        <p className="text-muted-foreground mb-6">
          The course you are looking for does not exist or is still generating.
        </p>
        <Button asChild variant="fantasy">
          <Link to="/roadmap">Back to Roadmaps</Link>
        </Button>
      </div>
    );
  }

  if (course.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Generating Course</h2>
        <p className="text-muted-foreground max-w-md">
          The outline and lessons are still being forged. Stay here or come back in a moment.
        </p>
      </div>
    );
  }

  const canMarkComplete = !activeLesson?.task_type || evaluationResult?.is_correct;

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {showXpAnimation && (
        <div className="fixed inset-0 flex items-center justify-center pointer-events-none z-50">
          <div className="bg-gradient-to-r from-chart-1 to-chart-1/80 text-foreground px-8 py-6 rounded-2xl shadow-2xl text-center">
            <Trophy className="w-12 h-12 mx-auto mb-2" />
            <p className="text-3xl font-bold">+{xpEarned} XP</p>
            <p className="text-yellow-100">Lesson Completed!</p>
          </div>
        </div>
      )}

      <header className="shrink-0 border-b border-border bg-background/50 backdrop-blur-sm">
        <div className="px-6 py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-3">
            <Link to="/roadmap" className="hover:text-foreground transition-colors">
              Roadmaps
            </Link>
            <ChevronRight className="w-4 h-4" />
            <span className="text-foreground">{course.title}</span>
          </nav>

          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                asChild
                className="text-muted-foreground hover:text-foreground"
              >
                <Link to="/roadmap">
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  Back
                </Link>
              </Button>
              <div>
                <h1 className="text-xl font-bold text-foreground">{course.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {progress?.completed_lessons ?? 0}/{progress?.total_lessons ?? lessons.length} lessons
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-4 h-4 text-chart-1" />
                    {course.total_xp} XP
                  </span>
                </div>
              </div>
            </div>

            <div className="w-56">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-muted-foreground">Course Progress</span>
                <span className="text-primary font-medium">{progressPercentage}%</span>
              </div>
              <Progress value={progressPercentage} className="h-2 bg-secondary" />
            </div>
          </div>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-72 shrink-0 border-r border-border bg-background/30 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Target className="w-4 h-4 text-primary" />
              Course Content
            </h3>
          </div>
          <ScrollArea className="flex-1">
            <nav className="p-3 space-y-1">
              {lessons.map((lesson, index) => {
                const isActive = lesson.id === activeLesson?.id;
                const isCompleted = completedLessonIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => selectLesson(lesson.id)}
                    className={cn(
                      'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all border',
                      isActive
                        ? 'bg-primary/20 border-primary/30'
                        : 'hover:bg-secondary/50 border-transparent'
                    )}
                  >
                    <div className="mt-0.5">
                      {isCompleted ? (
                        <CheckCircle className="w-5 h-5 text-chart-2" />
                      ) : (
                        <div className="w-5 h-5 rounded-full border border-muted-foreground/50" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-foreground">
                        {index + 1}. {lesson.title}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {lesson.xp_reward} XP
                      </p>
                    </div>
                  </button>
                );
              })}
            </nav>
          </ScrollArea>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="max-w-3xl mx-auto p-8 space-y-6">
            {activeLesson ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-2">
                      <Badge variant="outline" className="text-xs border-border">
                        Lesson {currentIndex + 1} of {lessons.length}
                      </Badge>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        {estimatedMinutes} min read
                      </span>
                    </div>
                    <h2 className="text-3xl font-bold text-foreground">{activeLesson.title}</h2>
                  </div>
                  <Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30">
                    <Sparkles className="w-3 h-3 mr-1" />
                    {activeLesson.xp_reward} XP
                  </Badge>
                </div>

                <Separator className="bg-secondary" />

                <article className="prose prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {activeLesson.content_markdown ?? 'Lesson content is not available yet.'}
                  </ReactMarkdown>
                </article>

                {activeLesson.task_type && (
                  <div className="space-y-4 rounded-xl border border-border bg-card/50 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">Lesson Task</h3>
                        <p className="text-sm text-muted-foreground">
                          Type: <span className="capitalize">{activeLesson.task_type}</span>
                        </p>
                      </div>
                      <Badge variant="outline">{activeLesson.task_type}</Badge>
                    </div>

                    {activeLesson.task_content && (
                      <div className="rounded-lg border border-border bg-background/60 p-4 text-sm text-muted-foreground whitespace-pre-wrap">
                        {activeLesson.task_content}
                      </div>
                    )}

                    <Textarea
                      value={answer}
                      onChange={(event) => setAnswer(event.target.value)}
                      rows={activeLesson.task_type === 'project' ? 10 : 6}
                      placeholder={
                        activeLesson.task_type === 'coding'
                          ? 'Write your code solution or explanation here...'
                          : 'Write your answer here...'
                      }
                    />

                    <div className="flex items-center gap-3">
                      <Button
                        onClick={() => void handleEvaluate()}
                        disabled={evaluateLesson.isPending || !answer.trim()}
                      >
                        {evaluateLesson.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Evaluating...
                          </>
                        ) : (
                          'Evaluate Answer'
                        )}
                      </Button>
                      {evaluationResult?.is_correct && (
                        <span className="text-sm text-chart-2 font-medium">
                          Ready to mark complete
                        </span>
                      )}
                    </div>

                    {evaluationResult && (
                      <Alert
                        className={cn(
                          evaluationResult.is_correct
                            ? 'border-chart-2/40 bg-chart-2/10'
                            : 'border-destructive/40 bg-destructive/10'
                        )}
                      >
                        <AlertTitle>
                          {evaluationResult.is_correct ? 'Correct answer' : 'Needs revision'}
                        </AlertTitle>
                        <AlertDescription className="space-y-2">
                          <p>{evaluationResult.feedback}</p>
                          {evaluationResult.suggestions && (
                            <p className="text-sm text-muted-foreground">
                              {evaluationResult.suggestions}
                            </p>
                          )}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between pt-8 mt-8 border-t border-border">
                  <Button
                    variant="outline"
                    onClick={() =>
                      selectLesson(lessons[currentIndex - 1]?.id ?? activeLesson.id)
                    }
                    disabled={currentIndex <= 0}
                    className="border-border text-foreground hover:bg-secondary"
                  >
                    <ChevronLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>

                  <Button
                    onClick={() => void handleMarkComplete()}
                    disabled={completeLesson.isPending || !canMarkComplete}
                    className="bg-gradient-to-r from-chart-2 to-chart-2/80 hover:from-chart-2/90 hover:to-chart-2/70 text-foreground px-6"
                  >
                    {completeLesson.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        {canMarkComplete ? 'Mark Complete' : 'Complete Task First'}
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    onClick={() =>
                      selectLesson(lessons[currentIndex + 1]?.id ?? activeLesson.id)
                    }
                    disabled={currentIndex >= lessons.length - 1}
                    className="border-border text-foreground hover:bg-secondary"
                  >
                    Next
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-muted-foreground">No lessons have been generated for this course yet.</p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
