/** Shared quiz types, used by API route, service layer, and UI. */

export type QuizQuestion = {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  explanation?: string;
};

export type QuizMode = "diagnostic" | "practice";

export type QuizRequest = {
  /** For RAG: Canvas course id; when set + Snowflake configured, quiz uses retrieved chunks. */
  courseId?: string;
  /** For RAG: optional unit id to scope retrieval. */
  unitId?: string;
  courseName: string;
  unitName: string;
  topics: Array<{
    topicId: string;
    topicName: string;
    subtopics: Array<{ subtopicId: string; subtopicName: string }>;
  }>;
  mode: QuizMode;
  /** For practice mode: topic scores from prior diagnostic, so Gemini targets weak areas. */
  topicScores?: Record<string, number>;
  questionCount?: number;
};

/** RAG source chunk returned when quiz was generated with retrieved material. */
export type QuizSource = {
  chunk_id: string;
  document_id: string;
  document_title: string;
  course_name: string;
  module_name: string;
  score: number;
  text: string;
};

export type QuizResult = {
  questions: QuizQuestion[];
  answers: number[]; // user's selected option index per question
  score: number; // 0–100
  topicScores: Record<string, number>; // topicId → 0–100
  completedAt: string; // ISO timestamp
};
