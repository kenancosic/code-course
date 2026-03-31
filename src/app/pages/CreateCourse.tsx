import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import {
  BookOpen,
  CheckCircle2,
  FileUp,
  Layers,
  Loader2,
  Map,
  ScrollText,
  Sparkles,
  Wand2,
} from 'lucide-react';

import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Checkbox } from '../components/ui/checkbox';
import { Separator } from '../components/ui/separator';
import { cn } from '../../lib/utils';
import {
  type DocumentSection,
  type RoadmapPreviewItem,
  useApplyRoadmapProjection,
  useCreateGrimoireCourse,
  useGrimoire,
  useGrimoireSections,
  usePreviewRoadmapProjection,
  useUploadGrimoire,
} from '../../hooks/use-grimoires';

function flattenSections(sections: DocumentSection[]): DocumentSection[] {
  const flattened: DocumentSection[] = [];
  const visit = (items: DocumentSection[]) => {
    for (const item of items) {
      flattened.push(item);
      if (item.children.length > 0) {
        visit(item.children);
      }
    }
  };
  visit(sections);
  return flattened;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 102.4) / 10} KB`;
  return `${Math.round(bytes / 104857.6) / 10} MB`;
}

export function CreateCourse() {
  const navigate = useNavigate();
  const uploadGrimoire = useUploadGrimoire();
  const createCourse = useCreateGrimoireCourse();
  const previewProjection = usePreviewRoadmapProjection();
  const applyProjection = useApplyRoadmapProjection();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentId, setDocumentId] = useState<number | null>(null);
  const [selectedSectionIds, setSelectedSectionIds] = useState<Set<number>>(new Set());
  const [previewItems, setPreviewItems] = useState<RoadmapPreviewItem[]>([]);
  const [lastProjectionSummary, setLastProjectionSummary] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { data: grimoire } = useGrimoire(documentId);
  const { data: sectionTree = [] } = useGrimoireSections(grimoire?.status === 'ready' ? documentId : null);

  const flatSections = useMemo(() => flattenSections(sectionTree), [sectionTree]);
  const selectedCount = selectedSectionIds.size;
  const readySections = flatSections.filter((section) => (section.raw_text ?? '').trim().length > 0);
  const groupedPreview = useMemo(() => {
    return previewItems.reduce<Record<string, RoadmapPreviewItem[]>>((acc, item) => {
      acc[item.target_path_title] = acc[item.target_path_title] ?? [];
      acc[item.target_path_title].push(item);
      return acc;
    }, {});
  }, [previewItems]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setErrorMessage(null);
    setPreviewItems([]);
    setLastProjectionSummary(null);
    setSelectedSectionIds(new Set());
    try {
      const document = await uploadGrimoire.mutateAsync(selectedFile);
      setDocumentId(document.id);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const toggleSection = (sectionId: number) => {
    setSelectedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }
      return next;
    });
  };

  const selectAllSections = () => {
    setSelectedSectionIds(new Set(readySections.map((section) => section.id)));
  };

  const clearSections = () => {
    setSelectedSectionIds(new Set());
    setPreviewItems([]);
  };

  const handleForgeCourse = async () => {
    if (!documentId) return;
    setErrorMessage(null);
    try {
      const course = await createCourse.mutateAsync({
        documentId,
        sectionIds: [],
      });
      navigate(`/course/${course.id}`);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handlePreviewProjection = async () => {
    if (!documentId || selectedCount === 0) return;
    setErrorMessage(null);
    try {
      const response = await previewProjection.mutateAsync({
        documentId,
        sectionIds: Array.from(selectedSectionIds),
      });
      setPreviewItems(response.suggestions);
      setLastProjectionSummary(null);
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  const handleApplyProjection = async () => {
    if (!documentId || selectedCount === 0) return;
    setErrorMessage(null);
    try {
      const result = await applyProjection.mutateAsync({
        documentId,
        sectionIds: Array.from(selectedSectionIds),
      });
      setLastProjectionSummary(
        `Projected ${result.inserted_count} grimoire nodes across ${result.affected_path_ids.length} roadmap paths.`
      );
    } catch (error) {
      setErrorMessage((error as Error).message);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-3">
          <Badge className="bg-primary/15 text-primary border-primary/30">Grimoire Forge</Badge>
          <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-primary" />
            Grimoire Teachings
          </h1>
          <p className="text-muted-foreground max-w-2xl">
            Upload a PDF, EPUB, or TXT grimoire. We will section it, forge a dedicated
            course from its lessons, and preview where selected sections can be projected
            into existing roadmap paths.
          </p>
        </div>
        {grimoire && (
          <Card className="min-w-[280px] bg-card/70 border-border">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="capitalize">
                  {grimoire.status}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Format</span>
                <span className="font-medium uppercase">{grimoire.file_format}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Size</span>
                <span className="font-medium">{formatBytes(grimoire.file_size_bytes)}</span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1.1fr_0.9fr]">
        <Card className="bg-card/70 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileUp className="w-5 h-5 text-primary" />
              1. Offer A Grimoire
            </CardTitle>
            <CardDescription>We support `.pdf`, `.epub`, and `.txt` in this forge.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <label className="flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border/70 bg-background/40 px-6 py-8 text-center transition-colors hover:border-primary/50 hover:bg-primary/5">
              <ScrollText className="w-10 h-10 text-primary mb-3" />
              <span className="font-semibold text-foreground">
                {selectedFile ? selectedFile.name : 'Choose a book file'}
              </span>
              <span className="text-sm text-muted-foreground mt-2">
                {selectedFile
                  ? `${selectedFile.type || 'Unknown type'} • ${formatBytes(selectedFile.size)}`
                  : 'Drag a grimoire here or browse from disk.'}
              </span>
              <input
                type="file"
                accept=".pdf,.epub,.txt"
                className="sr-only"
                onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || uploadGrimoire.isPending}
                variant="fantasy"
                className="gap-2"
              >
                {uploadGrimoire.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Upload Grimoire
              </Button>
              {selectedFile && (
                <Button variant="outline" onClick={() => setSelectedFile(null)}>
                  Clear File
                </Button>
              )}
            </div>

            {errorMessage && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              2. Sectioned Knowledge
            </CardTitle>
            <CardDescription>
              Review the extracted sections. Forging the full grimoire course works without a selection;
              roadmap projection uses the sections you choose here.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!grimoire && (
              <div className="rounded-xl border border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground">
                Upload a grimoire to start extraction and sectioning.
              </div>
            )}

            {grimoire && grimoire.status !== 'ready' && grimoire.status !== 'failed' && (
              <div className="rounded-xl border border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                Processing {grimoire.detected_title || grimoire.original_filename}...
              </div>
            )}

            {grimoire?.status === 'failed' && (
              <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-5 text-sm text-destructive">
                {grimoire.processing_error || 'The grimoire could not be processed.'}
              </div>
            )}

            {grimoire?.status === 'ready' && (
              <>
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline">{grimoire.detected_title || grimoire.original_filename}</Badge>
                  <span className="text-sm text-muted-foreground">
                    {flatSections.length} extracted sections
                  </span>
                  <Button variant="outline" size="sm" onClick={selectAllSections}>
                    Select All
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearSections}>
                    Clear
                  </Button>
                </div>

                <div className="max-h-[28rem] overflow-y-auto rounded-xl border border-border bg-background/40 p-2">
                  {flatSections.map((section) => (
                    <label
                      key={section.id}
                      className={cn(
                        'flex items-start gap-3 rounded-lg border border-transparent px-3 py-3 transition-colors hover:bg-background/70',
                        selectedSectionIds.has(section.id) && 'bg-primary/8 border-primary/20'
                      )}
                      style={{ paddingLeft: `${section.depth * 16 + 12}px` }}
                    >
                      <Checkbox
                        checked={selectedSectionIds.has(section.id)}
                        onCheckedChange={() => toggleSection(section.id)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium text-foreground">{section.title}</span>
                          {section.suggested_tier ? (
                            <Badge variant="outline">Tier {section.suggested_tier}</Badge>
                          ) : null}
                          {section.match_confidence ? (
                            <Badge variant="outline">
                              {Math.round(section.match_confidence * 100)}% match
                            </Badge>
                          ) : null}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {section.summary || 'This section is ready for course generation.'}
                        </p>
                        {section.match_rationale && (
                          <p className="text-xs text-muted-foreground/80 mt-2">{section.match_rationale}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/70 border-border">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5 text-primary" />
              3. Forge And Project
            </CardTitle>
            <CardDescription>
              Create the dedicated grimoire course, then preview and apply roadmap placement.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="fantasy"
              className="w-full justify-center gap-2"
              disabled={!documentId || grimoire?.status !== 'ready' || createCourse.isPending}
              onClick={handleForgeCourse}
            >
              {createCourse.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
              Forge Whole Grimoire Course
            </Button>

            <Separator />

            <Button
              variant="outline"
              className="w-full justify-center gap-2"
              disabled={!documentId || selectedCount === 0 || previewProjection.isPending}
              onClick={handlePreviewProjection}
            >
              {previewProjection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Map className="w-4 h-4" />}
              Preview Roadmap Placement
            </Button>

            <Button
              className="w-full justify-center gap-2"
              disabled={!documentId || selectedCount === 0 || previewItems.length === 0 || applyProjection.isPending}
              onClick={handleApplyProjection}
            >
              {applyProjection.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              Apply Projection
            </Button>

            <div className="rounded-xl border border-border bg-background/40 px-4 py-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">Selected Sections</p>
              <p>{selectedCount === 0 ? 'No sections selected yet.' : `${selectedCount} sections chosen for roadmap preview.`}</p>
            </div>

            {lastProjectionSummary && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                  {lastProjectionSummary}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/70 border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Map className="w-5 h-5 text-primary" />
            Roadmap Projection Preview
          </CardTitle>
          <CardDescription>
            Previewed insertions show which existing path and tier each selected section will join.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {previewItems.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/40 px-4 py-5 text-sm text-muted-foreground">
              Select sections and run a preview to see their visual placement.
            </div>
          ) : (
            Object.entries(groupedPreview).map(([pathTitle, items]) => (
              <div key={pathTitle} className="space-y-3">
                <div className="flex items-center gap-3">
                  <Badge className="bg-primary/15 text-primary border-primary/30">{pathTitle}</Badge>
                  <span className="text-sm text-muted-foreground">{items.length} projected nodes</span>
                </div>
                <div className="grid gap-3 lg:grid-cols-2">
                  {items.map((item) => (
                    <div key={item.section_id} className="rounded-xl border border-border bg-background/40 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-foreground">{item.section_title}</p>
                          <p className="text-sm text-muted-foreground mt-1">{item.rationale}</p>
                        </div>
                        <Badge variant="outline">{Math.round(item.match_confidence * 100)}%</Badge>
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                        <div>
                          <p className="text-muted-foreground">Tier</p>
                          <p className="font-medium text-foreground">{item.target_tier}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Anchor</p>
                          <p className="font-medium text-foreground">{item.anchor_topic_title}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">X Position</p>
                          <p className="font-medium text-foreground">{item.suggested_position_x}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Y Position</p>
                          <p className="font-medium text-foreground">{item.suggested_position_y}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
