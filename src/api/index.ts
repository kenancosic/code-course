import { CONFIG } from '@/config';
import type { RoadmapPath } from '@/types/roadmap';
import type { Course } from '@/types/course';
import type { UserProfile } from '@/types/progress';
import type { UpdateProfileData, GenerateCourseRequest } from './types';
import {
  fetchRoadmaps as fetchRoadmapsMock,
  fetchRoadmap as fetchRoadmapMock,
  fetchCourses as fetchCoursesMock,
  fetchCourse as fetchCourseMock,
  generateCourse as generateCourseMock,
  fetchProfile as fetchProfileMock,
  updateProfile as updateProfileMock,
} from './mock';
import {
  fetchRoadmaps as fetchRoadmapsReal,
  fetchRoadmap as fetchRoadmapReal,
} from './roadmaps';
import {
  fetchCourses as fetchCoursesReal,
  fetchCourse as fetchCourseReal,
  generateCourse as generateCourseReal,
} from './courses';
import {
  fetchProfile as fetchProfileReal,
  updateProfile as updateProfileReal,
} from './profile';

export type { UpdateProfileData, GenerateCourseRequest } from './types';
export { ApiError } from './client';

export const fetchRoadmaps = CONFIG.USE_MOCK_DATA ? fetchRoadmapsMock : fetchRoadmapsReal;
export const fetchRoadmap = CONFIG.USE_MOCK_DATA ? fetchRoadmapMock : fetchRoadmapReal;
export const fetchCourses = CONFIG.USE_MOCK_DATA ? fetchCoursesMock : fetchCoursesReal;
export const fetchCourse = CONFIG.USE_MOCK_DATA ? fetchCourseMock : fetchCourseReal;
export const generateCourse = CONFIG.USE_MOCK_DATA ? generateCourseMock : generateCourseReal;
export const fetchProfile = CONFIG.USE_MOCK_DATA ? fetchProfileMock : fetchProfileReal;
export const updateProfile = CONFIG.USE_MOCK_DATA ? updateProfileMock : updateProfileReal;
