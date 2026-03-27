import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { toast } from 'sonner';
import {
  Play,
  Check,
  X,
  Lightbulb,
  Save,
  RotateCcw,
  Trophy,
  Flame,
  Target,
  ChevronRight,
  Filter,
  Search,
  Code2,
  Terminal,
  Sparkles,
  Zap,
  Scroll,
  Sword,
  Shield,
  Crown,
} from 'lucide-react';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ScrollArea } from '../components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '../components/ui/accordion';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  type Challenge,
  type Difficulty,
  type Language,
  challenges,
  getChallengeById,
  getCompletedChallengeIds,
  markChallengeComplete,
  getChallengeProgress,
} from '../../data/challenges';
import { cn } from '../../lib/utils';

// Test result type
interface TestResult {
  input: string;
  expected: string;
  actual: string;
  passed: boolean;
  isHidden: boolean;
}

// Execution response type
interface ExecutionResponse {
  stdout: string;
  stderr: string;
  testResults: TestResult[];
  allPassed: boolean;
  error?: string;
}

// Session storage helpers
const getSavedCode = (challengeId: string): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(`challenge_${challengeId}_code`);
};

const saveCode = (challengeId: string, code: string): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem(`challenge_${challengeId}_code`, code);
};

const getHintsUsed = (challengeId: string): number => {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem(`challenge_${challengeId}_hints`) || '0');
};

const incrementHintsUsed = (challengeId: string): void => {
  if (typeof window === 'undefined') return;
  const current = getHintsUsed(challengeId);
  localStorage.setItem(`challenge_${challengeId}_hints`, String(current + 1));
};

const getStreak = (): number => {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem('arenaStreak') || '0');
};

const incrementStreak = (): void => {
  if (typeof window === 'undefined') return;
  const current = getStreak();
  localStorage.setItem('arenaStreak', String(current + 1));
};

const resetStreak = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.setItem('arenaStreak', '0');
};

// XP Management
const getTotalXP = (): number => {
  if (typeof window === 'undefined') return 0;
  return parseInt(localStorage.getItem('totalXP') || '0');
};

const addXP = (amount: number): void => {
  if (typeof window === 'undefined') return;
  const current = getTotalXP();
  localStorage.setItem('totalXP', String(current + amount));
};

// Difficulty colors and icons
const difficultyConfig: Record<
  Difficulty,
  { color: string; bg: string; border: string; icon: typeof Shield }
> = {
  easy: {
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    icon: Shield,
  },
  medium: {
    color: 'text-amber-400',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/30',
    icon: Sword,
  },
  hard: {
    color: 'text-rose-400',
    bg: 'bg-rose-500/10',
    border: 'border-rose-500/30',
    icon: Crown,
  },
};

// Language icons
const languageIcons: Record<Language, string> = {
  javascript: '⚡',
  python: '🐍',
};

