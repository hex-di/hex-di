import type { ReactNode } from "react";
import { Section } from "../components/section";
import { CodeBlock } from "../components/code-block";
import { HudCard } from "../components/hud-card";

function RoleDagSvg(): ReactNode {
  return (
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
      <text x="75" y="33" textAnchor="middle" fill="#586E85" fontSize="10" fontFamily="Fira Code">
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
      <text x="200" y="33" textAnchor="middle" fill="#586E85" fontSize="10" fontFamily="Fira Code">
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
      <text x="325" y="33" textAnchor="middle" fill="#586E85" fontSize="10" fontFamily="Fira Code">
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
      <text x="75" y="113" textAnchor="middle" fill="#00F0FF" fontSize="10" fontFamily="Fira Code">
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
      <text x="200" y="113" textAnchor="middle" fill="#00F0FF" fontSize="10" fontFamily="Fira Code">
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
      <text x="325" y="113" textAnchor="middle" fill="#00F0FF" fontSize="10" fontFamily="Fira Code">
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

      {/* Inheritance arrows (Manager inherits Writer) */}
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
      <text x="87" y="72" fill="#00F0FF" fontSize="8" fontFamily="Fira Code" opacity="0.5">
        inherits
      </text>
      <text x="212" y="72" fill="#00F0FF" fontSize="8" fontFamily="Fira Code" opacity="0.5">
        inherits
      </text>
      <text x="337" y="72" fill="#00F0FF" fontSize="8" fontFamily="Fira Code" opacity="0.5">
        inherits
      </text>

      {/* No inheritance line for Admin */}
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
  );
}

export function RolesSlide(): ReactNode {
  return (
    <Section id="roles" number={5} label="Access Model" title="Roles & Inheritance">
      <p className="text-hex-muted text-lg leading-relaxed mb-6 max-w-4xl">
        Roles are <span className="text-hex-accent">directed acyclic graphs</span> (DAGs), not flat
        lists. A role can inherit from other roles, accumulating their permissions. Cycle detection
        runs at construction time. The{" "}
        <code className="text-hex-accent font-mono text-base">flattenPermissions()</code> function
        traverses the DAG to collect all effective permissions.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-6">
        <div>
          <CodeBlock title="createRole()">
            <span className="syn-keyword">import</span> {"{"}{" "}
            <span className="syn-function">createRole</span> {"}"}{" "}
            <span className="syn-keyword">from</span>{" "}
            <span className="syn-string">'@hex-di/guard'</span>
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Writer — no permissions</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">Writer</span>{" "}
            = <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-string">'writer'</span>
            ,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: []{"\n"}
            {"})"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Manager — inherits Writer</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">Manager</span>{" "}
            = <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>:{" "}
            <span className="syn-string">'manager'</span>,{"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">UserPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"  "}],{"\n"}
            {"  "}
            <span className="syn-property">inherits</span>: [
            <span className="syn-property">Writer</span>]{"\n"}
            {"})"}
            {"\n"}
            {"\n"}
            <span className="syn-comment">// Admin — explicit, no inheritance</span>
            {"\n"}
            <span className="syn-keyword">const</span> <span className="syn-property">Admin</span> ={" "}
            <span className="syn-function">createRole</span>({"{"}
            {"\n"}
            {"  "}
            <span className="syn-property">name</span>: <span className="syn-string">'admin'</span>,
            {"\n"}
            {"  "}
            <span className="syn-property">permissions</span>: [{"\n"}
            {"    "}
            <span className="syn-property">UserPerms</span>.
            <span className="syn-property">manage</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">delete</span>,{"\n"}
            {"    "}
            <span className="syn-property">BrandPerms</span>.
            <span className="syn-property">add</span>,{"\n"}
            {"  "}]{"\n"}
            {"})"}
          </CodeBlock>
        </div>

        <div>
          <HudCard className="mb-4">
            <span className="font-display font-semibold text-hex-accent text-lg tracking-wide block mb-3">
              DAG Inheritance Model
            </span>
            <RoleDagSvg />
          </HudCard>

          <HudCard variant="accent">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="num-badge"
                style={{
                  borderColor: "rgba(255,94,0,0.3)",
                  background: "rgba(255,94,0,0.08)",
                  color: "#FF5E00",
                }}
              >
                !
              </span>
              <span className="font-display font-semibold text-hex-accent text-lg">
                Cycle Detection
              </span>
            </div>
            <p className="font-mono text-base text-hex-muted leading-relaxed">
              If <code className="text-hex-accent">Role A inherits B</code> and{" "}
              <code className="text-hex-accent">B inherits A</code>, construction returns{" "}
              <code className="text-hex-accent">CircularRoleInheritanceError</code> via Result.
            </p>
          </HudCard>
        </div>
      </div>
    </Section>
  );
}
