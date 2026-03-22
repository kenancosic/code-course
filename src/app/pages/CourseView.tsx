import { useState } from "react";
import { useParams, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { ArrowLeft, BookOpen, ChevronRight, Clock, Play, Circle, Sparkles } from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Skeleton } from "../components/ui/skeleton";
import { cn } from "../../lib/utils";
import { useCourse } from "../../hooks";
import type { CourseLesson } from "../../hooks";

export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>();
  const { data: course, isLoading, error } = useCourse(courseId || "");
  const [activeLessonId, setActiveLessonId] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-96 w-full" />
          </div>
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BookOpen className="w-16 h-16 text-slate-600 mb-4" />
        <h2 className="text-2xl font-bold text-white mb-2">Course Not Found</h2>
        <p className="text-slate-400 mb-6">The course you are looking for does not exist or is still generating.</p>
        <Button asChild variant="fantasy">
          <Link to="/roadmap">Back to Roadmaps</Link>
        </Button>
      </div>
    );
  }

  const sortedLessons = [...course.lessons].sort((a, b) => a.sort_order - b.sort_order);
  const activeLesson: CourseLesson | undefined = activeLessonId
    ? sortedLessons.find((l) => l.id === activeLessonId)
    : sortedLessons[0];

  return (
    <div className="h-full flex flex-col animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6 shrink-0">
        <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-white group">
          <Link to="/roadmap">
            <ArrowLeft className="w-5 h-5 mr-2 group-hover:-translate-x-1 transition-transform" /> Back
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-white tracking-tight">{course.title}</h1>
          {course.description && <p className="text-slate-400 mt-1">{course.description}</p>}
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-400">
          <span className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            {course.total_lessons} lessons
          </span>
          <span className="flex items-center gap-1">
            <Sparkles className="w-4 h-4 text-yellow-400" />
            {course.total_xp} XP
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Lesson Content */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-4">
          {activeLesson ? (
            <Card className="border-slate-800 bg-slate-900/40">
              <CardHeader>
                <div className="flex items-center gap-2 text-sm text-slate-500 mb-2">
                  <BookOpen className="w-4 h-4" />
                  <span>
                    Lesson {sortedLessons.findIndex((l) => l.id === activeLesson.id) + 1} of{" "}
                    {sortedLessons.length}
                  </span>
                  <span className="ml-auto text-yellow-400 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" /> {activeLesson.xp_reward} XP
                  </span>
                </div>
                <CardTitle className="text-2xl text-white">{activeLesson.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-invert prose-slate max-w-none prose-pre:bg-slate-950 prose-pre:border prose-pre:border-slate-700 prose-code:text-emerald-400">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {activeLesson.content_markdown || "*No content yet — this lesson is still being generated.*"}
                  </ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-500">
              <p>Select a lesson to begin</p>
            </div>
          )}
        </div>

        {/* Lesson Navigation Sidebar */}
        <div className="w-80 shrink-0 overflow-y-auto custom-scrollbar">
          <Card className="border-slate-800 bg-slate-900/40 sticky top-0">
            <CardHeader>
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" />
                Course Content
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <nav className="space-y-1 p-4 pt-0">
                {sortedLessons.map((lesson, index) => {
                  const isActive = lesson.id === activeLesson?.id;
                  return (
                    <button
                      key={lesson.id}
                      onClick={() => setActiveLessonId(lesson.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all",
                        isActive
                          ? "bg-indigo-500/20 border border-indigo-500/30"
                          : "hover:bg-slate-800/50 border border-transparent"
                      )}
                    >
                      <div className="flex flex-col items-center gap-1 shrink-0">
                        {isActive ? (
                          <Play className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <Circle className="w-4 h-4 text-slate-600" />
                        )}
                        {index < sortedLessons.length - 1 && (
                          <div className="w-0.5 h-full bg-slate-800 min-h-[20px]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className={cn(
                            "font-medium text-sm",
                            isActive ? "text-white" : "text-slate-300"
                          )}
                        >
                          {lesson.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {lesson.xp_reward} XP
                        </p>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