// Mock API execution
const executeCode = async (code: string, challenge: Challenge): Promise<ExecutionResponse> => {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Create a safe execution environment
    const testResults: TestResult[] = [];
    let stdout = '';
    let stderr = '';

    // Find the function name from the challenge
    const functionMatch = challenge.starter_code.match(/function\s+(\w+)\s*\(/);
    const functionName = functionMatch?.[1];

    if (!functionName) {
      throw new Error('Could not determine function name from starter code.');
    }

    // Execute the user's code in a sandboxed way
    const sandbox = new Function(
      'console',
      `
      ${code}
      return typeof ${functionName} !== 'undefined' ? { ${functionName} } : {};
    `
    );

    const consoleMock = {
      log: (...args: unknown[]) => {
        stdout += args.map((a) => String(a)).join(' ') + '\n';
      },
      error: (...args: unknown[]) => {
        stderr += args.map((a) => String(a)).join(' ') + '\n';
      },
    };

    const functions = sandbox(consoleMock) as Record<string, unknown>;

    if (!functions[functionName]) {
      throw new Error('Function not found. Did you delete the function?');
    }

    const userFunction = functions[functionName] as (...args: unknown[]) => unknown;

    // Run test cases
    for (const testCase of challenge.test_cases) {
      try {
        const input = eval(`[${testCase.input}]`);
        const expected = JSON.parse(testCase.expected_output);
        const actual = userFunction(...input);
        const actualStr = JSON.stringify(actual);
        const expectedStr = JSON.stringify(expected);

        testResults.push({
          input: testCase.input,
          expected: testCase.expected_output,
          actual: actualStr,
          passed: actualStr === expectedStr,
          isHidden: testCase.isHidden || false,
        });
      } catch (e) {
        testResults.push({
          input: testCase.input,
          expected: testCase.expected_output,
          actual: String(e),
          passed: false,
          isHidden: testCase.isHidden || false,
        });
      }
    }

    return {
      stdout: stdout || '> Code executed successfully',
      stderr,
      testResults,
      allPassed: testResults.every((r) => r.passed),
    };
  } catch (error) {
    return {
      stdout: '',
      stderr: String(error),
      testResults: challenge.test_cases.map((tc) => ({
        input: tc.input,
        expected: tc.expected_output,
        actual: 'Error',
        passed: false,
        isHidden: tc.isHidden || false,
      })),
      allPassed: false,
      error: String(error),
    };
  }
};

