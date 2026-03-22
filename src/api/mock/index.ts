import type { RoadmapPath } from '@/types/roadmap';
import type { Course } from '@/types/course';
import type { UserProfile } from '@/types/progress';
import type { UpdateProfileData, GenerateCourseRequest } from './types';
import { mockRoadmaps } from './data/roadmaps';
import { mockUserProfile } from './data/profile';
import { mockCourses } from './data/courses';

export async function fetchRoadmaps(): Promise<RoadmapPath[]> {
  return Promise.resolve(mockRoadmaps);
}

export async function fetchRoadmap(id: string): Promise<RoadmapPath> {
  const roadmap = mockRoadmaps.find(r => r.id === id);
  if (!roadmap) {
    throw new Error(`Roadmap with id ${id} not found`);
  }
  return Promise.resolve(roadmap);
}

export async function fetchCourses(): Promise<Course[]> {
  return Promise.resolve(mockCourses);
}

export async function fetchCourse(id: string): Promise<Course> {
  const course = mockCourses.find(c => c.id === id);
  if (!course) {
    throw new Error(`Course with id ${id} not found`);
  }
  return Promise.resolve(course);
}

export async function generateCourse(_request: GenerateCourseRequest): Promise<Course> {
  throw new Error('generateCourse not implemented in mock mode');
}

export async function fetchProfile(): Promise<UserProfile> {
  return Promise.resolve(mockUserProfile);
}

export async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
  const updated = {
    ...mockUserProfile,
    ...data,
    lastActiveAt: new Date(),
  };
  return Promise.resolve(updated);
}
