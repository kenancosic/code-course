import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, Link } from 'react-router';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  Clock,
  Play,
  CheckCircle,
  Circle,
  Sparkles,
  Trophy,
  Flame,
  Target,
  Lightbulb,
  AlertCircle,
  Code,
  RotateCcw,
  Check,
  Loader2,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Skeleton } from '../components/ui/skeleton';
import { Progress } from '../components/ui/progress';
import { Badge } from '../components/ui/badge';
import { Separator } from '../components/ui/separator';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';
import { cn } from '../../lib/utils';
import { useCourse, useCourseProgress, useCompleteLesson, useEvaluateLesson } from '../../hooks';
import type { CourseLesson, TaskType } from '../../hooks';
import { Textarea } from '../components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { Label } from '../components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert';

// Types
interface CodeExample {
  id: string;
  language: string;
  code: string;
  description?: string;
}

interface ParsedContent {
  sections: {
    title: string;
    content: string;
    type: 'concept' | 'example' | 'exercise' | 'callout';
  }[];
  codeExamples: CodeExample[];
  estimatedMinutes: number;
}

// Utility to extract code blocks from markdown
function parseLessonContent(markdown: string): ParsedContent {
  const codeExamples: CodeExample[] = [];
  let exampleCount = 0;

  // Extract code blocks
  const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g;
  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    exampleCount++;
    codeExamples.push({
      id: `example-${exampleCount}`,
      language: match[1],
      code: match[2].trim(),
    });
  }

  // Estimate reading time (roughly 200 words per minute)
  const wordCount = markdown.split(/\s+/).length;
  const estimatedMinutes = Math.max(1, Math.ceil(wordCount / 200));

  // Parse sections (split by headings)
  const sections: ParsedContent['sections'] = [];
  const lines = markdown.split('\n');
  let currentSection: ParsedContent['sections'][0] | null = null;
  let currentContent: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## ') || line.startsWith('### ')) {
      if (currentSection) {
        currentSection.content = currentContent.join('\n');
        sections.push(currentSection);
      }
      currentSection = {
        title: line.replace(/^#+\s*/, ''),
        content: '',
        type:
          line.includes('Example') || line.includes('Code')
            ? 'example'
            : line.includes('Exercise') || line.includes('Practice')
              ? 'exercise'
              : line.includes('Note') || line.includes('Tip') || line.includes('Warning')
                ? 'callout'
                : 'concept',
      };
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  if (currentSection) {
    currentSection.content = currentContent.join('\n');
    sections.push(currentSection);
  }

  // If no sections were parsed, create one from the whole content
  if (sections.length === 0) {
    sections.push({
      title: 'Lesson Content',
      content: markdown,
      type: 'concept',
    });
  }

  return { sections, codeExamples, estimatedMinutes };
}

