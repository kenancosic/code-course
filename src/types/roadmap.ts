import { z } from 'zod';

export const HexColorSchema = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid hex color format');

export const PositionSchema = z.number().min(0).max(100);

export const TierSchema = z.number().int().min(1).max(5);

export interface RoadmapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  required: boolean;
}

export const RoadmapConnectionSchema: z.ZodSchema<RoadmapConnection> = z.object({
  id: z.string().uuid(),
  fromNodeId: z.string().uuid(),
  toNodeId: z.string().uuid(),
  required: z.boolean(),
});

export interface RoadmapNode {
  id: string;
  pathId: string;
  label: string;
  description: string;
  tier: number;
  positionX: number;
  positionY: number;
  color: string;
  icon: string;
  skillIds: string[];
  prerequisiteNodeIds: string[];
}

export const RoadmapNodeSchema: z.ZodSchema<RoadmapNode> = z.object({
  id: z.string().uuid(),
  pathId: z.string().uuid(),
  label: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  tier: TierSchema,
  positionX: PositionSchema,
  positionY: PositionSchema,
  color: HexColorSchema,
  icon: z.string().min(1),
  skillIds: z.array(z.string().uuid()),
  prerequisiteNodeIds: z.array(z.string().uuid()),
});

export interface RoadmapPath {
  id: string;
  name: string;
  description: string;
  category: string;
  color: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
  nodeIds: string[];
}

export const RoadmapPathSchema: z.ZodSchema<RoadmapPath> = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(1000),
  category: z.string().min(1).max(50),
  color: HexColorSchema,
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  estimatedHours: z.number().int().min(1),
  nodeIds: z.array(z.string().uuid()),
});
