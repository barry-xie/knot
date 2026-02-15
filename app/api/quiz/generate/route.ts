import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { QuizRequest, QuizQuestion } from "@/lib/types/quiz";
import { embedText } from "@/lib/rag/embed";
import { retrieveChunks, isSnowflakeRagConfigured, type RagChunk } from "@/lib/rag/snowflake";

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
    const { courseId, unitId, courseName, unitName, topics, mode, topicScores, questionCount } = body;

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

    // Optional RAG: retrieve chunks and prepend to prompt; on any failure, fall back to non-RAG
    let chunks: RagChunk[] = [];
    let ragQueryUsed = "";
    if (courseId?.trim() && isSnowflakeRagConfigured()) {
      try {
        const topicNames = topics.map((t) => t.topicName).filter(Boolean);
        const subtopicNames = topics.flatMap((t) => (t.subtopics ?? []).map((s) => s.subtopicName).filter(Boolean));
        const queryParts = [`Unit: ${unitName}`];
        if (topicNames.length) queryParts.push(`Topics: ${topicNames.join(", ")}`);
        if (subtopicNames.length) queryParts.push(`Subtopics: ${subtopicNames.join(", ")}`);
        const query = queryParts.join(". ");
        ragQueryUsed = query;
        const embedding = await embedText(query);
        chunks = await retrieveChunks(courseId.trim(), embedding, { unitId: unitId?.trim() || undefined });
        if (chunks.length >= 1) {
          console.log(`[Quiz RAG] courseId=${courseId} unitId=${unitId ?? "(none)"} chunks=${chunks.length} query="${query.slice(0, 80)}..."`);
        }
      } catch (e) {
        console.warn("RAG retrieval failed, using non-RAG prompt:", e);
        chunks = [];
      }
    }

    const materialBlock =
      chunks.length >= 1
        ? chunks
            .map(
              (c, i) =>
                `[Source ${i + 1}] (chunk_id: ${c.chunk_id})\n  Course: ${c.course_name || ""} | Module: ${c.module_name || ""} | Document: ${c.document_title || "Unknown"}\n  Content:\n${(c.text || "").trim()}\n`
            )
            .join("\n")
        : "";

    const ragPreamble =
      materialBlock.length > 0
        ? `The following course material was retrieved for this unit. Base at least 80% of your answers on this material.\n\nCourse material (each has a chunk_id for reference):\n${materialBlock}\n\n`
        : "";

    const prompt = `${ragPreamble}You are a quiz generator for an educational platform.

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
      "explanation": "brief explanation"
    }
  ]
}`;

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
      };
    });

    const ragUsed = chunks.length >= 1;
    const sources =
      chunks.length >= 1
        ? chunks.map((c) => ({
            chunk_id: c.chunk_id,
            document_id: c.document_id,
            document_title: c.document_title || "",
            course_name: c.course_name || "",
            module_name: c.module_name || "",
            score: c.score,
            text: c.text || "",
          }))
        : undefined;
    return NextResponse.json({
      questions,
      ...(sources ? { sources } : {}),
      _debug: {
        ragUsed,
        chunkCount: chunks.length,
        ...(ragQueryUsed ? { query: ragQueryUsed } : {}),
      },
    });
  } catch (err) {
    console.error("Quiz generation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
