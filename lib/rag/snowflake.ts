/**
 * Snowflake RAG retrieval: mirror of ingestion/snowflake_rag.retrieve_chunks.
 * Uses same REST API, schema, and vector similarity so quiz RAG matches ingested chunks.
 */

const SNOWFLAKE_RAG_SCHEMA = "RAG";

const TOP_K = 8;
const SIMILARITY_THRESHOLD = 0.25;
const MIN_CHUNKS = 1;

export const RETRIEVAL_MIN_CHUNKS = MIN_CHUNKS;

export type RagChunk = {
  chunk_id: string;
  document_id: string;
  course_id: string;
  module_id: string;
  text: string;
  document_title: string;
  course_name: string;
  module_name: string;
  score: number;
};

function getConfig(): {
  host: string;
  token: string;
  tokenType: string;
  database: string;
  warehouse: string;
  role: string;
} {
  const host = process.env.SNOWFLAKE_HOST?.trim();
  const token = process.env.SNOWFLAKE_TOKEN?.trim();
  const database = process.env.SNOWFLAKE_DATABASE?.trim() || "KNOT";
  const warehouse = process.env.SNOWFLAKE_WAREHOUSE?.trim();
  const role = process.env.SNOWFLAKE_ROLE?.trim() || "";
  const tokenType = process.env.SNOWFLAKE_TOKEN_TYPE?.trim() || "PROGRAMMATIC_ACCESS_TOKEN";
  if (!host || !token) throw new Error("SNOWFLAKE_HOST and SNOWFLAKE_TOKEN are required");
  return { host, token, tokenType, database, warehouse: warehouse || "", role };
}

function isConfigured(): boolean {
  return !!(process.env.SNOWFLAKE_HOST?.trim() && process.env.SNOWFLAKE_TOKEN?.trim());
}

export function isSnowflakeRagConfigured(): boolean {
  return isConfigured();
}

function endpoint(host: string): string {
  return `https://${host}/api/v2/statements`;
}

