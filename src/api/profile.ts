import type { UserProfile } from '@/types/progress';
import { apiGet, apiPut } from './client';

export interface UpdateProfileData {
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  timezone?: string;
  isPublic?: boolean;
}

export async function fetchProfile(): Promise<UserProfile> {
  return apiGet<UserProfile>('/profile');
}

export async function updateProfile(data: UpdateProfileData): Promise<UserProfile> {
  return apiPut<UserProfile>('/profile', data);
}
