"""
List a course's units (Canvas modules) with document and chunk counts.
Use this to verify the course breakdown and to choose a unit for scoped generation later.
Usage:
  python list_units.py --course-id 45110000000215700
"""
from __future__ import annotations

import argparse
import json
import sys

from snowflake_rag import list_units


def main() -> None:
    ap = argparse.ArgumentParser(description="List units (modules) for a course")
    ap.add_argument("--course-id", type=str, required=True, help="Canvas course ID")
    ap.add_argument("--json", action="store_true", help="Output raw JSON")
    args = ap.parse_args()

    try:
        units = list_units(args.course_id)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    if args.json:
        print(json.dumps(units, indent=2))
        return

    if not units:
        print("No units found for this course. Run ingest_course.py first.")
        return

    print(f"Course {args.course_id} – {len(units)} unit(s)\n")
    for u in units:
        name = (u.get("module_name") or "").strip() or u.get("module_id", "?")
        docs = u.get("document_count") or 0
        chunks = u.get("chunk_count") or 0
        print(f"  {u.get('module_id', '?')}: {name}")
        print(f"    documents: {docs}, chunks: {chunks}")


if __name__ == "__main__":
    main()
