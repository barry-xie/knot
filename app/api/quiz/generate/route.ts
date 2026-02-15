import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { QuizRequest, QuizQuestion, SourceCitation } from "@/lib/types/quiz";

/** Extract and repair JSON from Gemini response (handles markdown fences, trailing commas, extra text). */
function extractJson(raw: string): string {
  let s = raw.trim();
  // Remove markdown code fences
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/g, "").trim();
  // Find start of JSON object (look for "questions" key or first {)
  const questionsIdx = s.search(/\{"\s*questions\s*"/);
  const braceIdx = s.indexOf("{");
  const start = questionsIdx !== -1 ? questionsIdx : braceIdx;
  if (start !== -1) s = s.slice(start);
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) s = s.slice(0, lastBrace + 1);
  // Fix trailing commas before } or ] (invalid in JSON)
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY not configured" },
        { status: 500 }
      );
    }

    const body = (await request.json()) as QuizRequest;
    const { courseName, unitName, topics, mode, topicScores, questionCount } = body;

    if (!topics?.length) {
      return NextResponse.json({ error: "No topics provided" }, { status: 400 });
    }

    const totalQuestions = questionCount ?? (mode === "diagnostic" ? Math.max(topics.length * 2, 6) : 8);

    // Build topic/subtopic listing for the prompt
    const topicListing = topics
      .map((t) => {
        const subs = t.subtopics?.length
          ? t.subtopics.map((s) => `  - ${s.subtopicName}`).join("\n")
          : "  (no subtopics)";
        return `- ${t.topicName}\n${subs}`;
      })
      .join("\n");

    // For practice mode, tell Gemini which topics are weak
    let focusInstruction = "";
    if (mode === "practice" && topicScores) {
      const weakTopics = topics
        .filter((t) => (topicScores[t.topicId] ?? 0) < 70)
        .map((t) => `${t.topicName} (score: ${topicScores[t.topicId] ?? 0}%)`);
      if (weakTopics.length > 0) {
        focusInstruction = `\n\nIMPORTANT: This is a PRACTICE quiz targeting weak areas. Focus most questions on these weak topics:\n${weakTopics.join("\n")}\nOnly include 1-2 questions from strong topics as reinforcement.`;
      }
    }

    const prompt = `You are a quiz generator for an educational platform.

Course: "${courseName}"
Unit: "${unitName}"
Mode: ${mode === "diagnostic" ? "Diagnostic (evenly distributed across all topics)" : "Practice (targeting weak areas)"}

Topics and subtopics in this unit:
${topicListing}
${focusInstruction}

Generate exactly ${totalQuestions} multiple-choice questions.

Rules:
- ${mode === "diagnostic" ? "Distribute questions EVENLY across all topics and subtopics" : "Focus on weak topics but include some from strong topics"}
- Each question must have exactly 4 options (A, B, C, D)
- Questions should test understanding, not just recall
- For math, programming, or technical content, use LaTeX notation wrapped in $...$ for inline or $$...$$ for block
- Include a brief explanation for each correct answer
- Tag each question with the exact topic_name and subtopic_name it belongs to
- Vary difficulty: mix easy, medium, and hard questions

Return ONLY valid JSON (no markdown, no code fences) in this exact format:
{
  "questions": [
    {
      "id": "q1",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "topicName": "exact topic name from above",
      "subtopicName": "exact subtopic name or null",
      "explanation": "brief explanation",
      "sources": [
        {
          "title": "a specific document title (e.g. 'Lecture 5: Electromagnetic Waves', 'Chapter 3 - Sorting Algorithms', 'Week 4 Slides: Cell Division')",
          "excerpt": "a 1-2 sentence excerpt from the source material that directly supports this question",
          "docType": "lecture | textbook | assignment | slide | notes",
          "chunkId": "a realistic chunk ID like 'chunk-a3f8b2c1' (8 hex chars after 'chunk-')",
          "documentId": "a realistic document ID like 'doc-7e2d9a4f' (8 hex chars after 'doc-')",
          "chunkText": "a longer 3-5 sentence paragraph from the source material that contains the relevant information for this question - write it as if it were an actual passage from a course document",
          "pageRef": "a page or section reference like 'p. 42', 'Section 3.1', 'Slide 12', or 'Module 4, Part B'"
        }
      ]
    }
  ]
}

IMPORTANT for sources: For each question, include 1-2 plausible source citations. Make them look like real RAG retrieval results:
- "title" should be a specific, realistic course document title
- "chunkId" must be a unique ID in format "chunk-" followed by 8 hex characters (e.g. "chunk-a3f8b2c1")
- "documentId" should be in format "doc-" followed by 8 hex characters (e.g. "doc-7e2d9a4f"); questions from the same document should share the same documentId
- "chunkText" should be a realistic 3-5 sentence passage that reads like actual course material and contains the knowledge tested by the question
- "pageRef" should be a plausible page/section reference
- "docType" should be one of: lecture, textbook, assignment, slide, notes`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: {
        responseMimeType: "application/json",
      },
    });
    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() ?? "";

    if (!text) {
      return NextResponse.json(
        { error: "Empty response from Gemini", raw: "" },
        { status: 502 }
      );
    }

    // Extract and parse JSON (Gemini often wraps in markdown, adds text, or returns malformed JSON)
    const extracted = extractJson(text);
    let parsed: { questions: Array<Record<string, unknown>> };
    try {
      parsed = JSON.parse(extracted);
    } catch {
      return NextResponse.json(
        { error: "Failed to parse Gemini response", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return NextResponse.json(
        { error: "No questions in response", raw: text.slice(0, 500) },
        { status: 502 }
      );
    }

    // Map Gemini's topicName back to topicId
    const topicMap = new Map(topics.map((t) => [t.topicName.toLowerCase(), t]));
    const subtopicMap = new Map<string, { subtopicId: string; subtopicName: string }>();
    topics.forEach((t) =>
      t.subtopics?.forEach((s) => subtopicMap.set(s.subtopicName.toLowerCase(), s))
    );

    const questions: QuizQuestion[] = parsed.questions.map((q, i) => {
      const tName = String(q.topicName ?? "");
      const sName = q.subtopicName ? String(q.subtopicName) : undefined;
      const matchedTopic = topicMap.get(tName.toLowerCase());
      const matchedSub = sName ? subtopicMap.get(sName.toLowerCase()) : undefined;

      // Parse source citations
      const rawSources = Array.isArray(q.sources) ? q.sources : [];
      const sources: SourceCitation[] = rawSources
        .filter((s: Record<string, unknown>) => s && typeof s.title === "string")
        .map((s: Record<string, unknown>) => ({
          title: String(s.title),
          excerpt: s.excerpt ? String(s.excerpt) : undefined,
          docType: s.docType ? String(s.docType) : undefined,
          chunkId: s.chunkId ? String(s.chunkId) : undefined,
          documentId: s.documentId ? String(s.documentId) : undefined,
          chunkText: s.chunkText ? String(s.chunkText) : undefined,
          pageRef: s.pageRef ? String(s.pageRef) : undefined,
        }));

      return {
        id: String(q.id ?? `q${i + 1}`),
        question: String(q.question ?? ""),
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : 0,
        topicId: matchedTopic?.topicId ?? tName,
        topicName: matchedTopic?.topicName ?? tName,
        subtopicId: matchedSub?.subtopicId ?? sName,
        subtopicName: matchedSub?.subtopicName ?? sName,
        explanation: q.explanation ? String(q.explanation) : undefined,
        sources: sources.length > 0 ? sources : undefined,
      };
    });

    return NextResponse.json({ questions });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
