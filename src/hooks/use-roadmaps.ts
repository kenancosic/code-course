import { useQuery } from '@tanstack/react-query';

export interface RoadmapNode {
  id: number;
  path_id: number;
  title: string;
  description: string | null;
  position_x: number;
  position_y: number;
  tier: number;
  topic_keywords: string | null;
}

export interface RoadmapConnection {
  id: number;
  path_id: number;
  from_node_id: number;
  to_node_id: number;
  connection_type: string;
}

export interface Roadmap {
  id: number;
  title: string;
  description: string | null;
  icon: string | null;
  colors: string | null;
  sort_order: number;
  is_locked: boolean;
  nodes: RoadmapNode[];
  connections: RoadmapConnection[];
}

const fetchRoadmaps = async (): Promise<Roadmap[]> => {
  const response = await fetch('/api/roadmaps/');
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
