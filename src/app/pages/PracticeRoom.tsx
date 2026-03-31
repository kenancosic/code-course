import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Menu,
  Play,
  RotateCcw,
  Shield,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import {
  generateCourseStream,
  useEvaluatePracticeSolution,
  useExecutePracticeCode,
  usePracticeRoom,
  useSpawnPracticeEncounters,
  useSubmitPracticeEncounter,
} from '../../hooks';
import type {
  PracticeDisplayTestCase,
  PracticeEncounter,
  PracticeRemediationAction,
  PracticeRoom as PracticeRoomState,
  PracticeSubmissionResponse,
  PracticeTestResult,
} from '../../hooks/use-practice';
import { cn } from '../../lib/utils';
import { LearningWorkspace } from '../../features/workspace/LearningWorkspace';

function readDraft(roomId: string, encounterId: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(`practice:${roomId}:${encounterId}`) ?? fallback;
}

function writeDraft(roomId: string, encounterId: string, code: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`practice:${roomId}:${encounterId}`, code);
}

function starterCode(encounter?: PracticeEncounter | null) {
  return (
    encounter?.challenge.starter_code ??
    (encounter?.challenge.language === 'python'
      ? 'def solution(*args):\n    pass\n'
      : 'function solution(...args) {\n  // write your solution\n}\n')
  );
}

function encounterTone(status?: PracticeEncounter['status']) {
  switch (status) {
    case 'passed':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'failed':
      return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
    case 'locked':
      return 'bg-secondary/70 text-foreground border-border';
    default:
      return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  }
}

