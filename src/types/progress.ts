import { z } from 'zod';
import { HexColorSchema, TierSchema } from './roadmap';

// Legacy types - keep for backwards compatibility
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

// === New Backend API Types ===

// UserProfile from backend
export interface UserProfile {
  display_name: string;
  avatar_seed: string;
  level: number;
  title: string;
  total_xp: number;
  xp_to_next_level: number;
  quests_completed: number;
  current_path: {
    id: string;
    title: string;
  } | null;
  skills: {
    name: string;
    level: number;
    xp: number;
  }[];
  recent_activity: Activity[];
}

export interface Activity {
  id: string;
  type: 'lesson_completed' | 'course_completed' | 'achievement_unlocked' | 'practice_completed';
  description: string;
  xp_earned: number;
  timestamp: string;
}

export interface ProgressSummary {
  total_xp: number;
  level: number;
  xp_to_next_level: number;
  lessons_completed: number;
  courses_completed: number;
  current_streak: number;
  achievements_unlocked: number;
}

export interface RoadmapProgress {
  path_id: string;
  path_title: string;
  nodes_completed: number;
  total_nodes: number;
  progress_percentage: number;
  current_node_id: string | null;
}

export interface CourseProgressDetail {
  course_id: string;
  course_title: string;
  lessons_completed: number;
  total_lessons: number;
  progress_percentage: number;
  current_lesson_id: string | null;
}

export interface CompleteLessonRequest {
  lesson_id: string;
  course_id: string;
  time_spent_minutes: number;
}

export interface CompleteLessonResponse {
  xp_earned: number;
  level_up: boolean;
  new_level?: number;
  achievements_unlocked: string[];
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_seed?: string;
  title?: string;
}
