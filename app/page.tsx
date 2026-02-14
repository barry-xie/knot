import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#fffbf9] font-sans">
      {/* Nav — minimal bar, readable on hero and about */}
      <header
        className="fixed left-0 right-0 top-0 z-20 flex items-center justify-between border-b border-[#537aad]/10 px-5 py-4 backdrop-blur-md sm:px-8 md:px-12 lg:px-16"
        style={{ backgroundColor: "color-mix(in srgb, #fffbf9 97%, #537aad 3%)" }}
      >
        <Link
          href="/"
          className="font-serif text-[1.05rem] tracking-tight text-[#537aad] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#537aad]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffbf9]"
        >
          knot.
        </Link>
        <nav className="flex items-center gap-6 text-[0.9375rem] tracking-wide text-[#537aad]">
          <a
            href="#about"
            className="transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#537aad]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffbf9]"
          >
            About
          </a>
          <Link
            href="/dashboard"
            className="rounded-full px-4 py-2 font-medium text-[#fffbf9] transition-all hover:opacity-95 hover:shadow-[0_4px_20px_rgba(83,122,173,0.35)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#537aad] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fffbf9]"
            style={{
              background: "linear-gradient(135deg, #537aad 0%, #6b8fc4 100%)",
            }}
          >
            Get started
          </Link>
        </nav>
      </header>

      {/* Hero — full viewport, gradient overlay, content left */}
      <section className="relative flex min-h-screen flex-col justify-end overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover object-top"
          style={{ filter: "contrast(1.04) saturate(1.02)" }}
          src="/knot.webm"
          autoPlay
          loop
          muted
          playsInline
          aria-label="Background video of a torus knot"
        />
        {/* Gradient overlay — dark at top, cream fade at bottom */}
        <div
          className="absolute inset-0 z-[1]"
          style={{
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, transparent 40%, transparent 60%, rgba(255,251,249,0.15) 85%, rgba(255,251,249,0.4) 100%)",
          }}
        />
        <div className="relative z-10 px-5 pb-[clamp(2rem,8vw,4.5rem)] pt-20 sm:px-8 sm:pb-[clamp(2.5rem,10vw,5rem)] md:px-12 md:pt-24 lg:px-16">
          <div className="max-w-[26rem] sm:max-w-md">
            <h1
              className="font-serif font-normal tracking-tight"
              style={{
                fontSize: "clamp(2rem, 5vw + 1.25rem, 3.75rem)",
                letterSpacing: "-0.02em",
                lineHeight: 1.1,
                background: "linear-gradient(135deg, #fffbf9 0%, #fffbf9 70%, rgba(83,122,173,0.4) 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              knot.
            </h1>
            <p
              className="mt-4 font-sans text-[#fffbf9]/90"
              style={{
                fontSize: "clamp(0.9375rem, 1.25vw + 0.6rem, 1.125rem)",
                lineHeight: 1.55,
                maxWidth: "28ch",
              }}
            >
              Unravel the knots in your learning.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3 sm:mt-8">
              <a
                href="#about"
                className="inline-flex items-center justify-center rounded-full border border-[#537aad]/40 bg-[#fffbf9]/90 px-5 py-2.5 text-[0.9375rem] font-medium text-[#537aad] backdrop-blur-sm transition-all hover:border-[#537aad] hover:bg-[#fffbf9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fffbf9] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                Learn more
              </a>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center rounded-full border-2 border-[#fffbf9] px-5 py-2.5 text-[0.9375rem] font-medium text-[#fffbf9] transition-all hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(83,122,173,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#fffbf9] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
                style={{
                  background: "linear-gradient(135deg, #537aad 0%, #6b8fc4 50%, #537aad 100%)",
                  backgroundSize: "200% 200%",
                }}
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* About — gradient background, full height */}
      <section
        id="about"
        className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 py-24 sm:px-8 sm:py-28 md:px-12 lg:px-16"
        style={{
          background: "linear-gradient(165deg, #fffbf9 0%, #f8f6ff 40%, #fffbf9 70%, #f0eeff 100%)",
        }}
      >
        <div className="relative mx-auto w-full max-w-[40rem]">
          <h2
            className="font-serif font-normal tracking-tight"
            style={{
              fontSize: "clamp(1.5rem, 3vw + 1rem, 2.25rem)",
              letterSpacing: "-0.02em",
              lineHeight: 1.2,
              background: "linear-gradient(135deg, #537aad 0%, #6b8fc4 50%, #537aad 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            One place to study.
          </h2>
          <div
            className="mt-8 space-y-6 font-sans text-[#537aad] sm:mt-10 sm:space-y-7"
            style={{
              fontSize: "clamp(0.9375rem, 1vw + 0.6rem, 1.0625rem)",
              lineHeight: 1.65,
            }}
          >
            <p>
              Knot uses the Canvas API to fetch your classes, syllabi, files, lecture notes, assignments, and upcoming exams. It builds a roadmap with nodes for each assignment, exam, and topic—and links them to the material they cover.
            </p>
            <p>
              We quiz you on general topics (or any specific one you want to practice), identify where you need the most help with visual indicators, and surface the right material to fix it: lecture notes from Canvas, YouTube videos, and more. You pinpoint what you struggle with and focus there.
            </p>
            <p>
              All of it lives in one intuitive, visual mindmap that connects topics and shows your learning progress. One tool for your classes. No more juggling.
            </p>
          </div>
          <p
            className="mt-10 font-serif font-normal text-[#537aad] sm:mt-12"
            style={{
              fontSize: "clamp(1.125rem, 1.5vw + 0.75rem, 1.375rem)",
              letterSpacing: "-0.01em",
              lineHeight: 1.4,
            }}
          >
            You'll never need another tool to study for your classes again.
          </p>
        </div>
      </section>
    </div>
  );
}
