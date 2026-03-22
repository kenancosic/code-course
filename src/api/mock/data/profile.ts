import type { UserProfile } from '@/types/progress';

export const mockUserProfile: UserProfile = {
  id: '550e8400-e29b-41d4-a716-446655440100',
  email: 'learner@example.com',
  username: 'codelearner',
  displayName: 'Code Learner',
  avatarUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=codelearner',
  bio: 'Passionate developer learning new skills every day. Currently focused on frontend and backend development.',
  timezone: 'America/New_York',
  isPublic: true,
  totalPoints: 1250,
  streakDays: 7,
  joinedAt: new Date('2024-01-15'),
  lastActiveAt: new Date(),
};
