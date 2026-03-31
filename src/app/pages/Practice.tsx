import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router';
import {
  BookOpen,
  ChevronRight,
  Filter,
  Loader2,
  Plus,
  Search,
  Shield,
  Sparkles,
  Star,
  Sword,
  Wand2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../components/ui/accordion';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Skeleton } from '../components/ui/skeleton';
import { Textarea } from '../components/ui/textarea';
import {
  useCreatePracticeRoom,
  useGeneratePracticeChallenge,
  usePracticeCatalog,
  usePracticeFloor,
} from '../../hooks';
import type {
  PracticeChallenge,
  PracticeDifficulty,
  PracticeFloorSummary,
  PracticeLanguage,
} from '../../hooks/use-practice';
import { cn } from '../../lib/utils';

function floorLabel(floor: PracticeFloorSummary) {
  return `${floor.category} / ${floor.subcategory}`;
}

function difficultyBadge(difficulty?: string) {
  if (difficulty === 'hard') return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
  if (difficulty === 'medium') return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
  return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
}

function templateTone(challenge: PracticeChallenge) {
  if (challenge.challenge_kind === 'boss') return 'border-violet-500/30 bg-violet-500/10';
  if (challenge.challenge_kind === 'spawned') return 'border-sky-500/30 bg-sky-500/10';
  return 'border-border/70 bg-background/35';
}

function GenerateChallengeDialog({ floors }: { floors: PracticeFloorSummary[] }) {
  const generate = useGeneratePracticeChallenge();
  const [open, setOpen] = useState(false);
  const [floorId, setFloorId] = useState<number | null>(floors[0]?.id ?? null);
  const [language, setLanguage] = useState<PracticeLanguage>('javascript');
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [subtopic, setSubtopic] = useState('');
  const [practiceGoal, setPracticeGoal] = useState('');
  const [boss, setBoss] = useState(false);

  const selectedFloor = floors.find((floor) => floor.id === floorId) ?? floors[0] ?? null;

  useEffect(() => {
    if (!selectedFloor) return;
    if (floorId === null) setFloorId(selectedFloor.id);
  }, [floorId, selectedFloor]);

  const submit = async () => {
    if (!selectedFloor) return;
    try {
      const challenge = await generate.mutateAsync({
        floor_id: selectedFloor.id,
        language,
        target_difficulty: difficulty,
        subtopic: subtopic.trim() || null,
        practice_goal: practiceGoal.trim() || null,
        boss,
      });
      toast.success(`Forged ${challenge.title}.`);
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to generate challenge.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="fantasy" className="gap-2">
          <Wand2 className="h-4 w-4" />
          Generate Challenge
        </Button>
      </DialogTrigger>
      <DialogContent className="grid max-h-[min(46rem,calc(100svh-2rem))] w-[min(96vw,52rem)] gap-4 overflow-hidden border-border bg-card text-foreground">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Forge a New Challenge
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 overflow-y-auto pr-1 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Floor</Label>
            <Select value={String(floorId ?? selectedFloor?.id ?? '')} onValueChange={(value) => setFloorId(Number(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a floor" />
              </SelectTrigger>
              <SelectContent>
                {floors.map((floor) => (
                  <SelectItem key={floor.id} value={String(floor.id)}>
                    {floorLabel(floor)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Language</Label>
            <Select value={language} onValueChange={(value) => setLanguage(value as PracticeLanguage)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="javascript">JavaScript</SelectItem>
                <SelectItem value="python">Python</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Skill level</Label>
            <Select value={difficulty} onValueChange={(value) => setDifficulty(value as PracticeDifficulty)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Subtopic</Label>
            <Input
              value={subtopic}
              onChange={(event) => setSubtopic(event.target.value)}
              placeholder="Array traversal, async control flow, component state..."
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Practice goal</Label>
            <Textarea
              value={practiceGoal}
              onChange={(event) => setPracticeGoal(event.target.value)}
              rows={4}
              placeholder="Describe exactly what you want this challenge to strengthen."
            />
          </div>
          <label className="flex items-center gap-3 rounded-2xl border border-border/70 bg-background/30 px-4 py-3 sm:col-span-2">
            <input type="checkbox" checked={boss} onChange={(event) => setBoss(event.target.checked)} />
            <span className="text-sm text-muted-foreground">Generate a boss-tier challenge</span>
          </label>
        </div>
        <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={() => void submit()} disabled={generate.isPending || !selectedFloor}>
            {generate.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Forging...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FloorCard({
  expanded,
  floor,
  isCreating,
  onChallenge,
}: {
  expanded: boolean;
  floor: PracticeFloorSummary;
  isCreating: boolean;
  onChallenge: (floorId: number) => void;
}) {
  const detailQuery = usePracticeFloor(expanded ? floor.id : null, expanded);
  const detail = detailQuery.data;
  const primaryDifficulty = floor.difficulty_levels[0] ?? 'easy';
  const primaryLanguage = floor.language_options[0] ?? 'javascript';
  const templates = detail?.challenge_templates.slice(0, 3) ?? [];
  const relatedCourses = detail?.related_courses.slice(0, 3) ?? [];

  return (
    <AccordionItem value={String(floor.id)} className="rounded-2xl border border-border/70 bg-card/50 px-4">
      <AccordionTrigger className="py-4 hover:no-underline">
        <div className="flex w-full flex-wrap items-center gap-3 text-left">
          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-foreground">{floorLabel(floor)}</h3>
              <Badge className={cn('border', difficultyBadge(primaryDifficulty))}>{primaryDifficulty}</Badge>
            </div>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
              {floor.description ?? 'This floor connects roadmap topics into a practice area.'}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="gap-1">
              <Sword className="h-3.5 w-3.5" />
              {floor.category}
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Shield className="h-3.5 w-3.5" />
              {floor.subcategory}
            </Badge>
            {floor.active_room_id ? (
              <Button asChild size="sm" variant="outline" onClick={(event) => event.stopPropagation()}>
                <Link to={`/practice/room/${floor.active_room_id}`}>Resume Room</Link>
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="outline"
              disabled={isCreating}
              onClick={(event) => {
                event.stopPropagation();
                onChallenge(floor.id);
              }}
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Forging Room
                </>
              ) : (
                <>
                  Challenge Floor
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </AccordionTrigger>
      <AccordionContent className="pb-4">
        {detailQuery.isLoading ? (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
            <Skeleton className="h-44 rounded-2xl" />
            <Skeleton className="h-44 rounded-2xl" />
          </div>
        ) : detailQuery.error ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            Floor details could not be loaded right now.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-[minmax(0,1.25fr)_minmax(16rem,0.75fr)]">
            <div className="space-y-4 rounded-2xl border border-border/70 bg-background/35 p-4">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Focus Areas</h4>
                <div className="flex flex-wrap gap-2">
                  {(detail?.floor.subtopics.length ? detail.floor.subtopics : floor.subtopics).map((subtopic) => (
                    <Badge key={subtopic} variant="outline">
                      {subtopic}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Recent Challenge Templates</h4>
                {templates.length ? (
                  <div className="space-y-2">
                    {templates.map((challenge) => (
                      <div key={challenge.id} className={cn('rounded-2xl border p-3 text-sm', templateTone(challenge))}>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{challenge.title}</span>
                          <Badge className={cn('border', difficultyBadge(challenge.difficulty))}>{challenge.difficulty}</Badge>
                          <Badge variant="outline">{challenge.language}</Badge>
                        </div>
                        <p className="mt-2 text-muted-foreground">{challenge.summary}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No saved templates yet. Generate one from the catalog header to seed this floor.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span>Challenges</span>
                    <span className="font-medium text-foreground">{floor.challenge_count}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Languages</span>
                    <span className="font-medium text-foreground">{floor.language_options.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Skill range</span>
                    <span className="font-medium text-foreground">{floor.difficulty_levels.join(', ')}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Language focus</span>
                    <span className="font-medium text-foreground">{primaryLanguage}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Active room</span>
                    <span className="font-medium text-foreground">{floor.active_room_id ?? 'None'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
                <h4 className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-muted-foreground">Related Courses</h4>
                {relatedCourses.length ? (
                  <div className="space-y-2">
                    {relatedCourses.map((course) => (
                      <Button key={course.id} asChild variant="outline" className="w-full justify-between">
                        <Link to={`/course/${course.id}`}>
                          <span className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4" />
                            {course.title}
                          </span>
                          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{course.status}</span>
                        </Link>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No related course has been forged for this floor yet.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </AccordionContent>
    </AccordionItem>
  );
}

export function Practice() {
  const navigate = useNavigate();
  const createRoom = useCreatePracticeRoom();
  const [expandedFloors, setExpandedFloors] = useState<string[]>([]);
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
  const filters = data?.filters ?? {
    categories: [],
    subcategories: [],
    languages: ['javascript', 'python'],
    difficulties: ['easy', 'medium', 'hard'],
  };

  const subcategoryOptions = useMemo(() => {
    if (category === 'all') return filters.subcategories;
    return Array.from(new Set(floors.map((floor) => floor.subcategory))).sort((left, right) => left.localeCompare(right));
  }, [category, filters.subcategories, floors]);

  useEffect(() => {
    if (subcategory !== 'all' && !subcategoryOptions.includes(subcategory)) {
      setSubcategory('all');
    }
  }, [subcategory, subcategoryOptions]);

  const filtered = useMemo(
    () =>
      floors.filter(
        (floor) =>
          (difficulty === 'all' || floor.difficulty_levels.includes(difficulty)) &&
          (language === 'all' || floor.language_options.includes(language))
      ),
    [difficulty, floors, language]
  );

  const challenge = async (floorId: number) => {
    const floor = floors.find((item) => item.id === floorId);
    try {
      const room = await createRoom.mutateAsync({
        floor_id: floorId,
        language: (floor?.language_options[0] ?? 'javascript') as PracticeLanguage,
        difficulty: (floor?.difficulty_levels[0] ?? 'easy') as PracticeDifficulty,
        selected_subtopic: floor?.subtopics[0] ?? null,
        practice_goal: floor?.description ?? null,
      });
      navigate(`/practice/room/${room.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create practice room.');
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-card/50 p-5 shadow-[0_0_50px_rgba(0,0,0,0.18)] backdrop-blur-md xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <Star className="h-4 w-4 text-amber-400" />
            Practice Grounds
          </div>
          <h1 className="text-4xl font-serif font-bold tracking-tight text-foreground">Choose a floor, then descend.</h1>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Browse challenge areas by roadmap category and topic. Expand a floor to inspect related courses, recent challenge templates, and the exact area you want to sharpen before opening a room.
          </p>
        </div>
        <GenerateChallengeDialog floors={floors} />
      </div>

      <div className="grid gap-3 rounded-2xl border border-border/70 bg-card/35 p-4 xl:grid-cols-[minmax(0,1.3fr)_repeat(4,minmax(10rem,13rem))]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search floors, topics, tags..."
            className="pl-9"
          />
        </div>
        <Select value={category} onValueChange={setCategory}>
          <SelectTrigger>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {filters.categories.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={subcategory} onValueChange={setSubcategory}>
          <SelectTrigger>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Subcategory" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All subcategories</SelectItem>
            {subcategoryOptions.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={difficulty} onValueChange={(value) => setDifficulty(value as PracticeDifficulty | 'all')}>
          <SelectTrigger>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Skill level" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All skill levels</SelectItem>
            {filters.difficulties.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={language} onValueChange={(value) => setLanguage(value as PracticeLanguage | 'all')}>
          <SelectTrigger>
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Language" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All languages</SelectItem>
            {filters.languages.map((item) => (
              <SelectItem key={item} value={item}>
                {item}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-3">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
          Failed to load practice floors. The backend catalog endpoint may not be ready yet.
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border/70 bg-card/35 p-10 text-center text-muted-foreground">
          No floors match your current search and filters yet.
        </div>
      ) : (
        <Accordion type="multiple" value={expandedFloors} onValueChange={setExpandedFloors} className="space-y-3">
          {filtered.map((floor) => (
            <FloorCard
              key={floor.id}
              expanded={expandedFloors.includes(String(floor.id))}
              floor={floor}
              isCreating={createRoom.isPending}
              onChallenge={challenge}
            />
          ))}
        </Accordion>
      )}

      <div className="rounded-2xl border border-border/70 bg-card/35 p-4 text-sm text-muted-foreground">
        <div className="flex flex-wrap items-center gap-2">
          <Plus className="h-4 w-4 text-primary" />
          <span className="font-medium text-foreground">{filtered.length}</span>
          <span>floors visible from</span>
          <span className="font-medium text-foreground">{floors.length}</span>
          <span>loaded areas.</span>
        </div>
      </div>
    </div>
  );
}
