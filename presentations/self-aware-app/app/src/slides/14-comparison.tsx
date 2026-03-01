import type { ReactNode } from "react";
import { Section } from "../components/section";
import { Animate } from "../components/animate";

const capabilities = [
  {
    name: "Compile-time graph validation",
    spring: false,
    angular: false,
    effect: "Types",
    hexdi: true,
  },
  {
    name: "Runtime dependency graph API",
    spring: "Partial",
    angular: "Partial",
    effect: false,
    hexdi: true,
  },
  { name: "Graph traversal & analysis", spring: false, angular: false, effect: false, hexdi: true },
  {
    name: "Resolution tracing (spans)",
    spring: false,
    angular: false,
    effect: "Fibers",
    hexdi: true,
  },
  {
    name: "Captive dependency detection",
    spring: false,
    angular: false,
    effect: "Types",
    hexdi: "Types + Runtime",
  },
  { name: "Serializable state", spring: "Partial", angular: false, effect: false, hexdi: true },
  {
    name: "Actionable graph suggestions",
    spring: false,
    angular: false,
    effect: false,
    hexdi: true,
  },
  {
    name: "Full ecosystem reporting",
    spring: false,
    angular: false,
    effect: "Partial",
    hexdi: "Vision",
  },
  {
    name: "MCP / A2A diagnostic port",
    spring: false,
    angular: false,
    effect: false,
    hexdi: "Building",
  },
];

function CellValue({ value }: { readonly value: boolean | string }): ReactNode {
  if (value === true) {
    return <span className="text-hex-green font-semibold">Yes</span>;
  }
  if (value === false) {
    return <span className="text-hex-muted/40">No</span>;
  }
  return <span className="text-hex-amber">{value}</span>;
}

export function ComparisonSlide(): ReactNode {
  return (
    <Section id="comparison" number={14} label="The Vision" title="Framework Comparison">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-8 max-w-4xl">
          What existing frameworks don&apos;t provide.
        </p>
      </Animate>

      <Animate variant="fade-up" delay={200}>
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm border-collapse">
            <thead>
              <tr className="border-b border-hex-primary/15">
                <th className="text-left py-3 px-4 text-hex-muted font-normal tracking-wider uppercase text-xs">
                  Capability
                </th>
                <th className="text-center py-3 px-4 text-hex-muted font-normal tracking-wider uppercase text-xs">
                  Spring
                </th>
                <th className="text-center py-3 px-4 text-hex-muted font-normal tracking-wider uppercase text-xs">
                  Angular
                </th>
                <th className="text-center py-3 px-4 text-hex-muted font-normal tracking-wider uppercase text-xs">
                  Effect
                </th>
                <th className="text-center py-3 px-4 text-hex-primary font-semibold tracking-wider uppercase text-xs">
                  HexDI
                </th>
              </tr>
            </thead>
            <tbody>
              {capabilities.map(cap => (
                <tr key={cap.name} className="border-b border-hex-primary/5 hover:bg-hex-primary/3">
                  <td className="py-2.5 px-4 text-hex-text">{cap.name}</td>
                  <td className="py-2.5 px-4 text-center">
                    <CellValue value={cap.spring} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <CellValue value={cap.angular} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <CellValue value={cap.effect} />
                  </td>
                  <td className="py-2.5 px-4 text-center">
                    <CellValue value={cap.hexdi} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Animate>
    </Section>
  );
}
