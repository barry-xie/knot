import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const classNames = Array.isArray(body?.classNames)
      ? body.classNames
          .filter((name): name is string => typeof name === "string")
          .map((name) => name.trim())
          .filter(Boolean)
      : [];

    if (classNames.length === 0) {
      return NextResponse.json({ error: "Missing selected courses" }, { status: 400 });
    }

    const { run } = await import("@/scripts/addConcepts");
    const result = await run({ classNames, writeFile: true });

    return NextResponse.json({ classes: result?.classes ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to prepare course concepts";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
