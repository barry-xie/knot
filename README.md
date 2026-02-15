# Knot

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## RAG quiz (optional)

Quiz generation can use retrieved course chunks from Snowflake when the dashboard sends a course id. If these env vars are set, the quiz API will embed the unit/topic query, retrieve top-k chunks, and ask Gemini to base at least 80% of answers on that material. If they are missing or retrieval fails, the app falls back to topic-only generation.

- `SNOWFLAKE_HOST` – Snowflake account host (e.g. `abc12345.snowflakecomputing.com`)
- `SNOWFLAKE_TOKEN` – Bearer token for REST API
- `SNOWFLAKE_TOKEN_TYPE` – Optional (default `PROGRAMMATIC_ACCESS_TOKEN`)
- `SNOWFLAKE_DATABASE` – Database name (default `KNOT`)
- `SNOWFLAKE_WAREHOUSE` – Warehouse for queries
- `SNOWFLAKE_ROLE` – Optional role

Same DB/schema as the ingestion pipeline (see `ingestion/README.md`).

### Testing that RAG is used

1. **Response debug** – Every quiz response includes `_debug`: `{ ragUsed: boolean, chunkCount: number, query?: string }`. In the browser: DevTools → Network → trigger a quiz → select the `generate` request → Response tab. If `ragUsed` is `true` and `chunkCount` ≥ 1, RAG retrieval ran and that many chunks were injected into the prompt.
2. **Chunk info in response** – When RAG is used, the response includes a `sources` array: each item has `chunk_id`, `document_id`, `document_title`, `course_name`, `module_name`, `score`, and `text`. The client receives it via `generateQuiz()` (returns `{ questions, sources? }`); the Quiz component keeps `sources` in state for citations or "view source" later.
3. **Server logs** – With `npm run dev`, when RAG is used you’ll see a log like: `[Quiz RAG] courseId=... unitId=... chunks=8 query="Unit: ..."`.
4. **Compare with/without** – Use a course that has ingested chunks. Open a unit and start a quiz (dashboard sends `courseId`). Then call the API manually without `courseId` (e.g. omit it in a curl body); the first run should show `ragUsed: true`, the second `ragUsed: false`.
5. **Content check** – If your course material has distinctive terms or definitions, RAG-generated questions should reflect them; non-RAG questions may be more generic.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://learn.nextjs.org/) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
