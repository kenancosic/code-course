import { z } from 'zod';

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  timestamp: Date;
  requestId: string;
}

export const ApiErrorSchema: z.ZodSchema<ApiError> = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  details: z.record(z.unknown()).optional(),
  timestamp: z.date(),
  requestId: z.string().uuid(),
});

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalPages: number;
    totalItems: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
}

export const createPaginatedResponseSchema = <T extends z.ZodTypeAny>(itemSchema: T) =>
  z.object({
    data: z.array(itemSchema),
    pagination: z.object({
      page: z.number().int().min(1),
      pageSize: z.number().int().min(1).max(100),
      totalPages: z.number().int().min(0),
      totalItems: z.number().int().min(0),
      hasNextPage: z.boolean(),
      hasPreviousPage: z.boolean(),
    }),
  });

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export const createApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema.optional(),
    error: ApiErrorSchema.optional(),
  });
