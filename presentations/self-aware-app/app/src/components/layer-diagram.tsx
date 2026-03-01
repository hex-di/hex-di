import type { ReactNode } from "react";

interface LayerProps {
  readonly number: number;
  readonly name: string;
  readonly question: string;
  readonly items: readonly string[];
  readonly color: string;
}

function Layer({ number, name, question, items, color }: LayerProps): ReactNode {
  return (
    <div
      className="p-5 border-l-2"
      style={{
        borderLeftColor: color,
        background: `linear-gradient(90deg, ${color}08, transparent)`,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <span
          className="font-mono text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-sm border"
          style={{ color, borderColor: `${color}40`, background: `${color}10` }}
        >
          {number}
        </span>
        <span className="font-display font-semibold text-xl tracking-wide" style={{ color }}>
          {name}
        </span>
        <span className="font-mono text-sm text-hex-muted italic ml-2">&quot;{question}&quot;</span>
      </div>
      <div className="flex flex-wrap gap-2 ml-10">
        {items.map(item => (
          <span
            key={item}
            className="font-mono text-xs px-2 py-1 rounded-sm"
            style={{
              color,
              background: `${color}10`,
              border: `1px solid ${color}20`,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export function LayerDiagram(): ReactNode {
  return (
    <div className="space-y-3">
      <Layer
        number={3}
        name="BEHAVIORAL"
        question="What am I doing?"
        items={[
          "Resolution traces",
          "State transitions",
          "Workflow progress",
          "Authorization log",
          "Log pipeline stats",
          "Tool invocations",
        ]}
        color="#F92672"
      />
      <Layer
        number={2}
        name="STATE"
        question="What condition am I in?"
        items={[
          "Instantiated services",
          "Scope tree",
          "Cached data",
          "Active machines",
          "Running sagas",
          "Active policies",
        ]}
        color="#FFB020"
      />
      <Layer
        number={1}
        name="STRUCTURE"
        question="What am I made of?"
        items={[
          "Ports & adapters",
          "Dependency edges",
          "Lifetimes",
          "Topology",
          "Complexity score",
        ]}
        color="#A6E22E"
      />
    </div>
  );
}
