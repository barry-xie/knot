# Canvas API Integration Guide

For backend engineers connecting knot to Canvas LMS.

## Authentication

- **Access Token**: Users generate tokens from Canvas Profile → Settings → Approved Integrations.
- **Header**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Base URL**: `https://<canvas-instance>/api/v1` (e.g. `https://canvas.stanford.edu/api/v1`)

## Key Endpoints

| Purpose | Endpoint | Notes |
|---------|----------|-------|
| List user's courses | `GET /courses?include[]=syllabus_body` | Returns active courses |
| List modules (units/topics) | `GET /courses/:course_id/modules?include[]=items` | Modules = units; items = pages, assignments, quizzes |
| List module items | `GET /courses/:course_id/modules/:module_id/items` | If items not inline |
| List assignments | `GET /courses/:course_id/assignments` | Include exams (submission_types may include `on_paper` for exams) |

## Data Model for Mindmap

- **Nodes (primary)**: Canvas **Modules** = topics/units. Each module has `name`, `position`, `items[]`.
- **Module items**: Can be `Assignment`, `Quiz`, `Page`, `File`, `SubHeader`, etc. Link assignments/exams to their parent module.
- **Assignments/Exams**: Shown as secondary nodes or attached to module nodes. Use `submission_types` to distinguish (e.g. `on_paper` often = exam).

## Types (see `lib/types/index.ts`)

Frontend expects:
- `CanvasCourse`: id, name, course_code, syllabus_body
- `CanvasModule`: id, name, position, items[]
- `CanvasModuleItem`: id, title, type, content_id
- `CanvasAssignment`: id, name, due_at, points_possible

## Suggested Backend API

```
POST /api/auth/canvas/validate   { token } -> { valid, userId?, canvasBaseUrl? }
GET  /api/canvas/courses        -> CourseTree[] (or proxy to Canvas)
GET  /api/canvas/courses/:id    -> full CourseTree with modules + assignments
POST /api/study-goals           { name, documents[], links[] } -> StudyGoalTree
```
