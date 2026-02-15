/**
 * RAG embedding: same model and dimensions as ingestion (Snowflake document_chunks).
 * Uses Gemini API so query embeddings match stored chunk embeddings.
 */

import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "models/gemini-embedding-001";
const OUTPUT_DIMENSIONALITY = 768;

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!client) {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) throw new Error("GEMINI_API_KEY is required for embedding");
    client = new GoogleGenAI({ apiKey });
  }
  return client;
}

/**
 * Embed a single text for RAG retrieval. Returns 768-dim vector matching ingestion.
 */
export async function embedText(text: string): Promise<number[]> {
  const trimmed = (text || " ").trim();
  const ai = getClient();
  const response = await ai.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: trimmed,
    config: { outputDimensionality: OUTPUT_DIMENSIONALITY },
  });
  const embeddings = response.embeddings;
  if (!embeddings?.length || !embeddings[0].values?.length) {
    throw new Error("No embedding returned from Gemini");
  }
  const values = embeddings[0].values;
  return values.length > OUTPUT_DIMENSIONALITY ? values.slice(0, OUTPUT_DIMENSIONALITY) : values;
}
