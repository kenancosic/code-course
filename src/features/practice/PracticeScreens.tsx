import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import { ArrowLeft, CheckCircle2, ChevronRight, Filter, Loader2, Menu, Play, Plus, RotateCcw, Search, Shield, Sparkles, Star, Sword, Target, Trophy, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../../app/components/ui/accordion';
import { Badge } from '../../app/components/ui/badge';
import { Button } from '../../app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../app/components/ui/dialog';
import { Input } from '../../app/components/ui/input';
import { Label } from '../../app/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../app/components/ui/select';
import { Separator } from '../../app/components/ui/separator';
import { ScrollArea } from '../../app/components/ui/scroll-area';
import { Skeleton } from '../../app/components/ui/skeleton';
import { Textarea } from '../../app/components/ui/textarea';
import { cn } from '../../lib/utils';
import { LearningWorkspace } from '../workspace/LearningWorkspace';
import {
  useCreatePracticeRoom,
  useEvaluatePracticeSolution,
  useExecutePracticeCode,
  useGeneratePracticeChallenge,
  usePracticeCatalog,
  usePracticeRoom,
  useSpawnPracticeEncounters,
  useSubmitPracticeEncounter,
} from '../../hooks';
import type {
  PracticeCatalogResponse,
  PracticeDifficulty,
  PracticeDisplayTestCase,
  PracticeEncounter,
  PracticeFloorSummary,
  PracticeLanguage,
  PracticeRoom,
  PracticeTestResult,
} from '../../hooks/use-practice';

function floorLabel(floor: PracticeFloorSummary) {
  return `${floor.category} / ${floor.subcategory}`;
}

function readDraft(roomId: string, encounterId: string, fallback: string) {
  if (typeof window === 'undefined') return fallback;
  return window.localStorage.getItem(`practice:${roomId}:${encounterId}`) ?? fallback;
}

function writeDraft(roomId: string, encounterId: string, code: string) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(`practice:${roomId}:${encounterId}`, code);
}

