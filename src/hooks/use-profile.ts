import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface Profile {
  id: string;
  name: string;
  email: string;
  avatar: string | null;
  bio: string;
  preferences: {
    emailNotifications: boolean;
    publicProfile: boolean;
  };
}

interface UpdateProfileData {
  name?: string;
  bio?: string;
  avatar?: string;
  preferences?: {
    emailNotifications?: boolean;
    publicProfile?: boolean;
  };
}

const fetchProfile = async (): Promise<Profile> => {
  const response = await fetch('/api/profile');
  if (!response.ok) {
    throw new Error('Failed to fetch profile');
  }
  return response.json();
};

const updateProfile = async (data: UpdateProfileData): Promise<Profile> => {
  const response = await fetch('/api/profile', {
    method: 'PATCH',
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
