import type { UserProfile } from '@/types/progress';

export const mockUserProfile: UserProfile = {
  display_name: 'Code Learner',
  avatar_seed: 'codelearner',
  level: 5,
  title: 'Novice Developer',
  total_xp: 1250,
  xp_to_next_level: 250,
  quests_completed: 12,
  current_path: {
    id: '1',
    title: 'Frontend Fundamentals'
  },
  skills: [],
  recent_activity: []
};
