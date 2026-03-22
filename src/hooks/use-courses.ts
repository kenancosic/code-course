import { useQuery } from '@tanstack/react-query';

interface Course {
  id: string;
  title: string;
  description: string;
  roadmapId: string;
  lessons: string[];
  xpReward: number;
}

const fetchCourses = async (): Promise<Course[]> => {
  const response = await fetch('/api/courses');
  if (!response.ok) {
    throw new Error('Failed to fetch courses');
  }
  return response.json();
};

const fetchCourse = async (id: string): Promise<Course> => {
  const response = await fetch(`/api/courses/${id}`);
  if (!response.ok) {
    throw new Error('Failed to fetch course');
  }
  return response.json();
};

export function useCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: fetchCourses,
  });
}

export function useCourse(id: string) {
  return useQuery({
    queryKey: ['course', id],
    queryFn: () => fetchCourse(id),
    enabled: !!id,
  });
}
