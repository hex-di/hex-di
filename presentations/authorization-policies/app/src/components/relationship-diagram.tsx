import type { ReactNode } from "react";

interface Entity {
  readonly id: string;
  readonly label: string;
  readonly type: "user" | "group" | "resource";
}

interface Relation {
  readonly from: string;
  readonly to: string;
  readonly label: string;
}

interface RelationshipDiagramProps {
  readonly entities: readonly Entity[];
  readonly relations: readonly Relation[];
}

const typeStyles: Record<Entity["type"], { bg: string; border: string; text: string }> = {
  user: { bg: "bg-auth-primary/10", border: "border-auth-primary/40", text: "text-auth-primary" },
  group: { bg: "bg-auth-accent/10", border: "border-auth-accent/40", text: "text-auth-accent" },
  resource: { bg: "bg-auth-green/10", border: "border-auth-green/40", text: "text-auth-green" },
};

export function RelationshipDiagram({ entities, relations }: RelationshipDiagramProps): ReactNode {
  return (
    <div className="font-mono text-sm">
      <div className="flex flex-wrap gap-3 mb-6 justify-center">
        {entities.map(e => {
          const style = typeStyles[e.type];
          return (
            <div key={e.id} className={`${style.bg} ${style.border} border px-4 py-2 rounded-sm`}>
              <span className={`${style.text} font-medium`}>{e.label}</span>
              <span className="text-auth-muted text-xs ml-2">({e.type})</span>
            </div>
          );
        })}
      </div>
      <div className="space-y-2">
        {relations.map((r, i) => (
          <div key={i} className="flex items-center justify-center gap-3 text-xs">
            <span className="text-auth-text">{r.from}</span>
            <span className="text-auth-muted">--[</span>
            <span className="text-auth-accent">{r.label}</span>
            <span className="text-auth-muted">]--&gt;</span>
            <span className="text-auth-text">{r.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
