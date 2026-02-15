import { NextResponse } from "next/server";

export const runtime = "nodejs";

type CanvasResult = {
  classNames?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";

    if (!token) {
      return NextResponse.json({ error: "Missing Canvas API token" }, { status: 400 });
    }

    const { run } = await import("@/scripts/getCanvas");
    const result = (await run({ token, writeFile: true })) as CanvasResult;
    const classNames = Array.isArray(result?.classNames)
      ? result.classNames.filter((name): name is string => typeof name === "string")
      : [];

    return NextResponse.json({ classNames });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Canvas data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
