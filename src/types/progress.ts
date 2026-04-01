export interface ProfilePath {
  id: number;
  title: string;
}

export interface ProfileSkill {
  name: string;
  level: number;
  xp: number;
}

export interface Activity {
  id: number;
  type: string;
  description: string;
  xp_earned: number;
  timestamp: string | null;
}

export interface UserProfile {
  id: number;
  display_name: string;
  avatar_seed: string;
  level: number;
  title: string;
  total_xp: number;
  xp_to_next_level: number;
  quests_completed: number;
  current_path: ProfilePath | null;
  skills: ProfileSkill[];
  recent_activity: Activity[];
}

export interface ProfileAchievement {
  id: number;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
  unlocked: boolean;
  unlocked_at: string | null;
}

export interface ProgressSummary {
  total_lessons_completed: number;
  total_courses_completed: number;
  total_xp: number;
  current_level: number;
  current_level_xp: number;
  xp_to_next_level: number;
  level_progress_percentage: number;
  streak_days: number;
}

export interface RoadmapProgress {
  path_id: number;
  completed_nodes: number;
  total_nodes: number;
  completion_percentage: number;
}

export interface CourseUserProgress {
  completed_lessons: number;
  completion_percentage: number;
  started_at: string | null;
  last_accessed_at: string | null;
  completed_at: string | null;
}

export interface CourseProgressLesson {
  lesson_id: number;
  title: string;
  completed: boolean;
  xp_reward: number;
}

export interface CourseProgressDetail {
  course_id: number;
  course_title: string;
  completed_lessons: number;
  total_lessons: number;
  completion_percentage: number;
  total_xp: number;
  lessons: CourseProgressLesson[];
}

export interface AchievementUnlock {
  id: number;
  title: string;
  description: string | null;
  icon: string | null;
  category: string | null;
}

export interface CompleteLessonRequest {
  lesson_id: number;
  course_id: number;
  time_spent_seconds: number;
}

export interface CompleteLessonResponse {
  xp_earned: number;
  total_xp: number;
  level_before: number;
  level_after: number;
  xp_to_next_level: number;
  new_achievements: AchievementUnlock[];
  node_completed: boolean;
}

export interface UpdateProfileRequest {
  display_name?: string;
  avatar_seed?: string;
  current_path_id?: number;
}
