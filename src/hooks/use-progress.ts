import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProgressSummary,
  RoadmapProgress,
  CourseProgressDetail,
  CompleteLessonRequest,
  CompleteLessonResponse,
} from '../types/progress';

const fetchProgressSummary = async (): Promise<ProgressSummary> => {
  const response = await fetch('/api/progress/summary');
  if (!response.ok) {
    throw new Error('Failed to fetch progress summary');
  }
  return response.json();
};

const fetchRoadmapProgress = async (pathId: string): Promise<RoadmapProgress> => {
  const response = await fetch(`/api/progress/roadmap/${pathId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap progress');
  }
  return response.json();
};

const fetchCourseProgress = async (courseId: string): Promise<CourseProgressDetail> => {
  const response = await fetch(`/api/progress/course/${courseId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch course progress');
  }
  return response.json();
};

const completeLesson = async (data: CompleteLessonRequest): Promise<CompleteLessonResponse> => {
  const response = await fetch('/api/progress/complete-lesson', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to complete lesson');
  }
  return response.json();
};

export function useProgressSummary() {
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: fetchProgressSummary,
  });
}

export function useRoadmapProgress(pathId: string) {
  return useQuery({
    queryKey: ['progress', 'roadmap', pathId],
    queryFn: () => fetchRoadmapProgress(pathId),
    enabled: !!pathId,
  });
}

export function useRoadmapProgresses(pathIds: Array<number | string>) {
  return useQueries({
    queries: pathIds.map((pathId) => ({
      queryKey: ['progress', 'roadmap', String(pathId)],
      queryFn: () => fetchRoadmapProgress(String(pathId)),
      enabled: !!pathId,
    })),
  });
}

export function useCourseProgress(courseId: string) {
  return useQuery({
    queryKey: ['progress', 'course', courseId],
    queryFn: () => fetchCourseProgress(courseId),
    enabled: !!courseId,
  });
}

export function useCompleteLesson() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: completeLesson,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['progress'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      queryClient.invalidateQueries({ queryKey: ['courses'] });
      queryClient.invalidateQueries({ queryKey: ['course', String(variables.course_id)] });
    },
  });
}
