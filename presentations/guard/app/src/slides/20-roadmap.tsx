import type { ReactNode } from "react";
import { Section } from "../components/section";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";

function RoadmapItem({
  status,
  title,
  description,
}: {
  readonly status: "done" | "active" | "planned";
  readonly title: string;
  readonly description: string;
}): ReactNode {
  const colors = {
    done: { badge: "green" as const, text: "text-hex-green", dot: "bg-hex-green" },
    active: { badge: "cyan" as const, text: "text-hex-primary", dot: "bg-hex-primary" },
    planned: { badge: "muted" as const, text: "text-hex-muted", dot: "bg-hex-muted" },
  };
  const c = colors[status];

  return (
    <div className="flex items-start gap-3">
      <span
        className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${c.dot} ${status === "active" ? "animate-pulse-glow" : ""}`}
      />
      <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className={`font-display font-semibold text-lg ${c.text}`}>{title}</span>
          <Badge variant={c.badge}>{status}</Badge>
        </div>
        <p className="font-mono text-base text-hex-muted leading-relaxed">{description}</p>
      </div>
    </div>
  );
}

export function RoadmapSlide(): ReactNode {
  return (
    <Section id="roadmap" number={20} label="Production & Beyond" title="Roadmap & Vision">
      <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
        Guard is production-ready today. Here's where it's going next.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HudCard variant="green">
          <span className="font-display font-semibold text-hex-green text-lg tracking-wide block mb-4">
            Delivered
          </span>
          <div className="space-y-4">
            <RoadmapItem
              status="done"
              title="Permission Tokens & Groups"
              description="Branded nominal types with mapped type generation"
            />
            <RoadmapItem
              status="done"
              title="Role DAG with Cycle Detection"
              description="Directed acyclic graph inheritance model"
            />
            <RoadmapItem
              status="done"
              title="Policy Combinators"
              description="hasPermission, hasRole, anyOf, allOf, not, withLabel, ABAC, ReBAC"
            />
            <RoadmapItem
              status="done"
              title="React Integration"
              description="SubjectProvider, useCan, Can/Cannot, createGuardHooks factory"
            />
            <RoadmapItem
              status="done"
              title="GxP Compliance Suite"
              description="Hash-chain audit, e-signatures, WAL, retention, circuit breaker"
            />
            <RoadmapItem
              status="done"
              title="Davinci Production Deployment"
              description="7 roles, 13 policies, 91-case test matrix, brand/indication/country filtering"
            />
          </div>
        </HudCard>

        <div className="space-y-5">
          <HudCard>
            <span className="font-display font-semibold text-hex-primary text-lg tracking-wide block mb-4">
              In Progress
            </span>
            <div className="space-y-4">
              <RoadmapItem
                status="active"
                title="Guard Inspector"
                description="Runtime inspection of policy evaluation trees, integrated with @hex-di/devtools"
              />
              <RoadmapItem
                status="active"
                title="Field Masking"
                description="Declarative field-level redaction based on policies — hide sensitive data in API responses"
              />
            </div>
          </HudCard>

          <HudCard>
            <span className="font-display font-semibold text-hex-muted text-lg tracking-wide block mb-4">
              Planned
            </span>
            <div className="space-y-4">
              <RoadmapItem
                status="planned"
                title="Distributed Evaluation"
                description="Server-side policy evaluation with client-side caching and sync"
              />
              <RoadmapItem
                status="planned"
                title="CLI Tooling"
                description="guard explain, guard test, guard audit — command-line policy management"
              />
              <RoadmapItem
                status="planned"
                title="VS Code Extension"
                description="Inline policy visualization, permission autocomplete, trace viewer"
              />
              <RoadmapItem
                status="planned"
                title="WASM Runtime"
                description="Compile policy evaluation to WASM for edge and serverless deployment"
              />
            </div>
          </HudCard>
        </div>
      </div>

      <div className="text-center pt-8 pb-16">
        <p className="font-display text-3xl font-bold text-hex-text tracking-wide mb-2">
          Authorization, <span className="text-hex-primary text-glow-cyan">solved</span>.
        </p>
        <p className="font-mono text-base text-hex-muted tracking-wider">
          @hex-di/guard — Type-safe. Composable. Auditable.
        </p>
      </div>
    </Section>
  );
}
