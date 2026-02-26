import type { ReactNode } from "react";
import { Animate } from "./animate";

interface DecisionNode {
  readonly question: string;
  readonly yes: string | DecisionNode;
  readonly no: string | DecisionNode;
}

interface DecisionTreeProps {
  readonly root: DecisionNode;
}

function isLeaf(node: string | DecisionNode): node is string {
  return typeof node === "string";
}

function TreeNode({
  node,
  delay,
}: {
  readonly node: DecisionNode;
  readonly delay: number;
}): ReactNode {
  return (
    <Animate variant="fade-up" delay={delay}>
      <div className="flex flex-col items-center">
        <div className="border-2 border-auth-accent/40 bg-auth-accent/8 px-5 py-3 rounded-sm text-center max-w-xs">
          <span className="text-sm font-medium text-auth-accent">{node.question}</span>
        </div>
        <div className="flex gap-12 mt-4">
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-auth-green/40" />
            <span className="text-xs font-mono text-auth-green mb-2">YES</span>
            {isLeaf(node.yes) ? (
              <div className="border border-auth-green/30 bg-auth-green/8 px-4 py-2 rounded-sm text-center">
                <span className="text-sm font-medium text-auth-green">{node.yes}</span>
              </div>
            ) : (
              <TreeNode node={node.yes} delay={delay + 150} />
            )}
          </div>
          <div className="flex flex-col items-center">
            <div className="w-px h-6 bg-auth-pink/40" />
            <span className="text-xs font-mono text-auth-pink mb-2">NO</span>
            {isLeaf(node.no) ? (
              <div className="border border-auth-pink/30 bg-auth-pink/8 px-4 py-2 rounded-sm text-center">
                <span className="text-sm font-medium text-auth-pink">{node.no}</span>
              </div>
            ) : (
              <TreeNode node={node.no} delay={delay + 150} />
            )}
          </div>
        </div>
      </div>
    </Animate>
  );
}

export function DecisionTree({ root }: DecisionTreeProps): ReactNode {
  return (
    <div className="flex justify-center overflow-x-auto py-4">
      <TreeNode node={root} delay={0} />
    </div>
  );
}
