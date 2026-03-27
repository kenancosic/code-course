import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  ProfileAchievement,
  UpdateProfileRequest,
  UserProfile,
} from '../types/progress';

const fetchProfile = async (): Promise<UserProfile> => {
  const response = await fetch('/api/profile/');
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
};

const updateProfile = async (data: UpdateProfileRequest): Promise<UserProfile> => {
  const response = await fetch('/api/profile/', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!response.ok) {
    throw new Error('Failed to update profile');
  }
  return response.json();
};

const fetchAchievements = async (): Promise<ProfileAchievement[]> => {
  const response = await fetch('/api/profile/achievements');
  if (!response.ok) {
    throw new Error('Failed to fetch achievements');
  }
  return response.json();
};

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: fetchProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(['profile'], data);
    },
  });
}

export function useAchievements() {
  return useQuery({
    queryKey: ['profile', 'achievements'],
    queryFn: fetchAchievements,
  });
}
