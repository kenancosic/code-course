import type { RoadmapPath } from '@/types/roadmap';

export const mockRoadmaps: RoadmapPath[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'Frontend Development',
    description: 'Master modern frontend development with React, TypeScript, and CSS. Build responsive, interactive web applications from scratch.',
    category: 'Web Development',
    color: '#3B82F6',
    difficulty: 'beginner',
    estimatedHours: 120,
    nodeIds: [
      '550e8400-e29b-41d4-a716-446655440001',
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    name: 'Backend Development',
    description: 'Learn server-side development with Node.js, databases, and API design. Build scalable and secure backend systems.',
    category: 'Web Development',
    color: '#10B981',
    difficulty: 'intermediate',
    estimatedHours: 150,
    nodeIds: [
      '550e8400-e29b-41d4-a716-446655440011',
      '550e8400-e29b-41d4-a716-446655440012',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440020',
    name: 'Full Stack Development',
    description: 'Become a complete developer by mastering both frontend and backend technologies. Build end-to-end applications.',
    category: 'Web Development',
    color: '#8B5CF6',
    difficulty: 'advanced',
    estimatedHours: 200,
    nodeIds: [
      '550e8400-e29b-41d4-a716-446655440021',
      '550e8400-e29b-41d4-a716-446655440022',
      '550e8400-e29b-41d4-a716-446655440023',
      '550e8400-e29b-41d4-a716-446655440024',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440030',
    name: 'Data Science Fundamentals',
    description: 'Explore data analysis, visualization, and machine learning basics using Python and popular data science libraries.',
    category: 'Data Science',
    color: '#F59E0B',
    difficulty: 'beginner',
    estimatedHours: 100,
    nodeIds: [
      '550e8400-e29b-41d4-a716-446655440031',
      '550e8400-e29b-41d4-a716-446655440032',
    ],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440040',
    name: 'Mobile App Development',
    description: 'Build cross-platform mobile applications using React Native. Deploy to iOS and Android with a single codebase.',
    category: 'Mobile Development',
    color: '#EC4899',
    difficulty: 'intermediate',
    estimatedHours: 130,
    nodeIds: [
      '550e8400-e29b-41d4-a716-446655440041',
      '550e8400-e29b-41d4-a716-446655440042',
    ],
  },
];
