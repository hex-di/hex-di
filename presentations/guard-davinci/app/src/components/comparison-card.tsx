import type { ReactNode } from "react";

interface ComparisonCardProps {
  readonly beforeTitle?: string;
  readonly afterTitle?: string;
  readonly before: ReactNode;
  readonly after: ReactNode;
}

export function ComparisonCard({
  beforeTitle = "Before",
  afterTitle = "After",
  before,
  after,
}: ComparisonCardProps): ReactNode {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 comparison-card">
      <div className="comparison-before p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-red-500" />
          <span className="font-mono text-sm tracking-[0.15em] uppercase text-red-400">
            {beforeTitle}
          </span>
        </div>
        {before}
      </div>
      <div className="comparison-after p-6">
        <div className="flex items-center gap-2 mb-4">
          <span className="w-2 h-2 rounded-full bg-hex-primary" />
          <span className="font-mono text-sm tracking-[0.15em] uppercase text-hex-primary">
            {afterTitle}
          </span>
        </div>
        {after}
      </div>
    </div>
  );
}
