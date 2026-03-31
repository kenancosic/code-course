import { createBrowserRouter } from 'react-router';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { RoadmapList } from './pages/RoadmapList';
import { RoadmapDetail } from './pages/RoadmapDetail';
import { CourseView } from './pages/CourseView';
import { Practice } from './pages/Practice';
import { PracticeRoom } from './pages/PracticeRoom';
import { CreateCourse } from './pages/CreateCourse';
import { Profile } from './pages/Profile';

export const router = createBrowserRouter([
  {
    path: '/',
    Component: Layout,
    children: [
      { index: true, Component: Home },
      { path: 'roadmap', Component: RoadmapList },
      { path: 'roadmap/:pathId', Component: RoadmapDetail },
      { path: 'course/:courseId', Component: CourseView },
      { path: 'practice', Component: Practice },
      { path: 'practice/room/:roomId', Component: PracticeRoom },
      { path: 'create', Component: CreateCourse },
      { path: 'profile', Component: Profile },
    ],
  },
]);
