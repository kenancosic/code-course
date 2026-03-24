import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UserProfile, UpdateProfileRequest } from '../types/progress';

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