function starterCode(encounter?: PracticeEncounter | null) {
  return encounter?.challenge.starter_code ?? (encounter?.challenge.language === 'python' ? 'def solution(*args):\n    pass\n' : 'function solution(...args) {\n  // write your solution\n}\n');
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
  if (difficulty === 'advanced') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (difficulty === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  if (difficulty === 'boss') return 'bg-violet-500/15 text-violet-300 border-violet-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
}

function GenerateChallengeDialog({ floors }: { floors: PracticeFloorSummary[] }) {
  const generate = useGeneratePracticeChallenge();
  const floorOptions = floors;
  const [open, setOpen] = useState(false);
  const [floorId, setFloorId] = useState<number | null>(floors[0]?.id ?? null);
  const [language, setLanguage] = useState<PracticeLanguage>('javascript');
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [subtopic, setSubtopic] = useState('');
  const [practiceGoal, setPracticeGoal] = useState('');
  const [boss, setBoss] = useState(false);

  const selectedFloor = floorOptions.find((floor) => floor.id === floorId) ?? floorOptions[0] ?? null;

  useEffect(() => {
    if (!selectedFloor) return;
    if (floorId === null) setFloorId(selectedFloor.id);
  }, [floorId, selectedFloor]);

  const submit = async () => {
    if (!selectedFloor) return;
    await generate.mutateAsync({
      floor_id: selectedFloor.id,
      language,
      target_difficulty: difficulty,
      subtopic: subtopic || null,
      practice_goal: practiceGoal || null,
      boss,
    });
    toast.success('Challenge generation request sent.');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="fantasy" className="gap-2"><Wand2 className="h-4 w-4" />Generate Challenge</Button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[min(46rem,calc(100svh-2rem))] w-[min(96vw,52rem)] gap-4 overflow-hidden border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" />Forge a New Challenge</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Floor</Label>
            <Select value={String(floorId ?? selectedFloor?.id ?? '')} onValueChange={(value) => setFloorId(Number(value))}>
              <SelectTrigger><SelectValue placeholder="Choose a floor" /></SelectTrigger>
              <SelectContent>
                {floorOptions.map((floor) => <SelectItem key={floor.id} value={String(floor.id)}>{floorLabel(floor)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as PracticeLanguage)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="javascript">JavaScript</SelectItem><SelectItem value="python">Python</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Difficulty</Label>
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as PracticeDifficulty)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="easy">Easy</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="hard">Hard</SelectItem></SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Subtopic</Label>
            <Input value={subtopic} onChange={(event) => setSubtopic(event.target.value)} placeholder="Array traversal, async control flow, component state..." />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Practice goal</Label>
            <Textarea value={practiceGoal} onChange={(event) => setPracticeGoal(event.target.value)} rows={4} placeholder="Describe the exact behavior, edge cases, or style you want the challenge to target." />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-3 sm:col-span-2">
            <input type="checkbox" checked={boss} onChange={(event) => setBoss(event.target.checked)} />
            <span className="text-sm text-muted-foreground">Generate a boss-tier challenge</span>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={() => void submit()} disabled={generate.isPending || !selectedFloor || !practiceGoal.trim()}>
            {generate.isPending ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Forging...</> : 'Generate'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FloorCard({ floor, onChallenge }: { floor: PracticeFloorSummary; onChallenge: (floorId: number) => void; }) {
  const primaryDifficulty = floor.difficulty_levels[0] ?? 'easy';
  const primaryLanguage = floor.language_options[0] ?? 'javascript';

  return (
    <AccordionItem value={String(floor.id)} className="rounded-2xl border border-border/70 bg-card/50 px-4">
      <AccordionTrigger className="py-4 hover:no-underline">
        <div className="flex w-full flex-wrap items-center gap-3 text-left">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{floorLabel(floor)}</h3>
              <Badge className={cn('border', difficultyBadge(primaryDifficulty))}>{primaryDifficulty}</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{floor.description ?? 'This floor connects roadmap topics into a practice area.'}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1"><Sword className="h-3.5 w-3.5" />{floor.category}</Badge>
            <Badge variant="outline" className="gap-1"><Shield className="h-3.5 w-3.5" />{floor.subcategory}</Badge>
            <Button size="sm" variant="outline" onClick={(event) => { event.stopPropagation(); onChallenge(floor.id); }}>
              Challenge Floor <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">{floor.subtopics.map((subtopic) => <Badge key={subtopic} variant="outline">{subtopic}</Badge>)}</div>
            <div className="grid gap-2 text-sm text-muted-foreground">
              <div className="flex items-center justify-between"><span>Challenges</span><span className="font-medium text-foreground">{floor.challenge_count}</span></div>
              <div className="flex items-center justify-between"><span>Languages</span><span className="font-medium text-foreground">{floor.language_options.join(', ')}</span></div>
              <div className="flex items-center justify-between"><span>Difficulty range</span><span className="font-medium text-foreground">{floor.difficulty_levels.join(', ')}</span></div>
              <div className="flex items-center justify-between"><span>Language focus</span><span className="font-medium text-foreground">{primaryLanguage}</span></div>
            </div>
          </div>
          <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
            <div className="grid gap-2 text-sm">
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Active room</span><span className="font-medium text-foreground">{floor.active_room_id ?? 'None'}</span></div>
              <div className="flex items-center justify-between"><span className="text-muted-foreground">Challenge count</span><span className="font-medium text-foreground">{floor.challenge_count}</span></div>
            </div>
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

export function PracticeCatalogScreen() {
  const navigate = useNavigate();
  const createRoom = useCreatePracticeRoom();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [subcategory, setSubcategory] = useState('all');
  const [difficulty, setDifficulty] = useState<PracticeDifficulty | 'all'>('all');
  const [language, setLanguage] = useState<PracticeLanguage | 'all'>('all');

  const { data, isLoading, error } = usePracticeCatalog(
    search,
    category === 'all' ? undefined : category,
    subcategory === 'all' ? undefined : subcategory
  );
  const floors = data?.floors ?? [];
  const filters = data?.filters ?? { categories: [], languages: ['javascript', 'python'], difficulties: ['easy', 'medium', 'hard'] };
  const subcategoryOptions = useMemo(() => {
    const scopedFloors = category === 'all' ? floors : floors.filter((floor) => floor.category === category);
    return Array.from(new Set(scopedFloors.map((floor) => floor.subcategory))).sort((left, right) => left.localeCompare(right));
  }, [category, floors]);

  useEffect(() => {
    if (subcategory !== 'all' && !subcategoryOptions.includes(subcategory)) {
      setSubcategory('all');
    }
  }, [subcategory, subcategoryOptions]);

  const filtered = useMemo(
    () => floors.filter((floor) =>
      (difficulty === 'all' || floor.difficulty_levels.includes(difficulty)) &&
      (language === 'all' || floor.language_options.includes(language))
    ),
    [difficulty, floors, language]
  );

  const challenge = async (floorId: number) => {
    const floor = floors.find((item) => item.id === floorId);
    const room = await createRoom.mutateAsync({
      floor_id: floorId,
      language: (floor?.language_options[0] ?? 'javascript') as PracticeLanguage,
      difficulty: (floor?.difficulty_levels[0] ?? 'easy') as PracticeDifficulty,
      selected_subtopic: floor?.subtopics[0] ?? null,
      practice_goal: floor?.description ?? null,
    });
    navigate(`/practice/room/${room.id}`);
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-5 shadow-[0_0_50px_rgba(0,0,0,0.18)] backdrop-blur-md xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground"><Star className="h-4 w-4 text-amber-400" />Practice Grounds</div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Choose a floor, then descend.</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">Browse challenge areas by roadmap category and topic. Expand any floor to inspect the boss fight, related goals, and starting assumptions before you enter.</p>
        </div>
        <GenerateChallengeDialog floors={floors} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/35 p-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(4,minmax(11rem,14rem))]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search floors, topics, tags..." className="pl-9" /></div>
        <Select value={category} onValueChange={setCategory}><SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Category" /></SelectTrigger><SelectContent><SelectItem value="all">All categories</SelectItem>{filters.categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={subcategory} onValueChange={setSubcategory} disabled={subcategoryOptions.length === 0}><SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Subcategory" /></SelectTrigger><SelectContent><SelectItem value="all">All subcategories</SelectItem>{subcategoryOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={difficulty} onValueChange={(value) => setDifficulty(value as PracticeDifficulty | 'all')}><SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Difficulty" /></SelectTrigger><SelectContent><SelectItem value="all">All difficulties</SelectItem>{filters.difficulties.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        <Select value={language} onValueChange={(value) => setLanguage(value as PracticeLanguage | 'all')}><SelectTrigger><Filter className="mr-2 h-4 w-4" /><SelectValue placeholder="Language" /></SelectTrigger><SelectContent><SelectItem value="all">All languages</SelectItem>{filters.languages.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3">{Array.from({ length: 4 }).map((_, index) => <Skeleton key={index} className="h-28 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">Failed to load practice floors. The backend catalog endpoint may not be ready yet.</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/35 p-10 text-center text-muted-foreground">No floors match your filters yet.</div>
      ) : (
        <Accordion type="multiple" className="space-y-3">{filtered.map((floor) => <FloorCard key={floor.id} floor={floor} onChallenge={challenge} />)}</Accordion>
      )}

      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 text-sm text-muted-foreground"><div className="flex flex-wrap items-center gap-2"><Plus className="h-4 w-4 text-primary" /><span className="font-medium text-foreground">{filtered.length}</span><span>floors visible from</span><span className="font-medium text-foreground">{floors.length}</span><span>loaded areas.</span></div></div>
    </div>
  );
}

function EncounterRail({ room, activeEncounterId, onSelect }: { room: PracticeRoom; activeEncounterId: string | null; onSelect: (encounter: PracticeEncounter) => void; }) {
  return (
    <div className="space-y-3 p-3">
      {room.encounters.map((encounter) => {
        const isActive = String(encounter.id) === String(activeEncounterId);
        return (
          <button key={encounter.id} onClick={() => onSelect(encounter)} className={cn('flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition-colors', isActive ? 'border-primary/40 bg-primary/10' : 'border-border/70 bg-background/35 hover:bg-background/55')}>
            <div className={cn('mt-0.5 rounded-full border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]', encounterTone(encounter.status))}>{encounter.encounter_type}</div>
            <div className="min-w-0 flex-1"><div className="truncate font-medium text-foreground">{encounter.challenge.title}</div><div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="capitalize">{encounter.challenge.difficulty}</span><span>·</span><span>{encounter.challenge.language}</span><span>·</span><span>{encounter.attempts_used} attempts used</span></div></div>
          </button>
        );
      })}
    </div>
  );
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

export function PracticeRoomScreen({ roomId }: { roomId: string }) {
  const navigate = useNavigate();
  const roomQuery = usePracticeRoom(roomId);
  const execute = useExecutePracticeCode();
  const evaluate = useEvaluatePracticeSolution();
  const spawn = useSpawnPracticeEncounters(roomId);
  const submit = useSubmitPracticeEncounter(roomId);
  const room = roomQuery.data;
  const [activeEncounter, setActiveEncounter] = useState<PracticeEncounter | null>(null);
  const [code, setCode] = useState('');
  const [output, setOutput] = useState('> Awaiting invocation...');
  const [results, setResults] = useState<PracticeTestResult[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [answer, setAnswer] = useState('');
  const [language, setLanguage] = useState<PracticeLanguage>('javascript');

  useEffect(() => {
    if (!room) return;
    const nextEncounter = room.encounters.find((encounter) => encounter.status === 'available' || encounter.status === 'passed') ?? room.encounters[0] ?? null;
    if (nextEncounter) {
      setActiveEncounter(nextEncounter);
      setLanguage(nextEncounter.challenge.language);
      setCode(readDraft(room.id, nextEncounter.id, starterCode(nextEncounter)));
      setOutput('> Awaiting invocation...');
      setResults([]);
      setFeedback(null);
    }
  }, [room]);

  useEffect(() => {
    if (!room || !activeEncounter) return;
    writeDraft(room.id, activeEncounter.id, code);
  }, [code, activeEncounter, room]);

  if (roomQuery.isLoading) {
    return <div className="grid h-full min-h-0 gap-4 overflow-hidden"><Skeleton className="h-24 w-full rounded-2xl" /><div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[18rem_minmax(0,1fr)]"><Skeleton className="h-full rounded-2xl" /><Skeleton className="h-full rounded-2xl" /></div></div>;
  }

  if (roomQuery.error || !room) {
    return <div className="flex h-full min-h-0 flex-col items-center justify-center gap-4 rounded-2xl border border-border/70 bg-card/35 p-8 text-center"><p className="text-lg font-semibold text-foreground">Practice room not found</p><p className="max-w-xl text-sm text-muted-foreground">The room may not exist yet or the backend route is still being wired up.</p><Button asChild><Link to="/practice"><ArrowLeft className="mr-2 h-4 w-4" />Back to Practice</Link></Button></div>;
  }

  const activeIsBoss = Boolean(activeEncounter?.encounter_type === 'boss');
  const bossReady = room.boss_available && room.attempt_tokens === room.max_attempt_tokens;
  const selectedChallenge = activeEncounter?.challenge;
  const visibleTestCount = selectedChallenge ? selectedChallenge.visible_tests.filter((testCase) => !testCase.is_hidden).length : 0;

  const roomMeta = [
    <Badge key="category" variant="outline">{room.category}</Badge>,
    <Badge key="subcategory" variant="outline">{room.subcategory}</Badge>,
    <Badge key="attempts" className="bg-emerald-500/15 text-emerald-300 border-emerald-500/30">{room.attempt_tokens}/{room.max_attempt_tokens} attempts</Badge>,
    <Badge key="status" variant="outline">{room.status}</Badge>,
  ];

  const selectEncounter = (encounter: PracticeEncounter) => {
    setActiveEncounter(encounter);
    setLanguage(encounter.challenge.language);
    setCode(readDraft(room.id, encounter.id, starterCode(encounter)));
    setResults([]);
    setOutput('> Awaiting invocation...');
    setFeedback(null);
  };

  const runCode = async () => {
    if (!activeEncounter) return;
    setOutput('> Casting spell...');
    const response = await execute.mutateAsync({
      code,
      language,
      entrypoint_name: activeEncounter.challenge.entrypoint_name,
      test_cases: normalizeTests(activeEncounter.challenge.visible_tests),
    });
    setOutput(response.stdout || response.stderr || '> Execution complete');
    setResults(response.test_results ?? []);
  };

  const submitEncounter = async () => {
    if (!activeEncounter) return;
    const response = await submit.mutateAsync({ encounterId: activeEncounter.id, code });
    if (response.room) {
      setFeedback(response.room.status === 'completed' ? 'Room completed.' : 'Encounter resolved.');
    }
    toast.success('Encounter submitted.');
  };

  const evaluateSolution = async () => {
    if (!activeEncounter) return;
    const response = await evaluate.mutateAsync({
      code,
      language,
      challenge_description: activeEncounter.challenge.instructions,
      test_results: normalizeResults(results),
    });
    setFeedback(response.feedback);
    toast.info(`Score ${response.score}/100`);
  };

  const spawnMore = async (count: 1 | 3) => {
    await spawn.mutateAsync({ count });
    toast.success(`Spawned ${count} encounter${count === 1 ? '' : 's'}.`);
  };

  return (
    <LearningWorkspace
      header={{
        title: room.title,
        subtitle: room.practice_goal ?? 'Select a challenge, conserve your attempts, and reach the boss fight with a full stack.',
        meta: roomMeta,
        actions: (<>
          <Button variant="outline" asChild><Link to="/practice"><ArrowLeft className="mr-2 h-4 w-4" />Back to Floors</Link></Button>
          <Button variant="outline" onClick={() => void spawnMore(1)} disabled={spawn.isPending}><Menu className="mr-2 h-4 w-4" />Spawn 1</Button>
          <Button variant="outline" onClick={() => void spawnMore(3)} disabled={spawn.isPending}><Menu className="mr-2 h-4 w-4" />Spawn 3</Button>
          <Button variant="fantasy" onClick={() => void submitEncounter()} disabled={!bossReady && !activeIsBoss} className="gap-2"><Trophy className="h-4 w-4" />Boss Fight</Button>
        </>),
      }}
      railTitle="Encounters"
      railDescription="Three trials, then the boss. Clear fights to regain your tokens."
      rail={<EncounterRail room={room} activeEncounterId={activeEncounter?.id ?? null} onSelect={selectEncounter} />}
      instructionTitle={activeEncounter?.encounter_type === 'boss' ? 'Boss Briefing' : 'Encounter Briefing'}
      instructionMeta={<><Badge className={cn('border', difficultyBadge(selectedChallenge?.difficulty))}>{selectedChallenge?.difficulty ?? room.difficulty}</Badge><Badge variant="outline">{selectedChallenge?.language ?? room.language}</Badge><Badge variant="outline">{visibleTestCount} visible tests</Badge></>}
      instruction={selectedChallenge ? (<div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><Badge className={cn('border', encounterTone(activeEncounter?.status))}>{activeEncounter?.status ?? 'available'}</Badge>{activeEncounter?.encounter_type === 'boss' ? <Badge className="bg-violet-500/15 text-violet-300 border-violet-500/30">Boss</Badge> : null}<Badge variant="outline">{selectedChallenge.xp_reward} XP</Badge></div><h2 className="text-2xl font-semibold text-foreground">{selectedChallenge.title}</h2><article className="prose prose-invert max-w-none"><ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>{selectedChallenge.instructions}</ReactMarkdown></article>{selectedChallenge.examples.length ? <div className="space-y-3"><h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Examples</h3>{selectedChallenge.examples.map((example) => <div key={`${example.input}-${example.output}`} className="rounded-2xl border border-border/70 bg-background/35 p-3 text-sm"><div className="text-muted-foreground">Input: <span className="text-foreground">{example.input}</span></div><div className="text-muted-foreground">Output: <span className="text-foreground">{example.output}</span></div>{example.explanation ? <div className="mt-2 text-muted-foreground">{example.explanation}</div> : null}</div>)}</div> : null}{selectedChallenge.constraints.length ? <div className="space-y-2"><h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Constraints</h3><ul className="space-y-2 text-sm text-muted-foreground">{selectedChallenge.constraints.map((constraint) => <li key={constraint} className="flex gap-2"><Shield className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><span>{constraint}</span></li>)}</ul></div> : null}{room.attempt_tokens === 0 ? <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-200">Your attempts are exhausted. Revisit the course, generate a focused challenge, or spawn extra encounters to recover tokens.</div> : null}{feedback ? <div className="rounded-2xl border border-border/70 bg-card/40 p-4 text-sm text-muted-foreground">{feedback}</div> : null}</div>) : <p className="text-sm text-muted-foreground">Select an encounter from the rail to begin.</p>}
      workspaceTitle="spellbook"
      workspaceMeta={<><Badge variant="outline">{language}</Badge><Badge variant="outline">{room.attempt_tokens} tokens</Badge></>}
      workspace={<div className="flex h-full min-h-0 flex-col overflow-hidden bg-[#111827]"><div className="flex items-center justify-between border-b border-white/10 px-4 py-3 text-xs text-slate-400"><div className="flex items-center gap-2"><Sparkles className="h-4 w-4 text-amber-300" /><span>{selectedChallenge?.title ?? 'Untitled encounter'}</span></div><span className="uppercase tracking-[0.24em]">{language}</span></div><div className="min-h-0 flex-1"><Editor height="100%" language={language} value={code} onChange={(value) => setCode(value ?? '')} theme="vs-dark" options={{ minimap: { enabled: false }, fontSize: 14, lineNumbers: 'on', automaticLayout: true, scrollBeyondLastLine: false, padding: { top: 16 }, wordWrap: 'on', fontFamily: 'JetBrains Mono, Fira Code, monospace' }} /></div><div className="flex flex-wrap gap-2 border-t border-white/10 px-4 py-3"><Button variant="outline" onClick={() => void runCode()} disabled={execute.isPending} className="gap-2">{execute.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}Run</Button><Button onClick={() => void submitEncounter()} disabled={submit.isPending} className="gap-2">{submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}Submit</Button><Button variant="outline" onClick={() => setCode(starterCode(activeEncounter))} className="gap-2"><RotateCcw className="h-4 w-4" />Reset</Button><Button variant="outline" onClick={() => void evaluateSolution()} disabled={evaluate.isPending || results.length === 0} className="gap-2"><Target className="h-4 w-4" />Evaluate</Button></div><Separator className="bg-white/10" /><ScrollArea className="min-h-0 flex-1"><div className="space-y-3 p-4"><div className="rounded-2xl border border-white/10 bg-black/40 p-4 font-mono text-sm text-slate-200"><div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">Console</div><pre className={cn('whitespace-pre-wrap break-words', output.includes('Error') ? 'text-rose-300' : 'text-slate-200')}>{output}</pre></div>{results.length ? <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-4"><div className="text-xs uppercase tracking-[0.24em] text-slate-500">Test results</div>{results.map((result, index) => <div key={`${result.input}-${index}`} className={cn('flex gap-3 rounded-xl border p-3 text-sm', result.passed ? 'border-emerald-500/30 bg-emerald-500/10' : 'border-rose-500/30 bg-rose-500/10')}><span className="shrink-0 text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">{result.passed ? 'Pass' : 'Fail'}</span><div className="min-w-0 flex-1"><div className="text-slate-300">Input: {result.input}</div>{!result.passed ? <div className="text-slate-400">Expected {result.expected}, got {result.actual}</div> : null}</div></div>)}</div> : null}<div className="rounded-2xl border border-white/10 bg-black/20 p-4"><div className="mb-2 text-xs uppercase tracking-[0.24em] text-slate-500">AI helper</div><Textarea value={answer} onChange={(event) => setAnswer(event.target.value)} placeholder="Ask for hints, reasoning, or a smaller sub-problem." className="min-h-[8rem] border-white/10 bg-black/30 text-slate-100" /></div></div></ScrollArea></div>}
    />
  );
}




