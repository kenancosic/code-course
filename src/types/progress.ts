import { z } from 'zod';
import { HexColorSchema, TierSchema } from './roadmap';

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: string;
  tier: number;
  icon: string;
  color: string;
  parentSkillIds: string[];
}

export const SkillSchema: z.ZodSchema<Skill> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
  tier: TierSchema,
  icon: z.string().min(1),
  color: HexColorSchema,
  parentSkillIds: z.array(z.string().uuid()),
});

export interface UserAchievement {
  id: string;
  userId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  unlockedAt: Date;
  category: string;
  points: number;
}

export const UserAchievementSchema: z.ZodSchema<UserAchievement> = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  icon: z.string().min(1),
  color: HexColorSchema,
  unlockedAt: z.date(),
  category: z.string().min(1).max(50),
  points: z.number().int().min(0),
});

export interface UserProfile {
  id: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  bio: string;
  timezone: string;
  isPublic: boolean;
  totalPoints: number;
  streakDays: number;
  joinedAt: Date;
  lastActiveAt: Date;
}

export const UserProfileSchema: z.ZodSchema<UserProfile> = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  displayName: z.string().min(1).max(50),
  avatarUrl: z.string().url().optional(),
  bio: z.string().max(500),
  timezone: z.string().min(1),
  isPublic: z.boolean(),
  totalPoints: z.number().int().min(0),
  streakDays: z.number().int().min(0),
  joinedAt: z.date(),
  lastActiveAt: z.date(),
});

export interface LessonProgress {
  lessonId: string;
  completed: boolean;
  completedAt?: Date;
  timeSpentMinutes: number;
  codeExamplesCompleted: string[];
  exercisesCompleted: string[];
  quizScore?: number;
}

export const LessonProgressSchema: z.ZodSchema<LessonProgress> = z.object({
  lessonId: z.string().uuid(),
  completed: z.boolean(),
  completedAt: z.date().optional(),
  timeSpentMinutes: z.number().int().min(0),
  codeExamplesCompleted: z.array(z.string().uuid()),
  exercisesCompleted: z.array(z.string().uuid()),
  quizScore: z.number().min(0).max(100).optional(),
});

export interface CourseProgress {
  courseId: string;
  startedAt: Date;
  completedAt?: Date;
  overallProgress: number;
  lessonProgress: LessonProgress[];
  totalPointsEarned: number;
}

export const CourseProgressSchema: z.ZodSchema<CourseProgress> = z.object({
  courseId: z.string().uuid(),
  startedAt: z.date(),
  completedAt: z.date().optional(),
  overallProgress: z.number().min(0).max(100),
  lessonProgress: z.array(LessonProgressSchema),
  totalPointsEarned: z.number().int().min(0),
});

export interface SkillProgress {
  skillId: string;
  level: number;
  currentXp: number;
  xpToNextLevel: number;
  totalXpEarned: number;
}

export const SkillProgressSchema: z.ZodSchema<SkillProgress> = z.object({
  skillId: z.string().uuid(),
  level: z.number().int().min(1),
  currentXp: z.number().int().min(0),
  xpToNextLevel: z.number().int().min(0),
  totalXpEarned: z.number().int().min(0),
});

export interface UserProgress {
  userId: string;
  courseProgress: CourseProgress[];
  skillProgress: SkillProgress[];
  achievements: UserAchievement[];
  currentStreak: number;
  longestStreak: number;
  lastStudyDate?: Date;
  totalStudyTimeMinutes: number;
}

export const UserProgressSchema: z.ZodSchema<UserProgress> = z.object({
  userId: z.string().uuid(),
  courseProgress: z.array(CourseProgressSchema),
  skillProgress: z.array(SkillProgressSchema),
  achievements: z.array(UserAchievementSchema),
  currentStreak: z.number().int().min(0),
  longestStreak: z.number().int().min(0),
  lastStudyDate: z.date().optional(),
  totalStudyTimeMinutes: z.number().int().min(0),
});
