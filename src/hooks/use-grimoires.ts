import { useMutation, useQuery } from '@tanstack/react-query';

import type { Course } from './use-courses';

export type GrimoireStatus = 'uploaded' | 'extracting' | 'structuring' | 'ready' | 'failed';

export interface SourceDocument {
  id: number;
  original_filename: string;
  mime_type: string;
  file_format: string;
  file_size_bytes: number;
  detected_title: string | null;
  detected_author: string | null;
  status: GrimoireStatus;
  processing_metadata: Record<string, unknown> | null;
  processing_error: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DocumentSection {
  id: number;
  source_document_id: number;
  parent_id: number | null;
  title: string;
  sort_order: number;
  depth: number;
  page_start: number | null;
  page_end: number | null;
  char_start: number | null;
  char_end: number | null;
  raw_text: string | null;
  summary: string | null;
  keywords: string[] | null;
  suggested_path_id: number | null;
  suggested_topic_id: number | null;
  suggested_tier: number | null;
  match_confidence: number | null;
  match_rationale: string | null;
  children: DocumentSection[];
}

export interface RoadmapPreviewItem {
  section_id: number;
  section_title: string;
  target_path_id: number;
  target_path_title: string;
  target_tier: number;
  anchor_node_id: number;
  anchor_topic_title: string;
  suggested_position_x: number;
  suggested_position_y: number;
  match_confidence: number;
  rationale: string;
}

export interface RoadmapPreviewResponse {
  document_id: number;
  suggestions: RoadmapPreviewItem[];
}

export interface RoadmapApplyResponse {
  document_id: number;
  inserted_count: number;
  created_node_ids: number[];
  created_topic_ids: number[];
  affected_path_ids: number[];
}

async function uploadGrimoire(file: File): Promise<SourceDocument> {
  const formData = new FormData();
  formData.append('file', file);
  const response = await fetch('/api/grimoires/upload', {
    method: 'POST',
    body: formData,
  });
  if (!response.ok) {
    throw new Error((await response.json()).message ?? 'Failed to upload grimoire');
  }
  return response.json();
}

async function fetchGrimoire(documentId: number): Promise<SourceDocument> {
  const response = await fetch(`/api/grimoires/${documentId}`);
  if (!response.ok) {
    throw new Error('Failed to fetch grimoire');
  }
  return response.json();
}

async function fetchGrimoireSections(documentId: number): Promise<DocumentSection[]> {
  const response = await fetch(`/api/grimoires/${documentId}/sections`);
  if (!response.ok) {
    throw new Error('Failed to fetch grimoire sections');
  }
  return response.json();
}

async function createGrimoireCourse(payload: {
  documentId: number;
  sectionIds?: number[];
  title?: string;
}): Promise<Course> {
  const response = await fetch(`/api/grimoires/${payload.documentId}/courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      section_ids: payload.sectionIds ?? [],
      title: payload.title,
    }),
  });
  if (!response.ok) {
    throw new Error((await response.json()).message ?? 'Failed to forge course');
  }
  return response.json();
}

async function previewRoadmapProjection(payload: {
  documentId: number;
  sectionIds: number[];
}): Promise<RoadmapPreviewResponse> {
  const response = await fetch(`/api/grimoires/${payload.documentId}/roadmap-preview`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section_ids: payload.sectionIds }),
  });
  if (!response.ok) {
    throw new Error((await response.json()).message ?? 'Failed to preview roadmap projection');
  }
  return response.json();
}

async function applyRoadmapProjection(payload: {
  documentId: number;
  sectionIds: number[];
}): Promise<RoadmapApplyResponse> {
  const response = await fetch(`/api/grimoires/${payload.documentId}/roadmap-apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ section_ids: payload.sectionIds }),
  });
  if (!response.ok) {
    throw new Error((await response.json()).message ?? 'Failed to apply roadmap projection');
  }
  return response.json();
}

export function useUploadGrimoire() {
  return useMutation({
    mutationFn: uploadGrimoire,
  });
}

export function useGrimoire(documentId: number | null) {
  return useQuery({
    queryKey: ['grimoire', documentId],
    queryFn: () => fetchGrimoire(documentId!),
    enabled: !!documentId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status && status !== 'ready' && status !== 'failed' ? 1500 : false;
    },
  });
}

export function useGrimoireSections(documentId: number | null) {
  return useQuery({
    queryKey: ['grimoire', documentId, 'sections'],
    queryFn: () => fetchGrimoireSections(documentId!),
    enabled: !!documentId,
  });
}

export function useCreateGrimoireCourse() {
  return useMutation({
    mutationFn: createGrimoireCourse,
  });
}

export function usePreviewRoadmapProjection() {
  return useMutation({
    mutationFn: previewRoadmapProjection,
  });
}

export function useApplyRoadmapProjection() {
  return useMutation({
    mutationFn: applyRoadmapProjection,
  });
}
