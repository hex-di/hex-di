import type { ReactNode } from "react";
import { Animate } from "./animate";

interface SectionProps {
  readonly id: string;
  readonly number: number;
  readonly label: string;
  readonly title: string;
  readonly children: ReactNode;
}

export function Section({ id, number, label, title, children }: SectionProps): ReactNode {
  return (
    <section id={id} className="min-h-screen py-20 px-8 lg:px-12 xl:px-16">
      <Animate variant="fade-up">
        <div className="mb-8">
          <span className="font-mono text-lg tracking-[0.2em] uppercase text-hex-primary/70">
            Protocol_{number.toString().padStart(2, "0")} / {label}
          </span>
          <h2 className="font-display font-bold text-5xl mt-2 text-hex-text tracking-wide">
            {title}
          </h2>
        </div>
      </Animate>
      {children}
    </section>
  );
}