function headers(config: { token: string; tokenType: string }): Record<string, string> {
  const h: Record<string, string> = {
    Authorization: `Bearer ${config.token}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };
  if (config.tokenType) h["X-Snowflake-Authorization-Token-Type"] = config.tokenType;
  return h;
}

function body(
  statement: string,
  config: { database: string; warehouse: string; role: string },
  bindings?: Record<string, { type: string; value: string }>,
  timeout = 60
): Record<string, unknown> {
  const b: Record<string, unknown> = {
    statement,
    timeout,
    warehouse: config.warehouse,
    database: config.database,
    schema: SNOWFLAKE_RAG_SCHEMA,
  };
  if (config.role) b.role = config.role;
  if (bindings && Object.keys(bindings).length > 0) b.bindings = bindings;
  return b;
}

async function executeAndFetch(
  statement: string,
  bindings?: Record<string, { type: string; value: string }>
): Promise<unknown[][]> {
  const config = getConfig();
  const url = endpoint(config.host);
  const res = await fetch(url, {
    method: "POST",
    headers: headers(config),
    body: JSON.stringify(body(statement, config, bindings)),
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(`Snowflake error (${res.status}): ${raw}`);
  let data: { data?: unknown[]; statementHandle?: string } = {};
  try {
    data = raw ? (JSON.parse(raw) as { data?: unknown[]; statementHandle?: string }) : {};
  } catch {
    // ignore
  }
  if (Array.isArray(data.data)) return data.data as unknown[][];
  const handle = data.statementHandle;
  if (!handle) return [];
  // Poll for async result
  const getUrl = `${url}/${handle}`;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    const r2 = await fetch(getUrl, { headers: headers(config) });
    if (!r2.ok) throw new Error(`Snowflake poll error (${r2.status})`);
    const d = (await r2.json()) as { status?: string; data?: unknown[]; message?: string };
    if (d.status === "SUCCESS" && Array.isArray(d.data)) return d.data as unknown[][];
    if (d.status === "FAILED" || d.status === "ABORTED") throw new Error(d.message || String(d));
  }
  return [];
}

const COLUMNS = [
  "chunk_id",
  "document_id",
  "course_id",
  "module_id",
  "text",
  "document_title",
  "course_name",
  "module_name",
  "score",
] as const;

function rowToChunk(row: unknown[]): RagChunk {
  const rec: Record<string, unknown> = {};
  COLUMNS.forEach((col, i) => {
    rec[col] = row[i];
  });
  return rec as unknown as RagChunk;
}

/**
 * Retrieve top-k chunks by vector similarity. Optionally scope by unit (and topic/subtopic).
 * Returns chunks with at least similarity_threshold; caller should check length >= MIN_CHUNKS.
 */
export async function retrieveChunks(
  courseId: string,
  queryEmbedding: number[],
  options: {
    topK?: number;
    similarityThreshold?: number;
    unitId?: string;
    topicId?: string;
    subtopicId?: string;
  } = {}
): Promise<RagChunk[]> {
  const topK = options.topK ?? TOP_K;
  const threshold = options.similarityThreshold ?? SIMILARITY_THRESHOLD;
  const uid = options.unitId ?? "";
  const tid = options.topicId ?? "";
  const sid = options.subtopicId ?? "";
  const scoped = !!(uid || tid || sid);
  const embStr = JSON.stringify(queryEmbedding);
  const database = process.env.SNOWFLAKE_DATABASE?.trim() || "KNOT";

  let statement: string;
  let bindings: Record<string, { type: string; value: string }>;

  if (!scoped) {
    bindings = {
      "1": { type: "TEXT", value: embStr },
      "2": { type: "TEXT", value: courseId },
    };
    statement = `
      SELECT * FROM (
        SELECT chunk_id, document_id, course_id, module_id, text,
               COALESCE(document_title, '') AS document_title,
               COALESCE(course_name, '') AS course_name,
               COALESCE(module_name, '') AS module_name,
               VECTOR_COSINE_SIMILARITY(embedding, PARSE_JSON(?)::VECTOR(FLOAT, 768)) AS score
        FROM ${database}.${SNOWFLAKE_RAG_SCHEMA}.document_chunks
        WHERE course_id = ?
      ) WHERE score >= ${threshold}
      ORDER BY score DESC
      LIMIT ${topK}
    `;
  } else {
    bindings = {
      "1": { type: "TEXT", value: embStr },
      "2": { type: "TEXT", value: courseId },
      "3": { type: "TEXT", value: uid },
      "4": { type: "TEXT", value: uid },
      "5": { type: "TEXT", value: tid },
      "6": { type: "TEXT", value: tid },
      "7": { type: "TEXT", value: sid },
      "8": { type: "TEXT", value: sid },
    };
    statement = `
      SELECT * FROM (
        SELECT d.chunk_id, d.document_id, d.course_id, d.module_id, d.text,
               COALESCE(d.document_title, '') AS document_title,
               COALESCE(d.course_name, '') AS course_name,
               COALESCE(d.module_name, '') AS module_name,
               VECTOR_COSINE_SIMILARITY(d.embedding, PARSE_JSON(?)::VECTOR(FLOAT, 768)) AS score
        FROM ${database}.${SNOWFLAKE_RAG_SCHEMA}.document_chunks d
        WHERE d.course_id = ?
          AND d.chunk_id IN (
            SELECT a.chunk_id FROM ${database}.${SNOWFLAKE_RAG_SCHEMA}.chunk_assignments a
            WHERE (? = '' OR a.unit_id = ?)
              AND (? = '' OR a.topic_id = ?)
              AND (? = '' OR a.subtopic_id = ?)
          )
      ) WHERE score >= ${threshold}
      ORDER BY score DESC
      LIMIT ${topK}
    `;
  }

  const rows = await executeAndFetch(statement, bindings);
  return rows.map((row) => rowToChunk(row as unknown[]));
}
