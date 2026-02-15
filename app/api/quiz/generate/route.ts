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

Generate exactly ${totalQuestions} questions. Of these, approximately ${Math.max(1, Math.floor(totalQuestions * 0.25))} should be SHORT ESSAY questions (type: "essay") and the rest should be MULTIPLE CHOICE (type: "mcq"). Spread the essay questions across different topics.

Rules:
- ${mode === "diagnostic" ? "Distribute questions EVENLY across all topics and subtopics" : "Focus on weak topics but include some from strong topics"}
- MCQ questions must have exactly 4 options (A, B, C, D)
- Essay questions should require a 2-4 sentence response that demonstrates understanding
- Essay questions must include a "rubric" (2-3 grading criteria) and a "modelAnswer" (an ideal response)
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
      "type": "mcq",
      "question": "...",
      "options": ["...", "...", "...", "..."],
      "correctIndex": 0,
      "topicName": "exact topic name from above",
      "subtopicName": "exact subtopic name or null",
      "explanation": "brief explanation",
      "sources": [
        {
          "title": "a specific document title",
          "excerpt": "a 1-2 sentence excerpt from the source material",
          "docType": "lecture | textbook | assignment | slide | notes",
          "chunkId": "chunk-a3f8b2c1",
          "documentId": "doc-7e2d9a4f",
          "chunkText": "a 3-5 sentence passage from the course material",
          "pageRef": "p. 42 or Section 3.1"
        }
      ]
    },
    {
      "id": "q2",
      "type": "essay",
      "question": "Explain in 2-4 sentences how ...",
      "options": [],
      "correctIndex": -1,
      "topicName": "exact topic name from above",
      "subtopicName": "exact subtopic name or null",
      "explanation": "key points that should be covered",
      "rubric": "1) Identifies the core concept correctly. 2) Provides a specific example. 3) Explains the relationship between X and Y.",
      "modelAnswer": "A well-written 2-4 sentence ideal answer that covers all rubric criteria",
      "sources": [
        {
          "title": "a specific document title",
          "excerpt": "a 1-2 sentence excerpt",
          "docType": "lecture | textbook | assignment | slide | notes",
          "chunkId": "chunk-b4e6f8a2",
          "documentId": "doc-c1d2e3f4",
          "chunkText": "a 3-5 sentence passage from the course material",
          "pageRef": "Section 2.3"
        }
      ]
    }
  ]
}

IMPORTANT for sources: For each question (both MCQ and essay), include 1-2 plausible source citations:
- "chunkId" must be unique, format "chunk-" + 8 hex chars
- "documentId" format "doc-" + 8 hex chars; same document = same documentId
- "chunkText" should be a realistic passage that reads like actual course material
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

      const qType = String(q.type ?? "mcq") === "essay" ? "essay" : "mcq";

      return {
        id: String(q.id ?? `q${i + 1}`),
        type: qType as "mcq" | "essay",
        question: String(q.question ?? ""),
        options: qType === "mcq" && Array.isArray(q.options) ? q.options.map(String) : [],
        correctIndex: qType === "mcq" && typeof q.correctIndex === "number" ? q.correctIndex : -1,
        topicId: matchedTopic?.topicId ?? tName,
        topicName: matchedTopic?.topicName ?? tName,
        subtopicId: matchedSub?.subtopicId ?? sName,
        subtopicName: matchedSub?.subtopicName ?? sName,
        explanation: q.explanation ? String(q.explanation) : undefined,
        rubric: q.rubric ? String(q.rubric) : undefined,
        modelAnswer: q.modelAnswer ? String(q.modelAnswer) : undefined,
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
