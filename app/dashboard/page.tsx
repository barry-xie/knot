import Link from "next/link";

function Node({
  label,
  variant = "default",
  children,
}: {
  label: string;
  variant?: "center" | "needsPractice" | "default";
  children?: React.ReactNode;
}) {
  const base =
    "rounded-lg px-4 py-2 font-sans text-sm transition-colors";
  const variants = {
    center: "bg-[#537aad] font-medium text-[#fffbf9]",
    needsPractice: "border-2 border-[#537aad]/70 bg-[#537aad]/10 font-medium text-[#537aad]",
    default: "border border-[#537aad]/30 bg-[#fffbf9] text-[#537aad]",
  };
  return (
    <div className="flex flex-col items-center gap-4">
      <div className={`${base} ${variants[variant]}`}>{label}</div>
      {children && (
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6">
          {children}
        </div>
      )}
    </div>
  );
}

function Connector() {
  return (
    <div className="h-4 w-px bg-[#537aad]/25 sm:h-px sm:w-4 sm:min-w-4" aria-hidden />
  );
}

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-[#fffbf9] font-sans">
      <header
        className="flex items-center justify-between border-b border-[#537aad]/10 px-5 py-4 sm:px-8 md:px-12"
        style={{ backgroundColor: "color-mix(in srgb, #fffbf9 97%, #537aad 3%)" }}
      >
        <Link
          href="/"
          className="font-serif text-[1.05rem] tracking-tight text-[#537aad] transition-opacity hover:opacity-80"
        >
          knot.
        </Link>
        <div className="flex items-center gap-4 text-[0.9375rem] text-[#537aad]">
          <span className="opacity-70">Canvas connected</span>
          <Link
            href="/"
            className="rounded-full border border-[#537aad]/40 px-4 py-2 transition-colors hover:border-[#537aad] hover:bg-[#537aad]/5"
          >
            Back
          </Link>
        </div>
      </header>

      <main className="min-h-[calc(100vh-4.5rem)] overflow-auto p-6 sm:p-8 md:p-12">
        <div className="mb-8">
          <h1 className="font-serif text-xl font-normal tracking-tight text-[#537aad] md:text-2xl">
            Your roadmap
          </h1>
          <p className="mt-1 font-sans text-sm text-[#537aad]/80">
            Classes, assignments, exams, and topics from Canvas
          </p>
        </div>

        {/* Mindmap — tree structure */}
        <div className="rounded-xl border border-[#537aad]/15 bg-[#fffbf9] p-8 sm:p-10 md:p-12">
          <div className="flex flex-col items-center">
            <Node label="Your classes" variant="center">
              <Connector />
              <div className="flex flex-col gap-8 sm:flex-row sm:gap-12">
                {/* CS 101 branch */}
                <Node label="CS 101">
                  <Connector />
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                    <Node label="Assignments" />
                    <Node label="Midterm" />
                    <Node label="Topics">
                      <Connector />
                      <div className="flex flex-wrap justify-center gap-3">
                        <Node label="Arrays" variant="needsPractice" />
                        <Node label="Recursion" />
                      </div>
                    </Node>
                  </div>
                </Node>
                {/* Math 202 branch */}
                <Node label="Math 202">
                  <Connector />
                  <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
                    <Node label="Assignments" />
                    <Node label="Final" />
                    <Node label="Topics">
                      <Connector />
                      <div className="flex flex-wrap justify-center gap-3">
                        <Node label="Derivatives" variant="needsPractice" />
                        <Node label="Integrals" />
                      </div>
                    </Node>
                  </div>
                </Node>
              </div>
            </Node>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-8 flex flex-wrap gap-6 font-sans text-sm text-[#537aad]/80">
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-md bg-[#537aad]" />
            Course / central
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-md border-2 border-[#537aad]/70 bg-[#537aad]/10" />
            Needs practice
          </span>
          <span className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-md border border-[#537aad]/30" />
            Topic / assignment / exam
          </span>
        </div>
      </main>
    </div>
  );
}
