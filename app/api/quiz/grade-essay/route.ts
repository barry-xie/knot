import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { EssayGradeResult, SourceCitation } from "@/lib/types/quiz";

/** Extract and repair JSON from Gemini response. */
function extractJson(raw: string): string {
  let s = raw.trim();
  s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/g, "").trim();
  const braceIdx = s.indexOf("{");
  if (braceIdx !== -1) s = s.slice(braceIdx);
  const lastBrace = s.lastIndexOf("}");
  if (lastBrace !== -1) s = s.slice(0, lastBrace + 1);
  s = s.replace(/,(\s*[}\]])/g, "$1");
  return s;
}

export const runtime = "nodejs";
export const maxDuration = 30;

type GradeRequest = {
  courseName: string;
  question: string;
  rubric?: string;
  modelAnswer?: string;
  studentAnswer: string;
  /** Source citations from the question for context */
  sources?: SourceCitation[];
};

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }

    const body = (await request.json()) as GradeRequest;
    const { courseName, question, rubric, modelAnswer, studentAnswer, sources } = body;

    if (!studentAnswer?.trim()) {
      return NextResponse.json({ error: "No answer provided" }, { status: 400 });
    }

    // Build source context for grading
    const sourceContext = sources?.length
      ? `\n\nRelevant course material:\n${sources.map((s, i) =>
          `[Source ${i + 1}] ${s.title}${s.pageRef ? ` (${s.pageRef})` : ""}\n${s.chunkText || s.excerpt || ""}`
        ).join("\n\n")}`
      : "";

    const prompt = `You are grading a short essay answer for a course quiz. Be fair, constructive, and specific.

Course: "${courseName}"

Question: ${question}
${rubric ? `\nRubric criteria:\n${rubric}` : ""}
${modelAnswer ? `\nModel answer (for reference, not to be shown to student):\n${modelAnswer}` : ""}
${sourceContext}

Student's answer:
"${studentAnswer}"

Grade the response on a scale of 0-100. Consider:
- Accuracy of the content
- Completeness relative to the rubric criteria
- Clarity and coherence of explanation
- Use of relevant terminology

Return ONLY valid JSON:
{
  "score": 0-100,
  "feedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"],
  "sources": [
    {
      "title": "specific document title (e.g. 'Lecture 5: Electromagnetic Waves')",
      "excerpt": "relevant excerpt that the answer should have referenced",
      "docType": "lecture | textbook | assignment | slide | notes",
      "chunkId": "chunk- followed by 8 random hex characters e.g. chunk-a3f8b2c1",
      "documentId": "doc- followed by 8 random hex characters e.g. doc-7e2d9a4f",
      "chunkText": "a 2-4 sentence passage from the course material relevant to grading this answer",
      "pageRef": "page or section reference e.g. p. 42 or Section 3.1"
    }
  ]
}

IMPORTANT for sources:
- Include 1-2 source citations most relevant to grading this answer
- chunkId MUST be "chunk-" followed by exactly 8 unique lowercase hex characters (e.g. "chunk-e7b3a91f")
- documentId MUST be "doc-" followed by exactly 8 unique lowercase hex characters (e.g. "doc-4c8d2e6a")
- Do NOT use placeholder X characters — generate actual random hex values`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash",
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(prompt);
    const text = result.response.text()?.trim() ?? "";

    if (!text) {
      return NextResponse.json({ error: "Empty response from Gemini" }, { status: 502 });
    }

    const extracted = extractJson(text);
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(extracted);
    } catch {
      return NextResponse.json({ error: "Failed to parse grading response" }, { status: 502 });
    }

    const gradeSources: SourceCitation[] = Array.isArray(parsed.sources)
      ? (parsed.sources as Record<string, unknown>[])
          .filter((s) => s && typeof s.title === "string")
          .map((s) => ({
            title: String(s.title),
            excerpt: s.excerpt ? String(s.excerpt) : undefined,
            docType: s.docType ? String(s.docType) : undefined,
            chunkId: s.chunkId ? String(s.chunkId) : undefined,
            documentId: s.documentId ? String(s.documentId) : undefined,
            chunkText: s.chunkText ? String(s.chunkText) : undefined,
            pageRef: s.pageRef ? String(s.pageRef) : undefined,
          }))
      : [];

    const gradeResult: EssayGradeResult = {
      score: typeof parsed.score === "number" ? Math.min(100, Math.max(0, parsed.score)) : 50,
      feedback: String(parsed.feedback ?? ""),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.map(String) : undefined,
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.map(String) : undefined,
      sources: gradeSources.length > 0 ? gradeSources : undefined,
    };

    return NextResponse.json(gradeResult);
  } catch (err) {
    console.error("Essay grading error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
