/**
 * Shared types for knot. Frontend is built to receive these from the backend.
 * Canvas API types align with official Canvas LMS REST API.
 * @see https://canvas.instructure.com/doc/api/
 */

// --- Canvas API types (backend will fetch from Canvas) ---

export interface CanvasCourse {
  id: number;
  name: string;
  course_code: string;
  syllabus_body?: string | null;
  workflow_state: "unpublished" | "available" | "completed" | "deleted";
}

export interface CanvasModule {
  id: number;
  name: string;
  position: number;
  items_count: number;
  items?: CanvasModuleItem[];
  prerequisite_module_ids?: number[];
}

export interface CanvasModuleItem {
  id: number;
  module_id: number;
  title: string;
  type: "File" | "Page" | "Discussion" | "Assignment" | "Quiz" | "SubHeader" | "ExternalUrl" | "ExternalTool";
  content_id?: number;
  position: number;
  indent: number;
}

export interface CanvasAssignment {
  id: number;
  name: string;
  due_at: string | null;
  points_possible: number;
  submission_types: string[];
}

// --- App types ---

export type TreeSource = "canvas" | "manual";

export interface CourseTree {
  source: "canvas";
  course: CanvasCourse;
  modules: CanvasModule[];
  assignments: CanvasAssignment[];
}

export interface StudyGoalTree {
  source: "manual";
  id: string;
  name: string;
  documents: { name: string }[]; // uploaded files (name = filename)
  links: { title: string; url: string }[];
}

export type TreeItem = CourseTree | StudyGoalTree;
