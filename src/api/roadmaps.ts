import type { RoadmapPath } from '@/types/roadmap';
import { apiGet } from './client';

export async function fetchRoadmaps(): Promise<RoadmapPath[]> {
  return apiGet<RoadmapPath[]>('/roadmaps');
}

export async function fetchRoadmap(id: string): Promise<RoadmapPath> {
  return apiGet<RoadmapPath>(`/roadmaps/${id}`);
}
