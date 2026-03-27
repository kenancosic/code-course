import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { Roadmap } from './use-roadmaps';

export interface TopicBase {
  id: number;
  title: string;
  description: string;
  ai_generated: boolean;
  keywords: string | null;
}

/** @deprecated Use TopicBase instead */
export type Subtopic = TopicBase;

export interface TopicConnection {
  id: number;
  from_topic_id: number;
  to_topic_id: number;
  relationship_type: string;
  ai_confidence: number | null;
}

export interface Topic extends TopicBase {
  subtopics: TopicBase[];
  outgoing_connections: TopicConnection[];
  incoming_connections: TopicConnection[];
}

const fetchTopic = async (topicId: number): Promise<Topic> => {
  const response = await fetch(`/api/topics/${topicId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch topic details');
  }
  return response.json();
};

export function useTopic(topicId: number | null) {
  return useQuery({
    queryKey: ['topic', topicId],
    queryFn: () => fetchTopic(topicId!),
    enabled: !!topicId,
  });
}

const generateRoadmap = async (topic: string): Promise<Roadmap> => {
  const response = await fetch('/api/topics/generate-roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ topic }),
  });
  if (!response.ok) {
    throw new Error('Failed to generate roadmap');
  }
  return response.json();
};

export function useGenerateRoadmap() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: generateRoadmap,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roadmaps'] });
    },
  });
}