// Celebration animation
function triggerCelebration() {
  const duration = 3000;
  const end = Date.now() + duration;

  const colors = ['#a855f7', '#6366f1', '#22c55e', '#f59e0b'];

  (function frame() {
    confetti({
      particleCount: 4,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors,
    });
    confetti({
      particleCount: 4,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors,
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}

// Code Playground Component
interface CodePlaygroundProps {
  initialCode: string;
  language: string;
  onRun?: (output: string) => void;
  testCases?: { input: string; expected: string }[];
}

function CodePlayground({ initialCode, language, onRun, testCases }: CodePlaygroundProps) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'output' | 'tests'>('output');

  const handleRun = useCallback(async () => {
    setIsRunning(true);
    setActiveTab('output');

    // Simulate code execution (in real app, this would call a backend API)
    await new Promise((resolve) => setTimeout(resolve, 1000));

    void ('' as string); // Simulated output placeholder

    if (language === 'javascript' || language === 'js') {
      try {
        // Create a safe evaluation environment
        const consoleOutput: string[] = [];
        const mockConsole = {
          log: (...args: unknown[]) => consoleOutput.push(args.map(String).join(' ')),
          error: (...args: unknown[]) => consoleOutput.push('Error: ' + args.map(String).join(' ')),
        };

        const result = new Function('console', code)(mockConsole);
        if (result !== undefined) {
          consoleOutput.push(String(result));
        }

        simulatedOutput = consoleOutput.join('\n') || 'Code executed successfully (no output)';
      } catch (err) {
        simulatedOutput = `Error: ${err instanceof Error ? err.message : String(err)}`;
      }
    } else if (language === 'python' || language === 'py') {
      simulatedOutput = `[Python simulation]\nCode would execute here...\n\n${code.split('\n').length} lines of Python code`;
    } else {
      simulatedOutput = `[${language} code]\nExecution simulation for ${language}\n\nCode length: ${code.length} characters`;
    }

    setOutput(simulatedOutput);
    onRun?.(simulatedOutput);
    setIsRunning(false);
  }, [code, language, onRun]);

  const handleReset = () => {
    setCode(initialCode);
    setOutput('');
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-lg overflow-hidden border border-border">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 bg-card border-b border-border">
        <div className="flex items-center gap-2">
          <Code className="w-4 h-4 text-chart-2" />
          <span className="text-sm font-medium text-foreground">Playground</span>
          <Badge variant="outline" className="text-xs border-border text-muted-foreground">
            {language}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-7 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className="h-7 bg-chart-2 hover:bg-chart-2/80 text-foreground"
          >
            {isRunning ? (
              <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <Play className="w-3.5 h-3.5 mr-1" />
            )}
            Run
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0">
        <Editor
          height="100%"
          language={language === 'js' ? 'javascript' : language}
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16 },
          }}
        />
      </div>

      {/* Output Panel */}
      <div className="h-40 border-t border-border bg-card/50">
        <div className="flex items-center gap-4 px-3 py-2 border-b border-border">
          <button
            onClick={() => setActiveTab('output')}
            className={cn(
              'text-xs font-medium transition-colors',
              activeTab === 'output'
                ? 'text-chart-2'
                : 'text-muted-foreground/70 hover:text-foreground'
            )}
          >
            Output
          </button>
          {testCases && testCases.length > 0 && (
            <button
              onClick={() => setActiveTab('tests')}
              className={cn(
                'text-xs font-medium transition-colors',
                activeTab === 'tests'
                  ? 'text-chart-2'
                  : 'text-muted-foreground/70 hover:text-foreground'
              )}
            >
              Tests ({testCases.length})
            </button>
          )}
        </div>
        <ScrollArea className="h-[calc(100%-37px)]">
          <div className="p-3">
            {activeTab === 'output' ? (
              output ? (
                <pre className="text-sm font-mono text-foreground whitespace-pre-wrap">
                  {output}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground/70 italic">
                  Click &quot;Run&quot; to see output
                </p>
              )
            ) : (
              <div className="space-y-2">
                {testCases?.map((test, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-muted-foreground/50" />
                    <span className="text-muted-foreground">Test {i + 1}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

// Task Section Component
interface TaskSectionProps {
  taskType: TaskType;
  taskContent: string | null;
  answer: string;
  onAnswerChange: (value: string) => void;
  quizAnswer: string;
  onQuizAnswerChange: (value: string) => void;
  onEvaluate: () => void;
  onReset: () => void;
  isEvaluating: boolean;
  evaluationResult: {
    is_correct: boolean;
    feedback: string;
    suggestions?: string[];
    xp_earned: number;
  } | null;
}

function TaskSection({
  taskType,
  taskContent,
  answer,
  onAnswerChange,
  quizAnswer,
  onQuizAnswerChange,
  onEvaluate,
  onReset,
  isEvaluating,
  evaluationResult,
}: TaskSectionProps) {
  if (!taskType || !taskContent) return null;

  const quizOptions =
    taskType === 'quiz' ? taskContent.split('\n').filter((line) => line.match(/^[A-D][).\s]/)) : [];

  return (
    <div className="mt-8 border border-border rounded-lg bg-card/50 overflow-hidden">
      <div className="px-4 py-3 bg-primary/10 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="font-semibold text-foreground">
            {taskType === 'code' && 'Coding Exercise'}
            {taskType === 'quiz' && 'Knowledge Check'}
            {taskType === 'project' && 'Project Task'}
          </h3>
        </div>
        <Badge variant="outline" className="text-xs border-primary/30 text-primary">
          {taskType.toUpperCase()}
        </Badge>
      </div>

      <div className="p-4 space-y-4">
        {/* Task Description */}
        <div className="prose prose-invert prose-sm max-w-none">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {taskType === 'quiz'
              ? taskContent
                  .split('\n')
                  .filter((line) => !line.match(/^[A-D][).\s]/))
                  .join('\n')
              : taskContent}
          </ReactMarkdown>
        </div>

        {/* Answer Input */}
        {!evaluationResult && (
          <div className="space-y-3">
            {taskType === 'quiz' && (
              <RadioGroup
                value={quizAnswer}
                onValueChange={onQuizAnswerChange}
                className="space-y-2"
              >
                {quizOptions.map((option, i) => {
                  const value = option.match(/^[A-D]/)?.[0] || String(i);
                  return (
                    <div key={i} className="flex items-center space-x-2">
                      <RadioGroupItem value={value} id={`option-${i}`} />
                      <Label htmlFor={`option-${i}`} className="text-foreground cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            )}

            {(taskType === 'code' || taskType === 'project') && (
              <Textarea
                value={answer}
                onChange={(e) => onAnswerChange(e.target.value)}
                placeholder={
                  taskType === 'code' ? 'Enter your code here...' : 'Describe your solution...'
                }
                className="min-h-[150px] font-mono text-sm bg-background border-border"
              />
            )}

            <Button
              onClick={onEvaluate}
              disabled={isEvaluating || (!answer && !quizAnswer)}
              className="w-full bg-gradient-to-r from-chart-2 to-chart-2/80 hover:from-chart-2/90 hover:to-chart-2/70 text-foreground"
            >
              {isEvaluating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Evaluating...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Submit Answer
                </>
              )}
            </Button>
          </div>
        )}

        {/* Evaluation Result */}
        {evaluationResult && (
          <div className="space-y-4">
            <Alert
              className={
                evaluationResult.is_correct
                  ? 'border-emerald-500/50 bg-emerald-500/10'
                  : 'border-amber-500/50 bg-amber-500/10'
              }
            >
              <AlertTitle
                className={evaluationResult.is_correct ? 'text-emerald-400' : 'text-amber-400'}
              >
                {evaluationResult.is_correct ? (
                  <span className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" /> Correct!
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" /> Needs Improvement
                  </span>
                )}
              </AlertTitle>
              <AlertDescription className="text-foreground mt-2">
                {evaluationResult.feedback}
              </AlertDescription>
            </Alert>

            {evaluationResult.suggestions && evaluationResult.suggestions.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-primary" />
                  Suggestions
                </h4>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {evaluationResult.suggestions.map((suggestion, i) => (
                    <li key={i}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {evaluationResult.is_correct && (
              <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                <Trophy className="w-5 h-5" />+{evaluationResult.xp_earned} XP Earned
              </div>
            )}

            {!evaluationResult.is_correct && (
              <Button onClick={onReset} variant="outline" className="w-full border-border">
                <RotateCcw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Lesson Content Renderer with Interactive Elements
interface LessonContentProps {
  content: string;
  onTryIt: (code: string, language: string) => void;
}

function LessonContent({ content, onTryIt }: LessonContentProps) {
  return (
    <div className="prose prose-invert prose-neutral max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-3xl font-bold text-foreground mb-6 pb-4 border-b border-border">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-semibold text-foreground mt-8 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-6 bg-primary rounded-full" />
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-medium text-foreground mt-6 mb-3">{children}</h3>
          ),
          p: ({ children }) => <p className="text-foreground leading-relaxed mb-4">{children}</p>,
          ul: ({ children }) => (
            <ul className="list-disc list-inside space-y-2 text-foreground mb-4 ml-2">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside space-y-2 text-foreground mb-4 ml-2">
              {children}
            </ol>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary bg-primary/10 pl-4 py-3 pr-4 rounded-r-lg my-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div className="text-foreground">{children}</div>
              </div>
            </blockquote>
          ),
          pre: ({ children }) => {
            // Extract code from pre/code block
            const codeElement = children as React.ReactElement;
            const code = codeElement?.props?.children?.toString() || '';
            const className = codeElement?.props?.className || '';
            const language = className.replace('language-', '').split(' ')[0] || 'javascript';

            return (
              <div className="my-6 rounded-lg overflow-hidden border border-border">
                <div className="flex items-center justify-between px-3 py-2 bg-background border-b border-border">
                  <span className="text-xs font-medium text-muted-foreground/70 uppercase">
                    {language}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onTryIt(code, language)}
                    className="h-6 text-xs text-chart-2 hover:text-chart-2/80 hover:bg-chart-2/10"
                  >
                    <Play className="w-3 h-3 mr-1" />
                    Try It
                  </Button>
                </div>
                <pre className="bg-background p-4 overflow-x-auto m-0">
                  <code className={className}>{children}</code>
                </pre>
              </div>
            );
          },
          code: ({ children }) => (
            <code className="bg-secondary text-chart-2 px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

// Main CourseView Component
export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading: courseLoading, error } = useCourse(courseId || '');
  const { data: progress } = useCourseProgress(courseId || '');
  const completeLesson = useCompleteLesson();
  const evaluateLesson = useEvaluateLesson();

  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);
  const [playgroundCode, setPlaygroundCode] = useState<string>('');
  const [playgroundLanguage, setPlaygroundLanguage] = useState<string>('javascript');
  const [isCompleting, setIsCompleting] = useState(false);
  const [showXpAnimation, setShowXpAnimation] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);

  // Task evaluation state
  const [taskAnswer, setTaskAnswer] = useState<string>('');
  const [quizAnswer, setQuizAnswer] = useState<string>('');
  const [evaluationResult, setEvaluationResult] = useState<{
    is_correct: boolean;
    feedback: string;
    suggestions?: string[];
    xp_earned: number;
  } | null>(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const sortedLessons = useMemo(
    () => (course ? [...course.lessons].sort((a, b) => a.sort_order - b.sort_order) : []),
    [course]
  );

  const activeLesson: CourseLesson | undefined = activeLessonId
    ? sortedLessons.find((l) => l.id === activeLessonId)
    : sortedLessons[0];

  const parsedContent = useMemo(() => {
    if (!activeLesson?.content_markdown) {
      return { sections: [], codeExamples: [], estimatedMinutes: 1 };
    }
    return parseLessonContent(activeLesson.content_markdown);
  }, [activeLesson]);

  // Initialize playground with first code example
  useEffect(() => {
    if (parsedContent.codeExamples.length > 0 && !playgroundCode) {
      setPlaygroundCode(parsedContent.codeExamples[0].code);
      setPlaygroundLanguage(parsedContent.codeExamples[0].language);
    }
  }, [parsedContent.codeExamples, playgroundCode]);

  const handleTryIt = useCallback((code: string, language: string) => {
    setPlaygroundCode(code);
    setPlaygroundLanguage(language);
  }, []);

  const handleLessonChange = useCallback(
    (lessonId: number) => {
      setActiveLessonId(lessonId);
      const lesson = sortedLessons.find((l) => l.id === lessonId);
      if (lesson?.content_markdown) {
        const parsed = parseLessonContent(lesson.content_markdown);
        if (parsed.codeExamples.length > 0) {
          setPlaygroundCode(parsed.codeExamples[0].code);
          setPlaygroundLanguage(parsed.codeExamples[0].language);
        } else {
          setPlaygroundCode("// Write your code here\nconsole.log('Hello, World!');");
          setPlaygroundLanguage('javascript');
        }
      }
    },
    [sortedLessons]
  );

  const handleMarkComplete = useCallback(async () => {
    if (!activeLesson || !courseId) return;

    setIsCompleting(true);

    try {
      const result = await completeLesson.mutateAsync({
        lesson_id: String(activeLesson.id),
        course_id: courseId,
        time_spent_minutes: parsedContent.estimatedMinutes,
      });

      setXpEarned(result.xp_earned);
      setShowXpAnimation(true);
      triggerCelebration();

      setTimeout(() => setShowXpAnimation(false), 3000);
    } finally {
      setIsCompleting(false);
    }
  }, [activeLesson, courseId, completeLesson, parsedContent.estimatedMinutes]);

  const handleEvaluate = useCallback(async () => {
    if (!activeLesson || !courseId) return;

    setIsEvaluating(true);
    setEvaluationResult(null);

    try {
      const answer = activeLesson.task_type === 'quiz' ? quizAnswer : taskAnswer;
      const result = await evaluateLesson.mutateAsync({
        course_id: courseId,
        lesson_id: String(activeLesson.id),
        answer,
      });

      setEvaluationResult(result);
      if (result.is_correct) {
        setXpEarned(result.xp_earned);
        triggerCelebration();
      }
    } finally {
      setIsEvaluating(false);
    }
  }, [activeLesson, courseId, taskAnswer, quizAnswer, evaluateLesson]);

  const resetEvaluation = useCallback(() => {
    setEvaluationResult(null);
    setTaskAnswer('');
    setQuizAnswer('');
  }, []);

  // Reset task state when lesson changes
  useEffect(() => {
    resetEvaluation();
  }, [activeLesson?.id, resetEvaluation]);

  const currentIndex = activeLesson ? sortedLessons.findIndex((l) => l.id === activeLesson.id) : -1;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < sortedLessons.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      handleLessonChange(sortedLessons[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      handleLessonChange(sortedLessons[currentIndex + 1].id);
    }
  };

  // Calculate overall progress
  const completedLessons = progress?.lessons_completed || 0;
  const totalLessons = progress?.total_lessons || sortedLessons.length || 1;
  const progressPercentage = Math.round((completedLessons / totalLessons) * 100);

  if (courseLoading) {
    return (
      <div className="h-full flex flex-col space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-16 w-full" />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6">
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

  return (
    <TooltipProvider>
      <div className="h-full flex flex-col animate-in fade-in duration-500">
        {/* XP Earned Animation */}
        <AnimatePresence>
          {showXpAnimation && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50 }}
              className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
            >
              <div className="bg-gradient-to-r from-chart-1 to-chart-1/80 text-foreground px-8 py-6 rounded-2xl shadow-2xl text-center">
                <Trophy className="w-12 h-12 mx-auto mb-2" />
                <p className="text-3xl font-bold">+{xpEarned} XP</p>
                <p className="text-yellow-100">Lesson Completed!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="shrink-0 border-b border-border bg-background/50 backdrop-blur-sm">
          <div className="px-6 py-4">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-3">
              <Link to="/roadmap" className="hover:text-foreground transition-colors">
                Roadmap
              </Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-foreground">{course.title}</span>
              {activeLesson && (
                <>
                  <ChevronRight className="w-4 h-4" />
                  <span className="text-primary">Lesson {currentIndex + 1}</span>
                </>
              )}
            </nav>

            {/* Course Info & Progress */}
            <div className="flex items-center justify-between">
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
                      {completedLessons}/{totalLessons} lessons
                    </span>
                    <span className="flex items-center gap-1">
                      <Flame className="w-4 h-4 text-orange-400" />5 day streak
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* Progress Bar */}
                <div className="w-48">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-muted-foreground">Course Progress</span>
                    <span className="text-primary font-medium">{progressPercentage}%</span>
                  </div>
                  <Progress value={progressPercentage} className="h-2 bg-secondary" />
                </div>

                {/* Total XP */}
                <div className="flex items-center gap-2 px-3 py-1.5 bg-card rounded-lg border border-border">
                  <Sparkles className="w-4 h-4 text-chart-1" />
                  <span className="text-sm font-medium text-foreground">{course.total_xp} XP</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <div className="flex-1 flex overflow-hidden">
          {/* Lesson Sidebar */}
          <aside className="w-72 shrink-0 border-r border-border bg-background/30 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-border">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <Target className="w-4 h-4 text-primary" />
                Course Content
              </h3>
            </div>
            <ScrollArea className="flex-1">
              <nav className="p-3 space-y-1">
                {sortedLessons.map((lesson, index) => {
                  const isActive = lesson.id === activeLesson?.id;

                  return (
                    <Tooltip key={lesson.id}>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => handleLessonChange(lesson.id)}
                          className={cn(
                            'w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all',
                            isActive
                              ? 'bg-primary/20 border border-primary/30'
                              : 'hover:bg-secondary/50 border border-transparent',
                            isCompleted && !isActive && 'opacity-70'
                          )}
                        >
                          <div className="flex flex-col items-center gap-1 shrink-0 mt-0.5">
                            {isCompleted ? (
                              <CheckCircle className="w-5 h-5 text-chart-2" />
                            ) : isActive ? (
                              <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Play className="w-3 h-3 text-foreground" />
                              </div>
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground/50" />
                            )}
                            {index < sortedLessons.length - 1 && (
                              <div
                                className={cn(
                                  'w-0.5 h-full min-h-[20px]',
                                  isCompleted ? 'bg-chart-2/80/30' : 'bg-secondary'
                                )}
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p
                              className={cn(
                                'font-medium text-sm',
                                isActive ? 'text-foreground' : 'text-foreground'
                              )}
                            >
                              {index + 1}. {lesson.title}
                            </p>
                            <p className="text-xs text-muted-foreground/70 mt-0.5 flex items-center gap-1">
                              <Sparkles className="w-3 h-3" />
                              {lesson.xp_reward} XP
                            </p>
                          </div>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{lesson.title}</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                })}
              </nav>
            </ScrollArea>
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex overflow-hidden">
            {/* Lesson Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <div className="max-w-3xl mx-auto p-8">
                {activeLesson ? (
                  <div className="space-y-6">
                    {/* Lesson Header */}
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground/70 mb-2">
                          <Badge variant="outline" className="text-xs border-border">
                            Lesson {currentIndex + 1} of {sortedLessons.length}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {parsedContent.estimatedMinutes} min read
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

                    {/* Content */}
                    {activeLesson.content_markdown ? (
                      <LessonContent
                        content={activeLesson.content_markdown}
                        onTryIt={handleTryIt}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-20 text-center">
                        <AlertCircle className="w-12 h-12 text-muted-foreground/50 mb-4" />
                        <p className="text-muted-foreground">
                          This lesson is still being generated. Check back soon!
                        </p>
                      </div>
                    )}

                    {/* Task Section */}
                    <TaskSection
                      taskType={activeLesson.task_type}
                      taskContent={activeLesson.task_content}
                      answer={taskAnswer}
                      onAnswerChange={setTaskAnswer}
                      quizAnswer={quizAnswer}
                      onQuizAnswerChange={setQuizAnswer}
                      onEvaluate={handleEvaluate}
                      onReset={resetEvaluation}
                      isEvaluating={isEvaluating}
                      evaluationResult={evaluationResult}
                    />

                    {/* Navigation Footer */}
                    <div className="flex items-center justify-between pt-8 mt-8 border-t border-border">
                      <Button
                        variant="outline"
                        onClick={handlePrevious}
                        disabled={!hasPrevious}
                        className="border-border text-foreground hover:bg-secondary"
                      >
                        <ChevronLeft className="w-4 h-4 mr-2" />
                        Previous
                      </Button>

                      <Button
                        onClick={handleMarkComplete}
                        disabled={
                          isCompleting ||
                          (!!activeLesson.task_type && !evaluationResult?.is_correct)
                        }
                        className="bg-gradient-to-r from-chart-2 to-chart-2/80 hover:from-chart-2/90 hover:to-chart-2/70 text-foreground px-6"
                      >
                        {isCompleting ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Saving...
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            {activeLesson.task_type && !evaluationResult?.is_correct
                              ? 'Complete Task First'
                              : 'Mark Complete'}
                          </>
                        )}
                      </Button>

                      <Button
                        variant="outline"
                        onClick={handleNext}
                        disabled={!hasNext}
                        className="border-border text-foreground hover:bg-secondary"
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground/70">
                    <p>Select a lesson to begin</p>
                  </div>
                )}
              </div>
            </div>

            {/* Code Playground */}
            <div className="w-[45%] min-w-[400px] max-w-[600px] border-l border-border bg-background/30 p-6">
              <div className="h-full flex flex-col">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
                    <Code className="w-5 h-5 text-chart-2" />
                    Code Playground
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Experiment with the code examples or write your own
                  </p>
                </div>
                <div className="flex-1 min-h-0">
                  <CodePlayground
                    initialCode={
                      playgroundCode || "// Write your code here\nconsole.log('Hello, World!');"
                    }
                    language={playgroundLanguage}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}
