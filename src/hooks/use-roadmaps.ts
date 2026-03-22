import { useQuery } from '@tanstack/react-query';

interface Roadmap {
  id: string;
  title: string;
  description: string;
  icon: string;
  courses: string[];
}

const fetchRoadmaps = async (): Promise<Roadmap[]> => {
  const response = await fetch('/api/roadmaps');
  if (!response.ok) {
    throw new Error('Failed to fetch roadmaps');
  }
  return response.json();
};

const fetchRoadmap = async (id: string): Promise<Roadmap> => {
  const response = await fetch(`/api/roadmaps/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch roadmap');
  }
  return response.json();
};

export function useRoadmaps() {
  return useQuery({
    queryKey: ['roadmaps'],
    queryFn: fetchRoadmaps,
  });
}

export function useRoadmap(id: string) {
  return useQuery({
    queryKey: ['roadmap', id],
    queryFn: () => fetchRoadmap(id),
    enabled: !!id,
  });
}
