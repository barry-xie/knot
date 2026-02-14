/**
 * Canvas API client interface.
 * Backend will implement: validate token, fetch courses, modules, assignments.
 * Auth: Bearer token in Authorization header.
 * Base URL: https://<canvas-instance>/api/v1
 */

import type { CanvasCourse, CanvasModule, CanvasAssignment } from "../types";

export interface CanvasApiClient {
  /** Validate access token. Returns user info or throws. */
  validateToken(token: string): Promise<{ valid: boolean; userId?: string }>;

  /** GET /api/v1/courses?include[]=syllabus_body */
  getCourses(token: string): Promise<CanvasCourse[]>;

  /** GET /api/v1/courses/:course_id/modules?include[]=items */
  getModules(token: string, courseId: number): Promise<CanvasModule[]>;

  /** GET /api/v1/courses/:course_id/assignments */
  getAssignments(token: string, courseId: number): Promise<CanvasAssignment[]>;
}

/**
 * Mock implementation. Replace with real API calls when backend is ready.
 * Backend endpoints to implement:
 * - POST /api/auth/canvas/validate { token } -> { valid, userId? }
 * - GET /api/canvas/courses (uses stored token or passes token)
 * - GET /api/canvas/courses/:id/modules
 * - GET /api/canvas/courses/:id/assignments
 */
export const canvasApi: CanvasApiClient = {
  async validateToken() {
    return { valid: true, userId: "mock-user" };
  },

  async getCourses() {
    return []; // Mock: empty until backend connects
  },

  async getModules() {
    return [];
  },

  async getAssignments() {
    return [];
  },
};
