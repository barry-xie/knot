/**
 * Mock data for development. Swap for API calls when backend is ready.
 */

import type { CourseTree, StudyGoalTree } from "@/lib/types";

export const mockCourseTrees: CourseTree[] = [
  {
    source: "canvas",
    course: {
      id: 101,
      name: "Introduction to Computer Science",
      course_code: "CS 101",
      syllabus_body: null,
      workflow_state: "available",
    },
    modules: [
      {
        id: 1,
        name: "Variables and Data Types",
        position: 1,
        items_count: 4,
        items: [
          { id: 1, module_id: 1, title: "Variables", type: "Page", position: 1, indent: 0 },
          { id: 2, module_id: 1, title: "HW 1: Variables", type: "Assignment", content_id: 10, position: 2, indent: 0 },
          { id: 3, module_id: 1, title: "Data Types", type: "Page", position: 3, indent: 0 },
          { id: 4, module_id: 1, title: "Quiz 1", type: "Quiz", content_id: 11, position: 4, indent: 0 },
        ],
      },
      {
        id: 2,
        name: "Control Flow",
        position: 2,
        items_count: 3,
        items: [
          { id: 5, module_id: 2, title: "Conditionals", type: "Page", position: 1, indent: 0 },
          { id: 6, module_id: 2, title: "Loops", type: "Page", position: 2, indent: 0 },
          { id: 7, module_id: 2, title: "HW 2: Control Flow", type: "Assignment", content_id: 12, position: 3, indent: 0 },
        ],
      },
      {
        id: 3,
        name: "Functions",
        position: 3,
        items_count: 3,
        items: [
          { id: 8, module_id: 3, title: "Defining Functions", type: "Page", position: 1, indent: 0 },
          { id: 9, module_id: 3, title: "Midterm", type: "Assignment", content_id: 13, position: 2, indent: 0 },
        ],
      },
    ],
    assignments: [
      { id: 10, name: "HW 1: Variables", due_at: "2025-02-20T23:59:00Z", points_possible: 10, submission_types: ["online_text_entry"] },
      { id: 12, name: "HW 2: Control Flow", due_at: "2025-03-01T23:59:00Z", points_possible: 15, submission_types: ["online_upload"] },
      { id: 13, name: "Midterm", due_at: "2025-03-15T14:00:00Z", points_possible: 100, submission_types: ["on_paper"] },
    ],
  },
  {
    source: "canvas",
    course: {
      id: 202,
      name: "Calculus I",
      course_code: "MATH 202",
      syllabus_body: null,
      workflow_state: "available",
    },
    modules: [
      {
        id: 10,
        name: "Limits",
        position: 1,
        items_count: 2,
        items: [
          { id: 20, module_id: 10, title: "Limits Intro", type: "Page", position: 1, indent: 0 },
          { id: 21, module_id: 10, title: "Problem Set 1", type: "Assignment", content_id: 30, position: 2, indent: 0 },
        ],
      },
      {
        id: 11,
        name: "Derivatives",
        position: 2,
        items_count: 2,
        items: [
          { id: 22, module_id: 11, title: "Derivative Rules", type: "Page", position: 1, indent: 0 },
          { id: 23, module_id: 11, title: "Final Exam", type: "Assignment", content_id: 31, position: 2, indent: 0 },
        ],
      },
    ],
    assignments: [
      { id: 30, name: "Problem Set 1", due_at: "2025-02-25T23:59:00Z", points_possible: 20, submission_types: ["online_upload"] },
      { id: 31, name: "Final Exam", due_at: "2025-05-10T14:00:00Z", points_possible: 150, submission_types: ["on_paper"] },
    ],
  },
];

export const mockStudyGoalTrees: StudyGoalTree[] = [];
