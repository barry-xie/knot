"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { CourseTree, StudyGoalTree, TreeItem } from "@/lib/types";
import { mockCourseTrees, mockStudyGoalTrees } from "@/lib/mocks/trees";

function MindmapNode({
  label,
  variant = "default",
  children,
}: {
  label: string;
  variant?: "center" | "assignment" | "default";
  children?: React.ReactNode;
}) {
  const base = "rounded-lg px-4 py-2 font-sans text-sm transition-colors";
  const variants = {
    center: "bg-[#537aad] font-medium text-[#fffbf9]",
    assignment: "border border-[#537aad]/40 bg-[#fffbf9] text-[#537aad]/90",
    default: "border border-[#537aad]/30 bg-[#fffbf9] text-[#537aad]",
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`${base} ${variants[variant]}`}>{label}</div>
      {children && (
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
          {children}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return <div className="h-4 w-px bg-[#537aad]/25 sm:h-px sm:w-4 sm:min-w-4" aria-hidden />;
}

function CourseMindmap({ tree }: { tree: CourseTree }) {
  const { course, modules, assignments } = tree;
  const assignmentMap = new Map(assignments.map((a) => [a.id, a]));

  return (
    <div className="flex flex-col items-center">
      <MindmapNode label={course.course_code || course.name} variant="center">
        <Connector />
        <div className="flex flex-col gap-8 sm:flex-row sm:flex-wrap sm:gap-6">
          {modules.map((mod) => (
            <MindmapNode key={mod.id} label={mod.name}>
              <Connector />
              <div className="flex flex-wrap justify-center gap-3">
                {mod.items
                  ?.filter((item) => item.type !== "SubHeader" || item.title)
                  .map((item) => {
                    if (item.type === "Assignment" || item.type === "Quiz") {
                      const a = item.content_id ? assignmentMap.get(item.content_id) : null;
                      return (
                        <MindmapNode key={item.id} label={a?.name || item.title} variant="assignment" />
                      );
                    }
                    return <MindmapNode key={item.id} label={item.title} />;
                  })}
              </div>
            </MindmapNode>
          ))}
        </div>
      </MindmapNode>
    </div>
  );
}

function StudyGoalMindmap({ tree }: { tree: StudyGoalTree }) {
  return (
    <div className="flex flex-col items-center">
      <MindmapNode label={tree.name} variant="center">
        <Connector />
        <div className="flex flex-wrap justify-center gap-3">
          {tree.documents.map((d, i) => (
            <MindmapNode key={`doc-${i}`} label={d.name} variant="assignment" />
          ))}
          {tree.links.map((l, i) => (
            <MindmapNode key={`link-${i}`} label={l.title} variant="assignment" />
          ))}
        </div>
      </MindmapNode>
    </div>
  );
}

export default function DashboardPage() {
  const [courseTrees, setCourseTrees] = useState<CourseTree[]>(mockCourseTrees);
  const [studyGoalTrees, setStudyGoalTrees] = useState<StudyGoalTree[]>(mockStudyGoalTrees);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const loadFromStorage = useCallback(() => {
    if (typeof window === "undefined") return;
    const source = localStorage.getItem("knot_onboard_source");
    if (source === "canvas") {
      // Backend would fetch courses. For now keep mock.
      setCourseTrees(mockCourseTrees);
      const first = mockCourseTrees[0];
      if (first) setSelectedId(`course-${first.course.id}`);
    } else if (source === "manual") {
      const stored = JSON.parse(localStorage.getItem("knot_study_goals") || "[]");
      setStudyGoalTrees(stored);
      const first = stored[0];
      if (first) setSelectedId(`goal-${first.id}`);
    } else {
      // No onboarding - show combined mock
      setSelectedId(`course-${mockCourseTrees[0]?.course.id ?? ""}`);
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const allItems: { id: string; label: string; tree: TreeItem }[] = [
    ...courseTrees.map((t) => ({ id: `course-${t.course.id}`, label: t.course.course_code || t.course.name, tree: t })),
    ...studyGoalTrees.map((t) => ({ id: `goal-${t.id}`, label: t.name, tree: t })),
  ];

  const selected = selectedId ? allItems.find((i) => i.id === selectedId) : null;

  return (
    <div className="flex min-h-screen lowercase bg-[#fffbf9] font-sans">
      {/* Sidebar */}
      <aside
        className="flex w-56 shrink-0 flex-col border-r border-[#537aad]/10 bg-[#fffbf9]"
        style={{ backgroundColor: "color-mix(in srgb, #fffbf9 99%, #537aad 1%)" }}
      >
        <div className="flex items-center justify-between border-b border-[#537aad]/10 px-4 py-4">
          <Link href="/" className="font-serif text-[1.05rem] tracking-tight text-[#537aad] hover:opacity-80">
            knot.
          </Link>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-2 px-2 text-xs font-medium uppercase tracking-wider text-[#537aad]/60">
            courses & goals
          </p>
          {allItems.length === 0 ? (
            <p className="px-2 text-sm text-[#537aad]/60">no items yet. complete onboarding first.</p>
          ) : (
            <ul className="space-y-1">
              {allItems.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                      selectedId === item.id
                        ? "bg-[#537aad] text-[#fffbf9]"
                        : "text-[#537aad] hover:bg-[#537aad]/10"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </nav>
        <div className="border-t border-[#537aad]/10 p-3">
          <Link
            href="/onboard"
            className="block rounded-lg border border-[#537aad]/40 px-3 py-2 text-center text-sm text-[#537aad] transition-colors hover:bg-[#537aad]/5"
          >
            add course or goal
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="border-b border-[#537aad]/10 px-6 py-4 sm:px-8">
          <h1 className="font-serif text-xl font-normal tracking-tight text-[#537aad] md:text-2xl">
            {selected ? selected.label : "select a course or goal"}
          </h1>
          <p className="mt-1 font-sans text-sm text-[#537aad]/80">
            {selected?.tree.source === "canvas"
              ? "topics (modules), assignments, and exams from Canvas"
              : "documents and links for your study goal"}
          </p>
        </div>

        <div className="p-6 sm:p-8 md:p-10">
          {!selected ? (
            <div className="rounded-xl border border-dashed border-[#537aad]/30 bg-[#fffbf9] p-12 text-center">
              <p className="text-[#537aad]/70">select a course or study goal from the sidebar.</p>
            </div>
          ) : (
            <div className="rounded-xl border border-[#537aad]/15 bg-[#fffbf9] p-8 sm:p-10 md:p-12">
              {selected.tree.source === "canvas" ? (
                <CourseMindmap tree={selected.tree as CourseTree} />
              ) : (
                <StudyGoalMindmap tree={selected.tree as StudyGoalTree} />
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-6 font-sans text-sm text-[#537aad]/80">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-md bg-[#537aad]" />
              topic / unit
            </span>
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-md border border-[#537aad]/40" />
              assignment / exam
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
