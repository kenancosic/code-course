import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface CourseLesson {
  id: number;
  course_id: number;
  title: string;
  content_markdown: string | null;
  sort_order: number;
  xp_reward: number;
}

export interface Course {
  id: number;
  title: string;
  description: string | null;
  roadmap_node_id: number;
  status: string;
  total_lessons: number;
  total_xp: number;
  created_at: string | null;
  lessons: CourseLesson[];
}

export interface GenerateSSEEvent {
  event: string;
  data: Record<string, unknown>;
}

const fetchCourses = async (): Promise<Course[]> => {
  const response = await fetch('/api/courses/');
  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }
  return response.json();
};

const fetchCourse = async (id: string): Promise<Course> => {
  const response = await fetch(`/api/courses/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }
  return response.json();
};

const deleteCourse = async (id: number): Promise<void> => {
  const response = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
  if (!response.ok) {
    throw new Error('Failed to delete course');
  }
};

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id),
    enabled: !!id,
  });
}

export function useDeleteCourse() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deleteCourse,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['courses'] });
    },
  });
}

/**
 * Start course generation via SSE stream.
 * Returns an object with event handlers.
 */
export function generateCourseStream(
  nodeId: number,
  callbacks: {
    onStatus?: (data: Record<string, unknown>) => void;
    onChunk?: (data: Record<string, unknown>) => void;
    onComplete?: (data: Record<string, unknown>) => void;
    onError?: (data: Record<string, unknown>) => void;
  },
): AbortController {
  const controller = new AbortController();

  (async () => {
    try {
      const response = await fetch('/api/courses/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmap_node_id: nodeId }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: 'Generation failed' }));
        callbacks.onError?.({ message: err.detail || 'Generation failed' });
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              switch (currentEvent) {
                case 'status':
                  callbacks.onStatus?.(data);
                  break;
                case 'chunk':
                  callbacks.onChunk?.(data);
                  break;
                case 'complete':
                  callbacks.onComplete?.(data);
                  break;
                case 'error':
                  callbacks.onError?.(data);
                  break;
              }
            } catch {
              // Skip malformed data lines
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        callbacks.onError?.({ message: (err as Error).message });
      }
    }
  })();

  return controller;
}
