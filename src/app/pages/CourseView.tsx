import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import confetti from 'canvas-confetti';
import { ArrowLeft, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Sparkles, Target, Trophy } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import { LearningWorkspace } from '../../features/workspace/LearningWorkspace';
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
  const { data: course, isLoading, error } = useCourse(courseId || '');
  const { data: progress } = useCourseProgress(courseId || '');
  const completeLesson = useCompleteLesson();
  const evaluateLesson = useEvaluateLesson();
  const courseProgress = course?.user_progress;

  const lessons = useMemo(
    () => (course ? [...course.lessons].sort((a, b) => a.sort_order - b.sort_order) : []),
    [course]
  );
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [answer, setAnswer] = useState('');
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    feedback: string;
    suggestions?: string;
    xp_earned: number;
  } | null>(null);

  const activeLesson = lessons.find((lesson) => lesson.id === activeLessonId) ?? lessons[0];
  const completedLessonIds = new Set((progress?.lessons ?? []).filter((lesson) => lesson.completed).map((lesson) => lesson.lesson_id));
  const currentIndex = activeLesson ? lessons.findIndex((lesson) => lesson.id === activeLesson.id) : 0;
  const estimatedMinutes = estimateMinutes(activeLesson?.content_markdown ?? null);
  const progressPercentage = courseProgress?.completion_percentage ?? progress?.completion_percentage ?? 0;
  const completedLessonsCount = courseProgress?.completed_lessons ?? progress?.completed_lessons ?? 0;

  const selectLesson = (lessonId: number) => {
    setActiveLessonId(lessonId);
    setAnswer('');
    setEvaluationResult(null);
  };

  const handleEvaluate = async () => {
    if (!activeLesson || !course) return;
    const result = await evaluateLesson.mutateAsync({
      course_id: course.id,
      lesson_id: activeLesson.id,
      answer,
    });
    setEvaluationResult(result);
    if (result.is_correct) triggerCelebration();
  };

  const handleMarkComplete = async () => {
    if (!activeLesson || !course) return;
    const result = await completeLesson.mutateAsync({
      lesson_id: activeLesson.id,
      course_id: course.id,
      time_spent_seconds: estimatedMinutes * 60,
    });
    setEvaluationResult((current) => current ?? { is_correct: true, feedback: 'Marked complete.', xp_earned: result.xp_earned });
    triggerCelebration();
  };

  if (isLoading) {
    return (
      <div className="grid h-full min-h-0 gap-4 overflow-hidden">
        <Skeleton className="h-24 w-full rounded-2xl" />
        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]">
          <Skeleton className="h-full rounded-2xl" />
          <Skeleton className="h-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card/35 p-8 text-center">
        <BookOpen className="h-16 w-16 text-muted-foreground/50" />
        <h2 className="text-2xl font-bold text-foreground">Course Not Found</h2>
        <p className="text-muted-foreground">The course you are looking for does not exist or is still generating.</p>
        <Button asChild variant="fantasy">
          <Link to="/roadmap"><ArrowLeft className="mr-2 h-4 w-4" />Back to Roadmaps</Link>
        </Button>
      </div>
    );
  }

  if (course.status === 'generating') {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card/35 p-8 text-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Generating Course</h2>
        <p className="max-w-md text-muted-foreground">The outline and lessons are still being forged. Stay here or come back in a moment.</p>
      </div>
    );
  }

  const canMarkComplete = !activeLesson?.task_type || evaluationResult?.is_correct;

  const lessonRail = (
    <div className="space-y-2 p-3">
      {lessons.map((lesson, index) => {
        const isActive = lesson.id === activeLesson?.id;
        const isCompleted = completedLessonIds.has(lesson.id);
        return (
          <button
            key={lesson.id}
            onClick={() => selectLesson(lesson.id)}
            className={cn(
              'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
              isActive ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-background/35 hover:bg-background/55'
            )}
          >
            <div className="mt-0.5">{isCompleted ? <CheckCircle2 className="h-5 w-5 text-chart-2" /> : <div className="h-5 w-5 rounded-full border border-muted-foreground/50" />}</div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium text-sm text-foreground">{index + 1}. {lesson.title}</p>
              <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground"><Sparkles className="h-3 w-3" />{lesson.xp_reward} XP</p>
            </div>
          </button>
        );
      })}
    </div>
  );

  const instruction = activeLesson ? (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-muted-foreground/70">
            <Badge variant="outline" className="text-xs border-border">Lesson {currentIndex + 1} of {lessons.length}</Badge>
            <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{estimatedMinutes} min read</span>
          </div>
          <h2 className="text-3xl font-bold text-foreground">{activeLesson.title}</h2>
        </div>
        <Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30"><Trophy className="mr-1 h-3 w-3" />{activeLesson.xp_reward} XP</Badge>
      </div>

      <Separator className="bg-secondary" />

      <article className="prose prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
          {activeLesson.content_markdown ?? 'Lesson content is not available yet.'}
        </ReactMarkdown>
      </article>

      {activeLesson.task_type ? (
        <div className="space-y-4 rounded-2xl border border-border/70 bg-card/50 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-foreground">Lesson Task</h3>
              <p className="text-sm text-muted-foreground">Type: <span className="capitalize">{activeLesson.task_type}</span></p>
            </div>
            <Badge variant="outline">{activeLesson.task_type}</Badge>
          </div>

          {activeLesson.task_content ? <div className="rounded-xl border border-border/70 bg-background/60 p-4 text-sm text-muted-foreground whitespace-pre-wrap">{activeLesson.task_content}</div> : null}

          <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} rows={activeLesson.task_type === 'project' ? 10 : 6} placeholder={activeLesson.task_type === 'coding' ? 'Write your code solution or explanation here...' : 'Write your answer here...'} />

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => void handleEvaluate()} disabled={evaluateLesson.isPending || !answer.trim()}>
              {evaluateLesson.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Evaluating...</> : 'Evaluate Answer'}
            </Button>
            {evaluationResult?.is_correct ? <span className="text-sm font-medium text-chart-2">Ready to mark complete</span> : null}
          </div>

          {evaluationResult ? (
            <Alert className={cn(evaluationResult.is_correct ? 'border-chart-2/40 bg-chart-2/10' : 'border-destructive/40 bg-destructive/10')}>
              <AlertTitle>{evaluationResult.is_correct ? 'Correct answer' : 'Needs revision'}</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{evaluationResult.feedback}</p>
                {evaluationResult.suggestions ? <p className="text-sm text-muted-foreground">{evaluationResult.suggestions}</p> : null}
              </AlertDescription>
            </Alert>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-3 pt-8 mt-8 border-t border-border">
        <Button variant="outline" onClick={() => selectLesson(lessons[currentIndex - 1]?.id ?? activeLesson.id)} disabled={currentIndex <= 0} className="border-border text-foreground hover:bg-secondary"><ChevronLeft className="mr-2 h-4 w-4" />Previous</Button>
        <Button onClick={() => void handleMarkComplete()} disabled={completeLesson.isPending || !canMarkComplete} className="bg-gradient-to-r from-chart-2 to-chart-2/80 text-foreground px-6"><CheckCircle2 className="mr-2 h-4 w-4" />{completeLesson.isPending ? 'Saving...' : canMarkComplete ? 'Mark Complete' : 'Complete Task First'}</Button>
        <Button variant="outline" onClick={() => selectLesson(lessons[currentIndex + 1]?.id ?? activeLesson.id)} disabled={currentIndex >= lessons.length - 1} className="border-border text-foreground hover:bg-secondary">Next<ChevronRight className="ml-2 h-4 w-4" /></Button>
      </div>
    </div>
  ) : (
    <p className="text-muted-foreground">No lessons have been generated for this course yet.</p>
  );

  const workspace = activeLesson ? (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111827]">
      <div className="border-b border-white/10 px-4 py-3 text-xs uppercase tracking-[0.24em] text-slate-400">{activeLesson.task_type ?? 'lesson'}</div>
      <div className="min-h-0 flex-1 p-4">
        {activeLesson.task_type === 'coding' ? (
          <Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} className="h-full min-h-[16rem] border-white/10 bg-black/20 text-slate-100" placeholder="Work in progress notes or code here..." />
        ) : (
          <div className="h-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-slate-300">
            Use the instruction panel for the lesson content and answer prompt.
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
        <Button variant="outline" onClick={() => void handleEvaluate()} disabled={evaluateLesson.isPending || !answer.trim()} className="gap-2">
          {evaluateLesson.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Target className="h-4 w-4" />}
          Evaluate
        </Button>
        <Button onClick={() => void handleMarkComplete()} disabled={completeLesson.isPending || !canMarkComplete} className="gap-2">
          <CheckCircle2 className="h-4 w-4" />
          Mark Complete
        </Button>
      </div>
      {evaluationResult ? (
        <div className="border-t border-white/10 p-4 text-sm text-slate-300">
          {evaluationResult.feedback}
        </div>
      ) : null}
    </div>
  ) : (
    <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No lesson selected.</div>
  );

  return (
      <LearningWorkspace
      header={{
        title: course.title,
        subtitle: course.description ?? 'Shared workspace for lessons and practice.',
        meta: <><Badge variant="outline">{completedLessonsCount}/{progress?.total_lessons ?? lessons.length} lessons</Badge><Badge variant="outline">{course.total_xp} XP</Badge><Badge className="bg-chart-1/20 text-chart-1 border-chart-1/30">{progressPercentage}% complete</Badge></>,
        actions: <Button asChild variant="outline"><Link to="/roadmap"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>,
      }}
      railTitle="Course Content"
      railDescription="A lesson rail on the left, the lesson brief in the middle, and the active workspace on the right."
      rail={lessonRail}
      instructionTitle="Lesson Brief"
      instructionMeta={<Badge variant="outline">Lesson {currentIndex + 1} of {lessons.length}</Badge>}
      instruction={instruction}
      workspaceTitle="workspace"
      workspaceMeta={<Badge variant="outline">{activeLesson?.task_type ?? 'read-only'}</Badge>}
      workspace={workspace}
      footer={<div className="flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{activeLesson?.task_content ? 'Complete the task before marking the lesson complete.' : 'No task for this lesson.'}</span><span>{course.generation_mode}</span></div>}
    />
  );
}
