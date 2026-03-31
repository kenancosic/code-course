import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type PracticeLanguage = 'javascript' | 'python';
export type PracticeDifficulty = 'easy' | 'medium' | 'hard';
export type EncounterType = 'standard' | 'spawned' | 'boss';
export type EncounterStatus = 'available' | 'locked' | 'passed' | 'failed';
export type RoomStatus = 'active' | 'remediation_required' | 'completed';

export interface PracticeDisplayTestCase {
  input: string;
  expected_output: string;
  is_hidden: boolean;
}

export interface PracticeTestResult {
  passed: boolean;
  input: string;
  expected: string;
  actual: string;
  is_hidden: boolean;
}

export interface PracticeChallenge {
  id: number;
  path_id: number | null;
  topic_id: number | null;
  lesson_id: number | null;
  title: string;
  summary: string;
  instructions: string;
  explanation: string | null;
  language: PracticeLanguage;
  difficulty: PracticeDifficulty;
  challenge_kind: EncounterType;
  entrypoint_name: string;
  starter_code: string;
  xp_reward: number;
  visible_tests: PracticeDisplayTestCase[];
  hints: string[];
  examples: Array<{
    input: string;
    output: string;
    explanation?: string | null;
  }>;
  constraints: string[];
  tags: string[];
  ai_generated: boolean;
  created_at: string;
}

export interface PracticeFloorSummary {
  id: number;
  path_id: number;
  topic_id: number;
  category: string;
  subcategory: string;
  description: string | null;
  subtopics: string[];
  difficulty_levels: PracticeDifficulty[];
  language_options: PracticeLanguage[];
  challenge_count: number;
  active_room_id: string | null;
}

export interface PracticeCatalogResponse {
  filters: {
    categories: string[];
    subcategories: string[];
    languages: PracticeLanguage[];
    difficulties: PracticeDifficulty[];
  };
  floors: PracticeFloorSummary[];
}

export interface PracticeRelatedCourse {
  id: number;
  title: string;
  status: string;
  total_lessons: number;
}

export interface PracticeFloorDetailResponse {
  floor: PracticeFloorSummary;
  related_courses: PracticeRelatedCourse[];
  challenge_templates: PracticeChallenge[];
}

export interface PracticeEncounter {
  id: string;
  encounter_order: number;
  encounter_type: EncounterType;
  status: EncounterStatus;
  attempts_used: number;
  challenge: PracticeChallenge;
}

export interface PracticeRemediationAction {
  type: string;
  label: string;
  description: string;
  route: string | null;
  topic_id: number | null;
  course_id: number | null;
}

export interface PracticeRoom {
  id: string;
  floor_id: number;
  title: string;
  category: string;
  subcategory: string;
  language: PracticeLanguage;
  difficulty: PracticeDifficulty;
  selected_subtopic: string | null;
  practice_goal: string | null;
  attempt_tokens: number;
  max_attempt_tokens: number;
  status: RoomStatus;
  boss_available: boolean;
  boss_defeated: boolean;
  encounters: PracticeEncounter[];
  remediation_actions: PracticeRemediationAction[];
}

export interface PracticeSubmissionResponse {
  id: string;
  encounter_id: string;
  room_id: string;
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  passed: boolean;
  score: number | null;
  visible_test_results: PracticeTestResult[];
  hidden_test_summary: {
    total: number;
    passed: number;
  };
  room: PracticeRoom;
}

export interface PracticeExecuteResponse {
  stdout: string;
  stderr: string;
  exit_code: number;
  execution_time_ms: number;
  test_results: PracticeTestResult[];
}

export interface PracticeEvaluateResponse {
  feedback: string;
  hints: string[];
  score: number;
  passed: boolean;
}

async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }
  return response.json();
}

export function usePracticeCatalog(searchQuery?: string, category?: string, subcategory?: string) {
  return useQuery({
    queryKey: ['practice', 'catalog', searchQuery ?? '', category ?? '', subcategory ?? ''],
    queryFn: () => {
      const params = new URLSearchParams();
      if (searchQuery) params.set('q', searchQuery);
      if (category) params.set('category', category);
      if (subcategory) params.set('subcategory', subcategory);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      return fetchJson<PracticeCatalogResponse>(`/api/practice/catalog${suffix}`);
    },
  });
}

export function usePracticeFloor(floorId: number | null, enabled = true) {
  return useQuery({
    queryKey: ['practice', 'floor', floorId],
    queryFn: () => fetchJson<PracticeFloorDetailResponse>(`/api/practice/floors/${floorId}`),
    enabled: enabled && !!floorId,
  });
}

export function usePracticeRoom(roomId: string | undefined) {
  return useQuery({
    queryKey: ['practice', 'room', roomId],
    queryFn: () => fetchJson<PracticeRoom>(`/api/practice/rooms/${roomId}`),
    enabled: !!roomId,
  });
}

export function useCreatePracticeRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      floor_id: number;
      language: PracticeLanguage;
      difficulty: PracticeDifficulty;
      selected_subtopic?: string | null;
      practice_goal?: string | null;
    }) =>
      fetchJson<PracticeRoom>('/api/practice/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['practice', 'catalog'] });
      queryClient.setQueryData(['practice', 'room', room.id], room);
    },
  });
}

export function useGeneratePracticeChallenge() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: {
      floor_id: number;
      language: PracticeLanguage;
      target_difficulty: PracticeDifficulty;
      subtopic?: string | null;
      practice_goal?: string | null;
      boss?: boolean;
    }) =>
      fetchJson<PracticeChallenge>('/api/practice/challenges/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (challenge) => {
      queryClient.invalidateQueries({ queryKey: ['practice', 'catalog'] });
      if (challenge.path_id) {
        queryClient.invalidateQueries({ queryKey: ['practice', 'floor'] });
      }
    },
  });
}

export function useSpawnPracticeEncounters(roomId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { count: 1 | 3 }) =>
      fetchJson<PracticeRoom>(`/api/practice/rooms/${roomId}/spawn`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (room) => {
      queryClient.setQueryData(['practice', 'room', room.id], room);
      queryClient.invalidateQueries({ queryKey: ['practice', 'catalog'] });
    },
  });
}

export function useSubmitPracticeEncounter(roomId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: { encounterId: string; code: string }) =>
      fetchJson<PracticeSubmissionResponse>(`/api/practice/encounters/${payload.encounterId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: payload.code }),
      }),
    onSuccess: (submission) => {
      if (roomId) {
        queryClient.setQueryData(['practice', 'room', roomId], submission.room);
      }
      queryClient.invalidateQueries({ queryKey: ['practice', 'catalog'] });
    },
  });
}

export function useExecutePracticeCode() {
  return useMutation({
    mutationFn: (payload: {
      code: string;
      language: PracticeLanguage;
      entrypoint_name?: string;
      test_cases: PracticeDisplayTestCase[];
    }) =>
      fetchJson<PracticeExecuteResponse>('/api/practice/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}

export function useEvaluatePracticeSolution() {
  return useMutation({
    mutationFn: (payload: {
      code: string;
      language: PracticeLanguage;
      challenge_description: string;
      test_results: PracticeTestResult[];
    }) =>
      fetchJson<PracticeEvaluateResponse>('/api/practice/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
  });
}
