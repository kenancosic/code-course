export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  isPublic?: boolean;
}

export interface GenerateCourseRequest {
  pathId: string;
  topic: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  preferences?: {
    focusAreas?: string[];
    excludeTopics?: string[];
    estimatedHours?: number;
  };
}
