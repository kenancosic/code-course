import type { Course } from '@/types/course';
import { apiGet, apiPost } from './client';

export async function fetchCourses(): Promise<Course[]> {
  return apiGet<Course[]>('/courses');
}

export async function fetchCourse(id: string): Promise<Course> {
  return apiGet<Course>(`/courses/${id}`);
}

export interface GenerateCourseRequest {
  pathId: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  preferences?: {
    focusAreas?: string[];
    excludeTopics?: string[];
    estimatedHours?: number;
  };
}

export async function generateCourse(request: GenerateCourseRequest): Promise<Course> {
  return apiPost<Course>('/courses/generate', request);
}
