import type { ReactNode } from "react";

interface CodeBlockProps {
  readonly title?: string;
  readonly children: ReactNode;
}

export function CodeBlock({ title, children }: CodeBlockProps): ReactNode {
  return (
    <div className="terminal-window">
      <div className="terminal-header">
        <span className="terminal-dot terminal-dot-red" />
        <span className="terminal-dot terminal-dot-yellow" />
        <span className="terminal-dot terminal-dot-green" />
        {title && (
          <span className="ml-2 font-mono text-sm text-hex-muted tracking-wider">{title}</span>
        )}
      </div>
      <pre className="terminal-body whitespace-pre overflow-x-auto">
        <code>{children}</code>
      </pre>
    </div>
  );
}