export function Practice() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge>(challenges[0]);
  const [code, setCode] = useState<string>(challenges[0].starter_code);
  const [output, setOutput] = useState<string>('> Awaiting invocation...');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Hint display state (setter is used elsewhere)
  const [hintsRevealed, setHintsRevealed] = useState<number>(0);
  const [isBrowserOpen, setIsBrowserOpen] = useState(false);
  const [difficultyFilter, setDifficultyFilter] = useState<Difficulty | 'all'>('all');
  const [languageFilter, setLanguageFilter] = useState<Language | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [completedChallenges, setCompletedChallenges] = useState<string[]>([]);
  const [totalXP, setTotalXP] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showCelebration, setShowCelebration] = useState(false);

  const editorRef = useRef<
    Parameters<NonNullable<React.ComponentProps<typeof Editor>['onMount']>>[0] | null
  >(null);

  // Load saved state
  useEffect(() => {
    setCompletedChallenges(getCompletedChallengeIds());
    setTotalXP(getTotalXP());
    setStreak(getStreak());
  }, []);

  // Handle challenge selection from URL
  useEffect(() => {
    const challengeId = searchParams.get('challenge');
    if (challengeId) {
      const challenge = getChallengeById(challengeId);
      if (challenge) {
        setSelectedChallenge(challenge);
        const saved = getSavedCode(challengeId);
        setCode(saved || challenge.starter_code);
        setHintsRevealed(getHintsUsed(challengeId));
        setOutput('> Awaiting invocation...');
        setTestResults([]);
      }
    }
  }, [searchParams]);

  // Save code when it changes
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveCode(selectedChallenge.id, code);
    }, 1000);
    return () => clearTimeout(timeout);
  }, [code, selectedChallenge.id]);

  const handleEditorMount: React.ComponentProps<typeof Editor>['onMount'] = (editor) => {
    editorRef.current = editor;
  };

  const handleRunCode = async () => {
    setIsRunning(true);
    setOutput('> Casting spell...');
    setTestResults([]);

    try {
      const result = await executeCode(code, selectedChallenge);
      setOutput(result.stdout || result.stderr || '> Execution complete');
      setTestResults(result.testResults);
    } catch (error) {
      setOutput(`> Error: ${String(error)}`);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setOutput('> Submitting solution...');

    try {
      const result = await executeCode(code, selectedChallenge);
      setOutput(result.stdout || result.stderr || '> Submission complete');
      setTestResults(result.testResults);

      if (result.allPassed) {
        // Calculate XP (deduct for hints used)
        const hintPenalty = Math.min(hintsRevealed * 10, 30);
        const earnedXP = selectedChallenge.xp_reward - hintPenalty;

        // Mark as complete
        markChallengeComplete(selectedChallenge.id);
        setCompletedChallenges((prev) => [...prev, selectedChallenge.id]);

        // Add XP
        addXP(earnedXP);
        setTotalXP((prev) => prev + earnedXP);

        // Update streak
        incrementStreak();
        setStreak((prev) => prev + 1);

        // Show celebration
        setShowCelebration(true);
        confetti({
          particleCount: 150,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#34d399', '#fbbf24', '#a78bfa', '#f472b6'],
        });

        toast.success(
          <div className="flex flex-col gap-1">
            <span className="font-bold">Challenge Conquered!</span>
            <span className="text-sm">
              Earned {earnedXP} XP (hint penalty: -{hintPenalty})
            </span>
          </div>,
          { duration: 5000 }
        );

        setTimeout(() => setShowCelebration(false), 5000);
      } else {
        resetStreak();
        setStreak(0);
        toast.error('Some tests failed. Keep trying, warrior!');
      }
    } catch (error) {
      setOutput(`> Error: ${String(error)}`);
      toast.error('Submission failed. Check your code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGetHint = () => {
    if (hintsRevealed < selectedChallenge.hints.length) {
      incrementHintsUsed(selectedChallenge.id);
      setHintsRevealed((prev) => prev + 1);
      toast.info(`Hint ${hintsRevealed + 1} revealed! (-10 XP potential)`);
    } else {
      toast.info('All hints already revealed!');
    }
  };

  const handleResetCode = () => {
    setCode(selectedChallenge.starter_code);
    setOutput('> Awaiting invocation...');
    setTestResults([]);
    toast.info('Code reset to starter template');
  };

  const handleSelectChallenge = (challenge: Challenge) => {
    setSearchParams({ challenge: challenge.id });
    setIsBrowserOpen(false);
  };

  const filteredChallenges = challenges.filter((c) => {
    const matchesDifficulty = difficultyFilter === 'all' || c.difficulty === difficultyFilter;
    const matchesLanguage = languageFilter === 'all' || c.language === languageFilter;
    const matchesSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.tags?.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesDifficulty && matchesLanguage && matchesSearch;
  });

  const isCompleted = completedChallenges.includes(selectedChallenge.id);
  const DifficultyIcon = difficultyConfig[selectedChallenge.difficulty].icon;
  const progress = getChallengeProgress();

  return (
    <div className="min-h-[calc(100vh-8rem)] lg:h-[calc(100vh-8rem)] flex flex-col gap-4 animate-in zoom-in-95 duration-500">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 shrink-0">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          <div>
            <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
              <Sword className="text-amber-400 w-8 h-8" />
              The Arena
            </h1>
            <p className="text-slate-400">Prove your worth in the proving grounds.</p>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-3 ml-0 sm:ml-4 lg:ml-8">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-purple-300">{totalXP} XP</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-500/10 border border-orange-500/30 rounded-lg">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-medium text-orange-300">{streak} Streak</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
              <Trophy className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-emerald-300">
                {progress.completed}/{progress.total} Complete
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto mt-2 md:mt-0">
          <Dialog open={isBrowserOpen} onOpenChange={setIsBrowserOpen}>
            <DialogTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-slate-300 hover:text-white border-slate-700 hover:bg-slate-800"
              >
                <Scroll className="w-4 h-4" /> Challenge Codex
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-slate-200">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <Scroll className="w-5 h-5 text-amber-400" />
                  Challenge Codex
                </DialogTitle>
              </DialogHeader>

              {/* Filters */}
              <div className="flex gap-3 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                  <Input
                    placeholder="Search challenges..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500"
                  />
                </div>
                <Select
                  value={difficultyFilter}
                  onValueChange={(v) => setDifficultyFilter(v as Difficulty | 'all')}
                >
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-200">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Difficulty" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={languageFilter}
                  onValueChange={(v) => setLanguageFilter(v as Language | 'all')}
                >
                  <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-200">
                    <Code2 className="w-4 h-4 mr-2" />
                    <SelectValue placeholder="Language" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="javascript">JavaScript</SelectItem>
                    <SelectItem value="python">Python</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Challenge List */}
              <ScrollArea className="h-[400px]">
                <div className="space-y-2">
                  {filteredChallenges.map((challenge) => {
                    const isCompleted = completedChallenges.includes(challenge.id);
                    const diffConfig = difficultyConfig[challenge.difficulty];
                    return (
                      <button
                        key={challenge.id}
                        onClick={() => handleSelectChallenge(challenge)}
                        className={cn(
                          'w-full text-left p-4 rounded-lg border transition-all duration-200 flex items-center gap-4',
                          selectedChallenge.id === challenge.id
                            ? 'bg-slate-800 border-purple-500/50 ring-1 ring-purple-500/50'
                            : 'bg-slate-800/50 border-slate-700 hover:bg-slate-800 hover:border-slate-600'
                        )}
                      >
                        <div
                          className={cn(
                            'w-10 h-10 rounded-lg flex items-center justify-center',
                            diffConfig.bg,
                            diffConfig.border
                          )}
                        >
                          <diffConfig.icon className={cn('w-5 h-5', diffConfig.color)} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-200">{challenge.title}</h3>
                            {isCompleted && (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                <Check className="w-3 h-3 mr-1" /> Complete
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1">
                            <span className={cn('text-xs font-medium', diffConfig.color)}>
                              {challenge.difficulty}
                            </span>
                            <span className="text-xs text-slate-500">{challenge.xp_reward} XP</span>
                            <span className="text-xs text-slate-500">
                              {languageIcons[challenge.language]} {challenge.language}
                            </span>
                          </div>
                        </div>
                        {isCompleted ? (
                          <Trophy className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <ChevronRight className="w-5 h-5 text-slate-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </DialogContent>
          </Dialog>

          <Button
            variant="outline"
            size="sm"
            onClick={handleResetCode}
            className="gap-2 text-slate-400 hover:text-white border-slate-700 hover:bg-slate-800"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => saveCode(selectedChallenge.id, code)}
            className="gap-2 text-blue-400 hover:bg-blue-950/30 hover:border-blue-800 border-slate-700"
          >
            <Save className="w-4 h-4" /> Save
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleGetHint}
            disabled={hintsRevealed >= selectedChallenge.hints.length}
            className="gap-2 text-amber-400 hover:bg-amber-950/30 hover:border-amber-800 border-slate-700 disabled:opacity-50"
          >
            <Lightbulb className="w-4 h-4" /> Hint
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCode}
            disabled={isRunning}
            className="gap-2 text-emerald-400 hover:bg-emerald-950/30 hover:border-emerald-800 border-slate-700"
          >
            <Play className="w-4 h-4 fill-current" />
            {isRunning ? 'Casting...' : 'Run Code'}
          </Button>
          <Button
            variant="fantasy"
            size="sm"
            onClick={handleSubmit}
            disabled={isSubmitting || isCompleted}
            className="gap-2"
          >
            {isCompleted ? (
              <>
                <Trophy className="w-4 h-4" /> Conquered
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 lg:overflow-hidden min-h-0 pb-4">
        {/* Left Panel - Challenge Description */}
        <div className="w-full lg:w-2/5 flex flex-col gap-4 min-h-[400px] lg:min-h-0">
          <ScrollArea className="flex-1 bg-slate-900/60 rounded-xl border border-slate-800 backdrop-blur-md">
            <div className="p-6">
              {/* Challenge Header */}
              <div className="flex items-start justify-between mb-6">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-500/20 text-purple-400 border border-purple-500/30 uppercase tracking-wider">
                      Quest #{challenges.findIndex((c) => c.id === selectedChallenge.id) + 1}
                    </span>
                    <span
                      className={cn(
                        'px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider border flex items-center gap-1',
                        difficultyConfig[selectedChallenge.difficulty].bg,
                        difficultyConfig[selectedChallenge.difficulty].border,
                        difficultyConfig[selectedChallenge.difficulty].color
                      )}
                    >
                      <DifficultyIcon className="w-3 h-3" />
                      {selectedChallenge.difficulty}
                    </span>
                    {isCompleted && (
                      <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                        <Trophy className="w-3 h-3 mr-1" /> Complete
                      </Badge>
                    )}
                  </div>
                  <h2 className="text-2xl font-bold text-white">{selectedChallenge.title}</h2>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-amber-400">
                    <Zap className="w-4 h-4" />
                    <span className="font-bold">{selectedChallenge.xp_reward} XP</span>
                  </div>
                  <span className="text-xs text-slate-500">
                    {languageIcons[selectedChallenge.language]} {selectedChallenge.language}
                  </span>
                </div>
              </div>

              {/* Description */}
              <div className="prose prose-invert max-w-none text-slate-300 leading-relaxed mb-6">
                {selectedChallenge.description.split('\n\n').map((para, i) => (
                  <p key={i} className="mb-4 text-sm">
                    {para}
                  </p>
                ))}
              </div>

              {/* Examples */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-blue-400" /> Examples
                </h3>
                <div className="space-y-3">
                  {selectedChallenge.examples.map((example, idx) => (
                    <div key={idx} className="bg-slate-950 rounded-lg border border-slate-800 p-3">
                      <div className="space-y-2 text-sm font-mono">
                        <div className="flex gap-2">
                          <span className="text-slate-500">Input:</span>
                          <span className="text-amber-300">{example.input}</span>
                        </div>
                        <div className="flex gap-2">
                          <span className="text-slate-500">Output:</span>
                          <span className="text-emerald-300">{example.output}</span>
                        </div>
                        {example.explanation && (
                          <div className="flex gap-2">
                            <span className="text-slate-500">Explain:</span>
                            <span className="text-slate-400">{example.explanation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Constraints */}
              {selectedChallenge.constraints && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-rose-400" /> Constraints
                  </h3>
                  <ul className="list-disc list-inside space-y-1 text-xs text-slate-500">
                    {selectedChallenge.constraints.map((constraint, idx) => (
                      <li key={idx}>{constraint}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Test Cases Status */}
              {testResults.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm font-semibold text-slate-400 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4 text-purple-400" /> Test Results
                  </h3>
                  <div className="space-y-2">
                    {testResults.map((result, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border text-sm',
                          result.passed
                            ? 'bg-emerald-500/10 border-emerald-500/30'
                            : 'bg-rose-500/10 border-rose-500/30'
                        )}
                      >
                        {result.passed ? (
                          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                        ) : (
                          <X className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <span className="text-slate-400">Test {idx + 1}:</span>{' '}
                          {result.isHidden ? (
                            <span className="text-slate-500 italic">Hidden</span>
                          ) : (
                            <>
                              <span className="text-slate-300">{result.input}</span>
                              {!result.passed && (
                                <span className="text-slate-500 ml-2">
                                  Expected: {result.expected}, Got: {result.actual}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Hints */}
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="hints" className="border-slate-800">
                  <AccordionTrigger className="text-sm font-semibold text-slate-400 hover:text-slate-200 py-3">
                    <span className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-amber-400" />
                      Hints from the Archmage{' '}
                      {hintsRevealed > 0 && (
                        <Badge className="ml-2 bg-amber-500/20 text-amber-400 text-xs">
                          {hintsRevealed}/{selectedChallenge.hints.length} Revealed
                        </Badge>
                      )}
                    </span>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-3 pt-2">
                      {selectedChallenge.hints.map((hint, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            'p-3 rounded-lg border transition-all duration-300',
                            idx < hintsRevealed
                              ? 'bg-amber-500/10 border-amber-500/30'
                              : 'bg-slate-800/50 border-slate-700 blur-sm select-none'
                          )}
                        >
                          <div className="flex items-start gap-2">
                            <span className="text-xs font-bold text-amber-400 shrink-0 mt-0.5">
                              {idx + 1}.
                            </span>
                            <p className="text-sm text-slate-300">{hint}</p>
                          </div>
                        </div>
                      ))}
                      {hintsRevealed < selectedChallenge.hints.length && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleGetHint}
                          className="w-full gap-2 text-amber-400 hover:bg-amber-950/30 border-amber-500/30"
                        >
                          <Lightbulb className="w-4 h-4" />
                          Reveal Next Hint (-10 XP)
                        </Button>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>
          </ScrollArea>
        </div>

        {/* Right Panel - Editor & Output */}
        <div className="w-full lg:w-3/5 flex flex-col gap-4 min-h-[500px] lg:min-h-0">
          {/* Monaco Editor */}
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-xl border border-slate-800 bg-[#1e1e1e]">
            <div className="h-10 bg-[#2d2d2d] flex items-center px-4 border-b border-black shrink-0">
              <div className="flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="mx-auto text-xs text-slate-400 font-mono flex items-center gap-2">
                <Code2 className="w-3 h-3" />
                spellbook.{selectedChallenge.language === 'javascript' ? 'js' : 'py'}
              </span>
            </div>
            <div className="flex-1 relative">
              <Editor
                height="100%"
                language={selectedChallenge.language}
                value={code}
                onChange={(value) => setCode(value || '')}
                onMount={handleEditorMount}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  roundedSelection: false,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  padding: { top: 16 },
                  fontFamily: 'JetBrains Mono, Fira Code, monospace',
                  fontLigatures: true,
                  formatOnPaste: true,
                  formatOnType: true,
                  tabSize: 2,
                  wordWrap: 'on',
                }}
              />
            </div>
          </div>

          {/* Output Console */}
          <div className="h-48 bg-black rounded-xl border border-slate-800 flex flex-col overflow-hidden shadow-inner font-mono relative shrink-0">
            <div className="h-8 bg-slate-900 flex items-center px-4 shrink-0 border-b border-slate-800 justify-between">
              <span className="text-xs text-slate-500 uppercase tracking-wider font-semibold flex items-center gap-2">
                <Terminal className="w-3 h-3" /> Crystal Ball (Output)
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setOutput('> Awaiting invocation...')}
                className="h-6 text-xs text-slate-500 hover:text-white px-2"
              >
                Clear
              </Button>
            </div>
            <ScrollArea className="flex-1 p-4">
              <pre
                className={cn(
                  'text-sm whitespace-pre-wrap',
                  output.includes('Error')
                    ? 'text-rose-400'
                    : output.includes('✓')
                      ? 'text-emerald-400'
                      : 'text-slate-300'
                )}
              >
                {output}
              </pre>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Success Celebration Overlay */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none"
          >
            <div className="bg-slate-900/90 backdrop-blur-xl border border-amber-500/50 rounded-2xl p-8 text-center shadow-2xl shadow-amber-500/20">
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ repeat: Infinity, duration: 0.5 }}
              >
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4" />
              </motion.div>
              <h3 className="text-3xl font-bold text-white mb-2">Challenge Conquered!</h3>
              <p className="text-slate-400 mb-4">
                You earned{' '}
                <span className="text-amber-400 font-bold">
                  {selectedChallenge.xp_reward - Math.min(hintsRevealed * 10, 30)} XP
                </span>
              </p>
              <div className="flex items-center justify-center gap-4 text-sm">
                <span className="flex items-center gap-1 text-orange-400">
                  <Flame className="w-4 h-4" /> {streak + 1} Streak
                </span>
                <span className="flex items-center gap-1 text-purple-400">
                  <Sparkles className="w-4 h-4" />{' '}
                  {totalXP + selectedChallenge.xp_reward - Math.min(hintsRevealed * 10, 30)} Total
                  XP
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
