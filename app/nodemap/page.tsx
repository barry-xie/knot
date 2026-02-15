"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import PhysicsGraph from "./PhysicsGraph";
import { buildGraphFromClass, type ClassNamesPayload } from "./utils";

export default function NodeMapPage() {
  const [payload, setPayload] = useState<ClassNamesPayload | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/classNames.json")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load classNames.json");
        return res.json();
      })
      .then((data: ClassNamesPayload) => {
        setPayload(data);
        if (data.classes?.length) setSelectedIndex(0);
        setError(null);
      })
      .catch((err: Error) => {
        setError(err.message || "Could not load courses. Run: node scripts/addConcepts.js");
      })
      .finally(() => setLoading(false));
  }, []);

  const selectedClass = payload?.classes?.[selectedIndex] ?? null;
  const graphData = selectedClass ? buildGraphFromClass(selectedClass) : null;

  return (
    <div className="flex min-h-screen flex-col bg-[#fffbf9] font-sans">
      {/* Header */}
      <header
        className="flex items-center justify-between border-b border-[#537aad]/10 px-4 py-4 sm:px-6 md:px-8"
        style={{ backgroundColor: "color-mix(in srgb, #fffbf9 99%, #537aad 1%)" }}
      >
        <Link href="/" className="font-serif text-[1.05rem] tracking-tight text-[#537aad] hover:opacity-80">
          knot.
        </Link>
        <Link
          href="/dashboard"
          className="rounded-lg border border-[#537aad]/40 px-3 py-2 text-sm text-[#537aad] transition-colors hover:bg-[#537aad]/5"
        >
          dashboard
        </Link>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden px-4 py-6 sm:px-6 md:px-8">
        <div className="mb-4 sm:mb-6">
          <h1 className="font-serif text-xl font-normal tracking-tight text-[#537aad] md:text-2xl">
            course map
          </h1>
          <p className="mt-1 text-sm text-[#537aad]/80">
            Run <code className="rounded bg-[#537aad]/10 px-1.5 py-0.5 text-xs">node scripts/addConcepts.js</code> to
            generate courses — className at center, concepts orbit
          </p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-800">
            {error}
          </div>
        )}

        {payload?.classes?.length ? (
          <div className="mb-4">
            <label htmlFor="course-select" className="mr-2 text-sm font-medium text-[#537aad]/80">
              Course
            </label>
            <select
              id="course-select"
              value={selectedIndex}
              onChange={(e) => setSelectedIndex(Number(e.target.value))}
              className="rounded-lg border border-[#537aad]/40 bg-white px-3 py-2 text-sm text-[#537aad] focus:outline-none focus:ring-2 focus:ring-[#537aad]/30"
            >
              {payload.classes.map((c, i) => (
                <option key={c.className} value={i}>
                  {c.className}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        <div className="h-[calc(100vh-14rem)] min-h-[400px]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-[#537aad]/60">Loading courses…</div>
          ) : graphData ? (
            <PhysicsGraph graphData={graphData} />
          ) : (
            <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[#537aad]/30 bg-[#537aad]/5 text-sm text-[#537aad]/70">
              No courses found. Run <code className="mx-1 rounded bg-[#537aad]/15 px-2 py-0.5">node scripts/addConcepts.js</code> to generate.
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
