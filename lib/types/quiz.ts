/** Shared quiz types, used by API route, service layer, and UI. */

/** A single source citation from the RAG system. */
export type SourceCitation = {
  /** Human-readable title (e.g. "Module 3 | Lecture Notes: Binary Arithmetic") */
  title: string;
  /** Short excerpt from the source chunk that supports this question/answer */
  excerpt?: string;
  /** Document type hint: "lecture", "textbook", "assignment", "slide", etc. */
  docType?: string;
  /** Original chunk_id for traceability (e.g. "chunk-ab12c3d4") */
  chunkId?: string;
  /** Parent document_id (e.g. "doc-9f8e7d6c") */
  documentId?: string;
  /** Full text of the source chunk for verification */
  chunkText?: string;
  /** Optional page/section reference (e.g. "p. 42", "Section 3.1") */
  pageRef?: string;
};

export type QuestionType = "mcq" | "essay";

export type QuizQuestion = {
  id: string;
  /** "mcq" (default) or "essay" */
  type?: QuestionType;
  question: string;
  /** MCQ only */
  options: string[];
  /** MCQ only */
  correctIndex: number;
  topicId: string;
  topicName: string;
  subtopicId?: string;
  subtopicName?: string;
  explanation?: string;
  /** RAG source citations backing this question */
  sources?: SourceCitation[];
  /** Essay only: rubric/criteria for grading (shown after submission) */
  rubric?: string;
  /** Essay only: model answer for reference */
  modelAnswer?: string;
};

/** Response from the essay grading API */
export type EssayGradeResult = {
  /** 0–100 */
  score: number;
  /** Qualitative feedback */
  feedback: string;
  /** Strengths identified */
  strengths?: string[];
  /** Areas for improvement */
  improvements?: string[];
  /** Source citations used for grading */
  sources?: SourceCitation[];
};

export type QuizMode = "diagnostic" | "practice";

export type QuizRequest = {
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

export type QuizResult = {
  questions: QuizQuestion[];
  answers: number[]; // user's selected option index per question
  score: number; // 0–100
  topicScores: Record<string, number>; // topicId → 0–100
  completedAt: string; // ISO timestamp
};