function difficultyBadge(difficulty?: string) {
  if (difficulty === 'hard') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (difficulty === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (difficulty === 'boss') return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
}

function normalizeTests(tests: PracticeDisplayTestCase[] | undefined) {
  return (tests ?? []).map((testCase) => ({
    input: testCase.input,
    expected_output: testCase.expected_output,
    is_hidden: testCase.is_hidden,
  }));
}

function normalizeResults(results: PracticeTestResult[] | undefined) {
  return (results ?? []).map((result) => ({
    passed: result.passed,
    input: result.input,
    expected: result.expected,
    actual: result.actual,
    is_hidden: result.is_hidden,
  }));
}

function EncounterRail({
  room,
  activeEncounterId,
  onSelect,
}: {
  room: PracticeRoomState;
  activeEncounterId: string | null;
  onSelect: (encounter: PracticeEncounter) => void;
}) {
  return (
    <div className="space-y-3 p-3">
      {room.encounters.map((encounter) => {
        const isActive = String(encounter.id) === String(activeEncounterId);
        return (
          <button
            key={encounter.id}
            onClick={() => onSelect(encounter)}
            className={cn(
              'flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors',
              isActive ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-background/35 hover:bg-background/55'
            )}
          >
            <div className={cn('mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]', encounterTone(encounter.status))}>
              {encounter.encounter_type}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-foreground">{encounter.challenge.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="capitalize">{encounter.challenge.difficulty}</span>
                <span>&middot;</span>
                <span>{encounter.challenge.language}</span>
                <span>&middot;</span>
                <span>{encounter.attempts_used} attempts used</span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function RemediationPanel({
  actions,
  courseGenerationStatus,
  isGeneratingCourse,
  isSpawning,
  onGenerateCourse,
  onSpawnMore,
}: {
  actions: PracticeRemediationAction[];
  courseGenerationStatus: string | null;
  isGeneratingCourse: boolean;
  isSpawning: boolean;
  onGenerateCourse: (topicId: number | null) => void;
  onSpawnMore: (count: 1 | 3) => void;
}) {
  if (!actions.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-200">Recovery Options</h3>
        <p className="mt-1 text-sm text-amber-100/80">
          You are out of attempts. Rebuild your token pool before challenging the boss again.
        </p>
      </div>
      <div className="space-y-3">
        {actions.map((action) => (
          <div key={`${action.type}-${action.label}`} className="rounded-2xl border border-amber-400/20 bg-black/10 p-3">
            <div className="font-medium text-amber-50">{action.label}</div>
            <p className="mt-1 text-sm text-amber-100/75">{action.description}</p>
            {action.type === 'spawn_more' ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="outline" disabled={isSpawning} onClick={() => onSpawnMore(1)}>
                  Spawn 1
                </Button>
                <Button variant="outline" disabled={isSpawning} onClick={() => onSpawnMore(3)}>
                  Spawn 3
                </Button>
              </div>
            ) : action.type === 'generate_course' ? (
              <div className="mt-3 space-y-3">
                <Button variant="outline" disabled={isGeneratingCourse} onClick={() => onGenerateCourse(action.topic_id)}>
                  {isGeneratingCourse ? 'Forging Course...' : 'Forge Micro-Course'}
                </Button>
                {courseGenerationStatus ? (
                  <p className="text-sm text-amber-100/75">{courseGenerationStatus}</p>
                ) : null}
              </div>
            ) : action.route ? (
              <div className="mt-3">
                <Button asChild variant="outline">
                  <Link to={action.route}>{action.type === 'generate_course' ? 'Open Roadmap' : 'Open Course'}</Link>
                </Button>
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function PracticeRoomContent({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const roomQuery = usePracticeRoom(roomId);
  const execute = useExecutePracticeCode();
  const evaluate = useEvaluatePracticeSolution();
  const spawn = useSpawnPracticeEncounters(roomId);
  const submit = useSubmitPracticeEncounter(roomId);
  const courseGenerationController = useRef<AbortController | null>(null);
  const room = roomQuery.data;
  const [activeEncounterId, setActiveEncounterId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('> Awaiting invocation...');
  const [results, setResults] = useState<PracticeTestResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [helperPrompt, setHelperPrompt] = useState('');
  const [language, setLanguage] = useState<'javascript' | 'python'>('javascript');
  const [courseGenerationStatus, setCourseGenerationStatus] = useState<string | null>(null);
  const [isGeneratingCourse, setIsGeneratingCourse] = useState(false);
  const [submission, setSubmission] = useState<PracticeSubmissionResponse | null>(null);

  const activeEncounter = room?.encounters.find((encounter) => encounter.id === activeEncounterId) ?? null;
  const bossEncounter = room?.encounters.find((encounter) => encounter.encounter_type === 'boss') ?? null;

  useEffect(() => {
    if (!room) return;
    if (activeEncounterId && room.encounters.some((encounter) => encounter.id === activeEncounterId)) return;
    const nextEncounter =
      room.encounters.find((encounter) => encounter.status === 'available' || encounter.status === 'passed') ??
      room.encounters[0] ??
      null;
    if (nextEncounter) {
      setActiveEncounterId(nextEncounter.id);
    }
  }, [activeEncounterId, room]);

  useEffect(() => {
    if (!room || !activeEncounter) return;
    setLanguage(activeEncounter.challenge.language);
    setCode(readDraft(room.id, activeEncounter.id, starterCode(activeEncounter)));
    setOutput('> Awaiting invocation...');
    setResults([]);
    setFeedback(null);
    setSubmission(null);
  }, [activeEncounter, room]);

  useEffect(() => {
    if (!room || !activeEncounter) return;
    writeDraft(room.id, activeEncounter.id, code);
  }, [activeEncounter, code, room]);

  useEffect(() => {
    return () => {
      courseGenerationController.current?.abort();
    };
  }, []);

  if (roomQuery.isLoading) {
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

  if (roomQuery.error || !room) {
    return (
      <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card/35 p-8 text-center">
        <p className="text-lg font-semibold text-foreground">Practice room not found</p>
        <p className="max-w-xl text-sm text-muted-foreground">
          The room may not exist yet or the backend route is still being wired up.
        </p>
        <Button asChild>
          <Link to="/practice">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Practice
          </Link>
        </Button>
      </div>
    );
  }

  const selectedChallenge = activeEncounter?.challenge;
  const activeIsBoss = activeEncounter?.encounter_type === 'boss';
  const bossReady = room.boss_available && room.attempt_tokens === room.max_attempt_tokens;
  const canSubmitActiveEncounter = Boolean(activeEncounter) && activeEncounter?.status !== 'locked' && room.status !== 'completed';
  const visibleTestCount = selectedChallenge ? selectedChallenge.visible_tests.filter((testCase) => !testCase.is_hidden).length : 0;

  const roomMeta = [
    <Badge key="category" variant="outline">
      {room.category}
    </Badge>,
    <Badge key="subcategory" variant="outline">
      {room.subcategory}
    </Badge>,
    room.selected_subtopic ? (
      <Badge key="subtopic" variant="outline">
        {room.selected_subtopic}
      </Badge>
    ) : null,
    <Badge key="attempts" className="border-emerald-500/30 bg-emerald-500/15 text-emerald-300">
      {room.attempt_tokens}/{room.max_attempt_tokens} attempts
    </Badge>,
    <Badge key="status" variant="outline">
      {room.status}
    </Badge>,
  ];

  const selectEncounter = (encounter: PracticeEncounter) => {
    setActiveEncounterId(encounter.id);
  };

  const selectBossEncounter = () => {
    if (!bossEncounter) return;
    setActiveEncounterId(bossEncounter.id);
    if (!room.boss_available && !room.boss_defeated) {
      toast.info('Clear the standard encounters and restore your attempts to full before challenging the boss.');
    }
  };

  const runCode = async () => {
    if (!activeEncounter) return;
    setOutput('> Casting spell...');
    try {
      const response = await execute.mutateAsync({
        code,
        language,
        entrypoint_name: activeEncounter.challenge.entrypoint_name,
        test_cases: normalizeTests(activeEncounter.challenge.visible_tests),
      });
      setSubmission(null);
      setOutput(response.stdout || response.stderr || '> Execution complete');
      setResults(response.test_results ?? []);
    } catch (error) {
      setOutput('> Execution failed.');
      toast.error(error instanceof Error ? error.message : 'Failed to run code.');
    }
  };

  const submitEncounter = async () => {
    if (!activeEncounter) return;
    try {
      const response = await submit.mutateAsync({ encounterId: activeEncounter.id, code });
      setSubmission(response);
      setOutput(response.stdout || response.stderr || '> Submission complete');
      setResults(response.visible_test_results ?? []);

      if (response.room.status === 'completed') {
        setFeedback('Boss defeated. The room is complete.');
        toast.success('Boss defeated.');
      } else if (response.passed) {
        setFeedback('Encounter cleared. Your token pool recovered by one.');
        toast.success('Encounter cleared.');
      } else if (response.room.status === 'remediation_required') {
        setFeedback('Attempts exhausted. Use the recovery options below to rebuild your token pool.');
        toast.error('Attempts exhausted.');
      } else {
        setFeedback('Encounter failed. One attempt token was lost.');
        toast.error('Encounter failed.');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit encounter.');
    }
  };

  const evaluateSolution = async () => {
    if (!activeEncounter) return;
    try {
      const response = await evaluate.mutateAsync({
        code,
        language,
        challenge_description: helperPrompt.trim()
          ? `${activeEncounter.challenge.instructions}\n\nLearner request: ${helperPrompt.trim()}`
          : activeEncounter.challenge.instructions,
        test_results: normalizeResults(results),
      });
      setFeedback(response.feedback);
      toast.info(`Score ${response.score}/100`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to evaluate solution.');
    }
  };

  const spawnMore = async (count: 1 | 3) => {
    try {
      await spawn.mutateAsync({ count });
      toast.success(`Spawned ${count} encounter${count === 1 ? '' : 's'}.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to spawn additional encounters.');
    }
  };

  const generateMicroCourse = (topicId: number | null) => {
    if (!topicId) {
      toast.error('This floor does not have a topic available for course generation.');
      return;
    }

    courseGenerationController.current?.abort();
    setIsGeneratingCourse(true);
    setCourseGenerationStatus('Initiating micro-course generation...');

    courseGenerationController.current = generateCourseStream([topicId], {
      onStatus: (data) => {
        setCourseGenerationStatus((data.message as string) || 'Forging course content...');
      },
      onChunk: () => {},
      onComplete: (data) => {
        setIsGeneratingCourse(false);
        setCourseGenerationStatus('Micro-course ready.');
        const courseId = data.course_id;
        if (typeof courseId === 'number') {
          toast.success('Micro-course forged.');
          navigate(`/course/${courseId}`);
          return;
        }
        toast.error('Course generation completed without a course id.');
      },
      onError: (data) => {
        setIsGeneratingCourse(false);
        const message = (data.message as string) || 'Course generation failed.';
        setCourseGenerationStatus(message);
        toast.error(message);
      },
    });
  };

  return (
    <LearningWorkspace
      header={{
        title: room.title,
        subtitle: room.practice_goal ?? 'Select a challenge, conserve your attempts, and reach the boss fight with a full stack.',
        meta: roomMeta,
        actions: (
          <>
            <Button variant="outline" asChild>
              <Link to="/practice">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Floors
              </Link>
            </Button>
            <Button variant="outline" onClick={() => void spawnMore(1)} disabled={spawn.isPending || room.status === 'completed'}>
              <Menu className="mr-2 h-4 w-4" />
              Spawn 1
            </Button>
            <Button variant="outline" onClick={() => void spawnMore(3)} disabled={spawn.isPending || room.status === 'completed'}>
              <Menu className="mr-2 h-4 w-4" />
              Spawn 3
            </Button>
            <Button variant="fantasy" onClick={selectBossEncounter} disabled={!bossEncounter || room.boss_defeated} className="gap-2">
              <Trophy className="h-4 w-4" />
              {room.boss_defeated ? 'Boss Defeated' : room.boss_available ? 'Challenge Boss' : 'View Boss'}
            </Button>
          </>
        ),
      }}
      railTitle="Encounters"
      railDescription="Three trials, then the boss. Clear fights to regain your tokens."
      rail={<EncounterRail room={room} activeEncounterId={activeEncounterId} onSelect={selectEncounter} />}
      instructionTitle={activeIsBoss ? 'Boss Briefing' : 'Encounter Briefing'}
      instructionMeta={
        <>
          <Badge className={cn('border', difficultyBadge(selectedChallenge?.difficulty))}>{selectedChallenge?.difficulty ?? room.difficulty}</Badge>
          <Badge variant="outline">{selectedChallenge?.language ?? room.language}</Badge>
          <Badge variant="outline">{visibleTestCount} visible tests</Badge>
        </>
      }
      instruction={
        selectedChallenge ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className={cn('border', encounterTone(activeEncounter?.status))}>{activeEncounter?.status ?? 'available'}</Badge>
              {activeIsBoss ? (
                <Badge className="border-violet-500/30 bg-violet-500/15 text-violet-300">Boss</Badge>
              ) : null}
              <Badge variant="outline">{selectedChallenge.xp_reward} XP</Badge>
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-foreground">{selectedChallenge.title}</h2>
              {selectedChallenge.explanation ? (
                <p className="text-sm text-muted-foreground">{selectedChallenge.explanation}</p>
              ) : null}
            </div>

            {activeIsBoss && !bossReady && !room.boss_defeated ? (
              <div className="rounded-2xl border border-violet-500/30 bg-violet-500/10 p-4 text-sm text-violet-100">
                The boss is locked until every standard challenge is cleared and your attempt pool is back at {room.max_attempt_tokens}.
              </div>
            ) : null}

            <article className="prose prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                {selectedChallenge.instructions}
              </ReactMarkdown>
            </article>

            {selectedChallenge.examples.length ? (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Examples</h3>
                {selectedChallenge.examples.map((example) => (
                  <div key={`${example.input}-${example.output}`} className="rounded-2xl border border-border/70 bg-background/35 p-3 text-sm">
                    <div className="text-muted-foreground">
                      Input: <span className="text-foreground">{example.input}</span>
                    </div>
                    <div className="text-muted-foreground">
                      Output: <span className="text-foreground">{example.output}</span>
                    </div>
                    {example.explanation ? <div className="mt-2 text-muted-foreground">{example.explanation}</div> : null}
                  </div>
                ))}
              </div>
            ) : null}

            {selectedChallenge.constraints.length ? (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Constraints</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {selectedChallenge.constraints.map((constraint) => (
                    <li key={constraint} className="flex gap-2">
                      <Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{constraint}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {submission ? (
              <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    className={cn(
                      'border',
                      submission.passed
                        ? 'border-emerald-500/30 bg-emerald-500/15 text-emerald-300'
                        : 'border-rose-500/30 bg-rose-500/15 text-rose-300'
                    )}
                  >
                    {submission.passed ? 'Passed' : 'Not Yet'}
                  </Badge>
                  <Badge variant="outline">
                    Hidden tests {submission.hidden_test_summary.passed}/{submission.hidden_test_summary.total}
                  </Badge>
                  {submission.score !== null ? <Badge variant="outline">Score {submission.score}</Badge> : null}
                </div>
                <p className="mt-3">
                  {submission.passed
                    ? 'You cleared this encounter on authoritative grading.'
                    : 'Your last submission did not pass all authoritative tests.'}
                </p>
              </div>
            ) : null}

            {feedback ? (
              <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">{feedback}</div>
            ) : null}

            {room.status === 'remediation_required' ? (
              <RemediationPanel
                actions={room.remediation_actions}
                courseGenerationStatus={courseGenerationStatus}
                isGeneratingCourse={isGeneratingCourse}
                isSpawning={spawn.isPending}
                onGenerateCourse={generateMicroCourse}
                onSpawnMore={spawnMore}
              />
            ) : null}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Select an encounter from the rail to begin.</p>
        )
      }
      workspaceTitle="spellbook"
      workspaceMeta={
        <>
          <Badge variant="outline">{language}</Badge>
          <Badge variant="outline">{room.attempt_tokens} tokens</Badge>
        </>
      }
      workspace={
        <div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111827]">
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-300" />
              <span>{selectedChallenge?.title ?? 'Untitled encounter'}</span>
            </div>
            <span className="uppercase tracking-[0.24em]">{language}</span>
          </div>

          <div className="min-h-0 flex-1">
            <Editor
              height="100%"
              language={language}
              value={code}
              onChange={(value) => setCode(value ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                automaticLayout: true,
                scrollBeyondLastLine: false,
                padding: { top: 16 },
                wordWrap: 'on',
                fontFamily: 'JetBrains Mono, Fira Code, monospace',
              }}
            />
          </div>

          <div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3">
            <Button variant="outline" onClick={() => void runCode()} disabled={execute.isPending || !activeEncounter} className="gap-2">
              {execute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              Run
            </Button>
            <Button onClick={() => void submitEncounter()} disabled={submit.isPending || !canSubmitActiveEncounter} className="gap-2">
              {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
              Submit
            </Button>
            <Button variant="outline" onClick={() => setCode(starterCode(activeEncounter))} disabled={!activeEncounter} className="gap-2">
              <RotateCcw className="h-4 w-4" />
              Reset
            </Button>
            <Button variant="outline" onClick={() => void evaluateSolution()} disabled={evaluate.isPending || results.length === 0 || !activeEncounter} className="gap-2">
              <Target className="h-4 w-4" />
              AI Helper
            </Button>
          </div>

          <Separator className="bg-white/10" />

          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-3 p-4">
              <div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-slate-200">
                <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">Console</div>
                <pre className={cn('whitespace-pre-wrap break-words', output.includes('Error') ? 'text-rose-300' : 'text-slate-200')}>
                  {output}
                </pre>
              </div>

              {results.length ? (
                <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4">
                  <div className="text-xs uppercase tracking-[0.24em] text-slate-500">Visible test results</div>
                  {results.map((result, index) => (
                    <div
                      key={`${result.input}-${index}`}
                      className={cn(
                        'flex gap-3 rounded-xl border p-3 text-sm',
                        result.passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10'
                      )}
                    >
                      <span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        {result.passed ? 'Pass' : 'Fail'}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="text-slate-300">Input: {result.input}</div>
                        {!result.passed ? (
                          <div className="text-slate-400">Expected {result.expected}, got {result.actual}</div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}

              <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">AI helper prompt</div>
                <Textarea
                  value={helperPrompt}
                  onChange={(event) => setHelperPrompt(event.target.value)}
                  placeholder="Ask for a hint, a debugging angle, or a smaller sub-problem before running the AI helper."
                  className="min-h-[8rem] border-white/10 bg-black/30 text-slate-100"
                />
              </div>
            </div>
          </ScrollArea>
        </div>
      }
    />
  );
}

export function PracticeRoom() {
  const { roomId } = useParams<{ roomId: string }>();

  if (!roomId) {
    return null;
  }

  return <PracticeRoomContent roomId={roomId} />;
}
