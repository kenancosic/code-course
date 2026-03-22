import { z } from 'zod';
import { HexColorSchema, PositionSchema, TierSchema } from './roadmap';

export interface CodeExample {
  id: string;
  lessonId: string;
  title: string;
  language: string;
  code: string;
  explanation: string;
  runable: boolean;
  expectedOutput?: string;
}

export const CodeExampleSchema: z.ZodSchema<CodeExample> = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  language: z.string().min(1).max(50),
  code: z.string().min(1),
  explanation: z.string().min(1),
  runable: z.boolean(),
  expectedOutput: z.string().optional(),
});

export interface TestCase {
  id: string;
  exerciseId: string;
  input: string;
  expectedOutput: string;
  isPublic: boolean;
  description: string;
}

export const TestCaseSchema: z.ZodSchema<TestCase> = z.object({
  id: z.string().uuid(),
  exerciseId: z.string().uuid(),
  input: z.string(),
  expectedOutput: z.string(),
  isPublic: z.boolean(),
  description: z.string().min(1).max(500),
});

export interface Exercise {
  id: string;
  lessonId: string;
  title: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  starterCode?: string;
  solutionCode: string;
  hints: string[];
  points: number;
  testCases: TestCase[];
  skillIds: string[];
}

export const ExerciseSchema: z.ZodSchema<Exercise> = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  starterCode: z.string().optional(),
  solutionCode: z.string().min(1),
  hints: z.array(z.string()),
  points: z.number().int().min(0),
  testCases: z.array(TestCaseSchema),
  skillIds: z.array(z.string().uuid()),
});

export interface QuizQuestion {
  id: string;
  lessonId: string;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  points: number;
}

export const QuizQuestionSchema: z.ZodSchema<QuizQuestion> = z.object({
  id: z.string().uuid(),
  lessonId: z.string().uuid(),
  question: z.string().min(1).max(1000),
  options: z.array(z.string()).min(2).max(6),
  correctOptionIndex: z.number().int().min(0),
  explanation: z.string().min(1),
  points: z.number().int().min(0),
});

export interface Lesson {
  id: string;
  courseId: string;
  title: string;
  description: string;
  content: string;
  orderIndex: number;
  durationMinutes: number;
  codeExamples: CodeExample[];
  exercises: Exercise[];
  quizQuestions: QuizQuestion[];
  skillIds: string[];
  prerequisiteLessonIds: string[];
}

export const LessonSchema: z.ZodSchema<Lesson> = z.object({
  id: z.string().uuid(),
  courseId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  content: z.string().min(1),
  orderIndex: z.number().int().min(0),
  durationMinutes: z.number().int().min(1),
  codeExamples: z.array(CodeExampleSchema),
  exercises: z.array(ExerciseSchema),
  quizQuestions: z.array(QuizQuestionSchema),
  skillIds: z.array(z.string().uuid()),
  prerequisiteLessonIds: z.array(z.string().uuid()),
});

export interface Course {
  id: string;
  pathId: string;
  title: string;
  description: string;
  category: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  color: string;
  icon: string;
  estimatedHours: number;
  lessons: Lesson[];
  skillIds: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export const CourseSchema: z.ZodSchema<Course> = z.object({
  id: z.string().uuid(),
  pathId: z.string().uuid(),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  category: z.string().min(1).max(50),
  level: z.enum(['beginner', 'intermediate', 'advanced']),
  color: HexColorSchema,
  icon: z.string().min(1),
  estimatedHours: z.number().int().min(1),
  lessons: z.array(LessonSchema),
  skillIds: z.array(z.string().uuid()),
  isPublished: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
});
