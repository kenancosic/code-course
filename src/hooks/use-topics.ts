import { useQuery } from '@tanstack/react-query';

export interface Subtopic {
  id: number;
  title: string;
  description: string;
  topic_id: number;
}

export interface TopicConnection {
  id: number;
  from_topic_id: number;
  to_topic_id: number;
  connection_type: string;
}

export interface Topic {
  id: number;
  title: string;
  description: string;
  subtopics: Subtopic[];
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
