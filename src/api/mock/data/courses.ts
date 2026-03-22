import type { Course, Lesson, CodeExample, Exercise, QuizQuestion, TestCase } from '@/types/course';

const mockTestCases: TestCase[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440200',
    exerciseId: '550e8400-e29b-41d4-a716-446655440201',
    input: '[1, 2, 3, 4, 5]',
    expectedOutput: '15',
    isPublic: true,
    description: 'Sum of positive integers',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440202',
    exerciseId: '550e8400-e29b-41d4-a716-446655440201',
    input: '[-1, -2, -3]',
    expectedOutput: '-6',
    isPublic: false,
    description: 'Sum of negative integers',
  },
];

const mockCodeExamples: CodeExample[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440210',
    lessonId: '550e8400-e29b-41d4-a716-446655440220',
    title: 'Hello World in JavaScript',
    language: 'javascript',
    code: 'console.log("Hello, World!");',
    explanation: 'This is the simplest JavaScript program. It outputs text to the console.',
    runable: true,
    expectedOutput: 'Hello, World!',
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440211',
    lessonId: '550e8400-e29b-41d4-a716-446655440220',
    title: 'Variable Declaration',
    language: 'javascript',
    code: 'const greeting = "Hello";\nlet name = "Developer";\nconsole.log(greeting + ", " + name + "!");',
    explanation: 'Use const for constants and let for variables that can be reassigned.',
    runable: true,
    expectedOutput: 'Hello, Developer!',
  },
];

const mockExercises: Exercise[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440201',
    lessonId: '550e8400-e29b-41d4-a716-446655440220',
    title: 'Sum an Array',
    description: 'Write a function that takes an array of numbers and returns their sum.',
    difficulty: 'easy',
    starterCode: 'function sumArray(numbers) {\n  // Your code here\n}',
    solutionCode: 'function sumArray(numbers) {\n  return numbers.reduce((acc, curr) => acc + curr, 0);\n}',
    hints: ['Use the reduce method', 'Initialize accumulator to 0'],
    points: 10,
    testCases: mockTestCases,
    skillIds: ['550e8400-e29b-41d4-a716-446655440300'],
  },
];

const mockQuizQuestions: QuizQuestion[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440230',
    lessonId: '550e8400-e29b-41d4-a716-446655440220',
    question: 'What is the correct way to declare a constant in JavaScript?',
    options: [
      'var x = 5;',
      'let x = 5;',
      'const x = 5;',
      'constant x = 5;',
    ],
    correctOptionIndex: 2,
    explanation: 'const is used to declare constants in modern JavaScript (ES6+).',
    points: 5,
  },
];

const mockLessons: Lesson[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440220',
    courseId: '550e8400-e29b-41d4-a716-446655440221',
    title: 'Introduction to JavaScript',
    description: 'Learn the basics of JavaScript programming language.',
    content: '# Introduction to JavaScript\n\nJavaScript is a versatile programming language used for web development.',
    orderIndex: 0,
    durationMinutes: 30,
    codeExamples: mockCodeExamples,
    exercises: mockExercises,
    quizQuestions: mockQuizQuestions,
    skillIds: ['550e8400-e29b-41d4-a716-446655440300'],
    prerequisiteLessonIds: [],
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440222',
    courseId: '550e8400-e29b-41d4-a716-446655440221',
    title: 'Variables and Data Types',
    description: 'Understanding variables, constants, and JavaScript data types.',
    content: '# Variables and Data Types\n\nJavaScript has several data types including strings, numbers, booleans, and more.',
    orderIndex: 1,
    durationMinutes: 45,
    codeExamples: [],
    exercises: [],
    quizQuestions: [],
    skillIds: ['550e8400-e29b-41d4-a716-446655440301'],
    prerequisiteLessonIds: ['550e8400-e29b-41d4-a716-446655440220'],
  },
];

export const mockCourses: Course[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440221',
    pathId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'JavaScript Fundamentals',
    description: 'Learn the core concepts of JavaScript programming. Perfect for beginners starting their coding journey.',
    category: 'Programming',
    level: 'beginner',
    color: '#F7DF1E',
    icon: 'code',
    estimatedHours: 20,
    lessons: mockLessons,
    skillIds: ['550e8400-e29b-41d4-a716-446655440300', '550e8400-e29b-41d4-a716-446655440301'],
    isPublished: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-03-15'),
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440223',
    pathId: '550e8400-e29b-41d4-a716-446655440000',
    title: 'React Basics',
    description: 'Get started with React, the popular JavaScript library for building user interfaces.',
    category: 'Frontend',
    level: 'intermediate',
    color: '#61DAFB',
    icon: 'layout',
    estimatedHours: 30,
    lessons: [],
    skillIds: ['550e8400-e29b-41d4-a716-446655440302'],
    isPublished: true,
    createdAt: new Date('2024-02-01'),
    updatedAt: new Date('2024-03-10'),
  },
];
