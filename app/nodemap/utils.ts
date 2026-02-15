/**
 * Builds graph data for a bubble map from classNames.json structure.
 * Used after addConcepts.js has run — className is center node, concepts orbit.
 */

export type ClassEntry = {
  className: string;
  concepts: string[];
};

export type GraphNode = {
  id: string;
  name: string;
  val: number;
  radius: number;
  targetRadius?: number;
  variant: "center" | "concept";
};

export type GraphLink = { source: string; target: string };

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return Math.abs(h);
}

function slugify(s: string): string {
  return s.replace(/\s+/g, "-").replace(/[^a-zA-Z0-9-]/g, "").toLowerCase() || `node-${hash(s)}`;
}

export function buildGraphFromClass(classEntry: ClassEntry): {
  nodes: GraphNode[];
  links: GraphLink[];
} {
  const { className, concepts } = classEntry;
  const centerId = slugify(className);
  const centerNode: GraphNode = {
    id: centerId,
    name: className,
    val: 36,
    radius: 80,
    targetRadius: 0,
    variant: "center",
  };

  const conceptNodes: GraphNode[] = concepts.map((name, i) => {
    const id = slugify(`${className}-${name}`);
    const radius = 40 + (hash(id) % 16);
    const targetRadius = 90 + (hash(id) % 110);
    return {
      id,
      name,
      val: 12,
      radius,
      targetRadius,
      variant: "concept" as const,
    };
  });

  const nodes = [centerNode, ...conceptNodes];
  const links: GraphLink[] = conceptNodes.map((n) => ({
    source: centerId,
    target: n.id,
  }));

  return { nodes, links };
}

export type ClassNamesPayload = {
  classes: ClassEntry[];
  classNames: string[];
};
