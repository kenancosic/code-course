import { useQuery } from '@tanstack/react-query';

export interface ProgressSummary {
  total_xp: number;
  current_level_xp: number;
  xp_to_next_level: number;
  level_progress_percentage: number;
}

const fetchProgressSummary = async (): Promise<ProgressSummary> => {
  const response = await fetch('/api/progress/summary');
  if (!response.ok) {
    throw new Error('Failed to fetch progress summary');
  }
  return response.json();
};

export function useProgressSummary() {
  return useQuery({
    queryKey: ['progress', 'summary'],
    queryFn: fetchProgressSummary,
  });
}
