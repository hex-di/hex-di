import type { ReactNode } from "react";
import { Animate } from "../components/animate";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";
import { Badge } from "../components/badge";

export function RolesSlide(): ReactNode {
  return (
    <Section id="roles" number={6} label="Guard Primitives" title="Roles & Inheritance">
      <Animate variant="fade-up" delay={100}>
        <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
          DaVinci{"'"}s 7 roles map directly to Guard roles with{" "}
          <span className="text-hex-accent">DAG inheritance</span>. Writers carry base permissions.
          Managers inherit from writers and add management capabilities. Admin is explicit with no
          inheritance chain.
        </p>
      </Animate>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <Animate variant="fade-in">
          <CodeBlock title="davinci/roles.ts">
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">globalWriter</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">"global_content_writer"</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">brand</span>.<span className="syn-property">read</span>,{" "}
            <span className="syn-property">content</span>.<span className="syn-property">read</span>
            ,{"\n"}
            {"    "}
            <span className="syn-property">content</span>.
            <span className="syn-property">write</span>, <span className="syn-property">run</span>.
            <span className="syn-property">read</span>,{"\n"}
            {"    "}
            <span className="syn-property">memory</span>.<span className="syn-property">read</span>,
            {"\n"}
            {"  "}],{"\n"}
            {"}"}){"\n"}
            {"\n"}
            <span className="syn-keyword">const</span>{" "}
            <span className="syn-property">globalManager</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">"global_content_manager"</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [...
            <span className="syn-property">MANAGER_PERMISSIONS</span>],{"\n"}
            {"  "}
            <span className="syn-property">inherits</span>: [
            <span className="syn-property">globalWriter</span>],{"\n"}
            {"}"}){"\n"}
            {"\n"}
            <span className="syn-comment">// Same pattern for local + CPH scopes</span>
            {"\n"}
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">admin</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-string">"admin"</span>,
            {"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">brand</span>.<span className="syn-property">read</span>,{" "}
            <span className="syn-property">brand</span>.<span className="syn-property">write</span>,
            {"\n"}
            {"    "}
            <span className="syn-property">brand</span>.<span className="syn-property">delete</span>
            , <span className="syn-property">brand</span>.<span className="syn-property">sync</span>
            ,{"\n"}
            {"    "}
            <span className="syn-property">content</span>.<span className="syn-property">read</span>
            , <span className="syn-property">content</span>.
            <span className="syn-property">write</span>,{"\n"}
            {"    "}
            <span className="syn-property">content</span>.
            <span className="syn-property">approve</span>,{" "}
            <span className="syn-property">content</span>.
            <span className="syn-property">publish</span>,{"\n"}
            {"    "}
            <span className="syn-property">user</span>.<span className="syn-property">read</span>,{" "}
            <span className="syn-property">user</span>.<span className="syn-property">manage</span>,
            {"\n"}
            {"    "}
            <span className="syn-property">run</span>.<span className="syn-property">read</span>,{" "}
            <span className="syn-property">run</span>.<span className="syn-property">readAll</span>,
            {"\n"}
            {"    "}
            <span className="syn-property">memory</span>.<span className="syn-property">read</span>,{" "}
            <span className="syn-property">memory</span>.<span className="syn-property">write</span>
            ,{"\n"}
            {"    "}
            <span className="syn-property">memory</span>.
            <span className="syn-property">delete</span>,{" "}
            <span className="syn-property">memory</span>.
            <span className="syn-property">toggle</span>,{"\n"}
            {"  "}],{"\n"}
            {"}"})
          </CodeBlock>
        </Animate>

        <Animate variant="fade-in" delay={100}>
          <div className="space-y-4">
            <HudCard>
              <span className="font-display font-semibold text-hex-accent text-lg tracking-wide block mb-3">
                DAG Inheritance
              </span>
              <svg width="100%" viewBox="0 0 400 220" fill="none" className="my-4">
                {/* Writer nodes */}
                <rect
                  x="20"
                  y="10"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#586E85"
                  strokeWidth="1"
                  fill="rgba(88,110,133,0.08)"
                />
                <text
                  x="75"
                  y="33"
                  textAnchor="middle"
                  fill="#586E85"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  GlobalWriter
                </text>

                <rect
                  x="145"
                  y="10"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#586E85"
                  strokeWidth="1"
                  fill="rgba(88,110,133,0.08)"
                />
                <text
                  x="200"
                  y="33"
                  textAnchor="middle"
                  fill="#586E85"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  LocalWriter
                </text>

                <rect
                  x="270"
                  y="10"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#586E85"
                  strokeWidth="1"
                  fill="rgba(88,110,133,0.08)"
                />
                <text
                  x="325"
                  y="33"
                  textAnchor="middle"
                  fill="#586E85"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  CphWriter
                </text>

                {/* Manager nodes */}
                <rect
                  x="20"
                  y="90"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  fill="rgba(0,240,255,0.06)"
                />
                <text
                  x="75"
                  y="113"
                  textAnchor="middle"
                  fill="#00F0FF"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  GlobalManager
                </text>

                <rect
                  x="145"
                  y="90"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  fill="rgba(0,240,255,0.06)"
                />
                <text
                  x="200"
                  y="113"
                  textAnchor="middle"
                  fill="#00F0FF"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  LocalManager
                </text>

                <rect
                  x="270"
                  y="90"
                  width="110"
                  height="36"
                  rx="2"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  fill="rgba(0,240,255,0.06)"
                />
                <text
                  x="325"
                  y="113"
                  textAnchor="middle"
                  fill="#00F0FF"
                  fontSize="10"
                  fontFamily="Fira Code"
                >
                  CphManager
                </text>

                {/* Admin node */}
                <rect
                  x="130"
                  y="175"
                  width="140"
                  height="36"
                  rx="2"
                  stroke="#FF5E00"
                  strokeWidth="1.5"
                  fill="rgba(255,94,0,0.08)"
                />
                <text
                  x="200"
                  y="198"
                  textAnchor="middle"
                  fill="#FF5E00"
                  fontSize="11"
                  fontFamily="Fira Code"
                  fontWeight="600"
                >
                  Admin
                </text>

                {/* Inheritance arrows */}
                <line
                  x1="75"
                  y1="46"
                  x2="75"
                  y2="90"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />
                <line
                  x1="200"
                  y1="46"
                  x2="200"
                  y2="90"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />
                <line
                  x1="325"
                  y1="46"
                  x2="325"
                  y2="90"
                  stroke="#00F0FF"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                  opacity="0.5"
                />

                {/* Labels */}
                <text
                  x="87"
                  y="72"
                  fill="#00F0FF"
                  fontSize="8"
                  fontFamily="Fira Code"
                  opacity="0.5"
                >
                  inherits
                </text>
                <text
                  x="212"
                  y="72"
                  fill="#00F0FF"
                  fontSize="8"
                  fontFamily="Fira Code"
                  opacity="0.5"
                >
                  inherits
                </text>
                <text
                  x="337"
                  y="72"
                  fill="#00F0FF"
                  fontSize="8"
                  fontFamily="Fira Code"
                  opacity="0.5"
                >
                  inherits
                </text>

                <text
                  x="200"
                  y="160"
                  textAnchor="middle"
                  fill="#FF5E00"
                  fontSize="8"
                  fontFamily="Fira Code"
                  opacity="0.6"
                >
                  explicit permissions (no inheritance)
                </text>
              </svg>
            </HudCard>

            <HudCard variant="accent">
              <div className="flex items-center gap-2 mb-2">
                <span className="num-badge-accent">!</span>
                <span className="font-display font-semibold text-hex-accent text-lg">
                  Cycle Detection
                </span>
              </div>
              <p className="font-mono text-base text-hex-muted leading-relaxed">
                Cycle detection and permission flattening are built in. The role hierarchy forms a
                DAG — invalid cycles fail at construction time.
              </p>
            </HudCard>

            <div className="flex gap-3 flex-wrap">
              <Badge variant="accent">7 Roles</Badge>
              <Badge variant="cyan">DAG Inheritance</Badge>
              <Badge variant="pink">Cycle Detection</Badge>
            </div>
          </div>
        </Animate>
      </div>
    </Section>
  );
}
