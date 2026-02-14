/**
 * Inline SVG library logos for graph node cards.
 *
 * Each logo is a simplified version of the library's identity SVG,
 * designed to render at ~20x20px inside an SVG `<g>` element.
 * All logos use `viewBox="0 0 200 200"` scaled down via transform.
 *
 * @packageDocumentation
 */

import type { LibraryAdapterKind } from "../types.js";

const LOGO_SIZE = 20;
const LOGO_SCALE = LOGO_SIZE / 200;

function StoreLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#059669" />
      <ellipse
        cx="100"
        cy="100"
        rx="55"
        ry="20"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.5"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="55"
        ry="20"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.5"
        transform="rotate(60, 100, 100)"
      />
      <ellipse
        cx="100"
        cy="100"
        rx="55"
        ry="20"
        fill="none"
        stroke="white"
        strokeWidth="1.5"
        opacity="0.5"
        transform="rotate(120, 100, 100)"
      />
      <circle cx="140" cy="60" r="6" fill="white" opacity="0.7" />
      <circle cx="148" cy="130" r="6" fill="white" opacity="0.7" />
      <circle cx="52" cy="130" r="6" fill="white" opacity="0.7" />
      <circle cx="60" cy="60" r="6" fill="white" opacity="0.7" />
      <circle cx="100" cy="100" r="14" fill="white" />
    </>
  );
}

function QueryLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#0891B2" />
      <ellipse cx="100" cy="52" rx="32" ry="12" fill="white" opacity="0.9" />
      <rect x="68" y="52" width="64" height="24" fill="white" opacity="0.7" />
      <ellipse cx="100" cy="76" rx="32" ry="12" fill="white" opacity="0.7" />
      <line x1="100" y1="90" x2="100" y2="118" stroke="white" strokeWidth="4" />
      <polyline
        points="90,110 100,122 110,110"
        fill="none"
        stroke="white"
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="60" y="128" width="80" height="36" rx="6" fill="white" opacity="0.25" />
      <rect x="70" y="136" width="40" height="5" rx="2" fill="white" opacity="0.7" />
      <rect x="70" y="147" width="55" height="5" rx="2" fill="white" opacity="0.7" />
    </>
  );
}

function SagaLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#BE123C" />
      <circle cx="52" cy="75" r="14" fill="white" opacity="0.9" />
      <circle cx="52" cy="75" r="6" fill="#BE123C" />
      <line x1="68" y1="75" x2="84" y2="75" stroke="white" strokeWidth="3" />
      <polyline
        points="80,70 87,75 80,80"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="102" cy="75" r="14" fill="white" opacity="0.9" />
      <circle cx="102" cy="75" r="6" fill="#BE123C" />
      <line x1="118" y1="75" x2="134" y2="75" stroke="white" strokeWidth="3" />
      <polyline
        points="130,70 137,75 130,80"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="152" cy="75" r="14" fill="white" opacity="0.9" />
      <circle cx="152" cy="75" r="6" fill="#BE123C" />
      <path
        d="M 155,92 C 150,130 100,140 50,120"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        opacity="0.6"
        strokeDasharray="6,4"
      />
      <polyline
        points="56,114 48,120 56,126"
        fill="none"
        stroke="white"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.6"
      />
    </>
  );
}

function FlowLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#4338CA" />
      <circle cx="100" cy="52" r="14" fill="none" stroke="white" strokeWidth="2.5" />
      <circle cx="100" cy="52" r="6" fill="white" />
      <rect x="120" y="100" width="40" height="24" rx="6" fill="white" opacity="0.9" />
      <circle cx="60" cy="140" r="14" fill="none" stroke="white" strokeWidth="2.5" />
      <circle cx="60" cy="140" r="8" fill="none" stroke="white" strokeWidth="2" />
      <path
        d="M 112,60 Q 145,70 140,98"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polyline
        points="136,92 140,98 144,92"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 120,118 Q 95,140 76,140"
        fill="none"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <polyline
        points="82,136 76,140 82,144"
        fill="none"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

function LoggerLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#475569" />
      <rect x="38" y="48" width="124" height="108" rx="6" fill="white" opacity="0.15" />
      <rect x="38" y="48" width="124" height="20" rx="6" fill="white" opacity="0.2" />
      <rect x="38" y="58" width="124" height="10" fill="white" opacity="0.2" />
      <circle cx="52" cy="58" r="3.5" fill="#EF4444" opacity="0.8" />
      <circle cx="63" cy="58" r="3.5" fill="#F59E0B" opacity="0.8" />
      <circle cx="74" cy="58" r="3.5" fill="#10B981" opacity="0.8" />
      <rect x="48" y="78" width="30" height="9" rx="2" fill="#60A5FA" />
      <rect x="82" y="78" width="68" height="9" rx="2" fill="white" opacity="0.5" />
      <rect x="48" y="95" width="32" height="9" rx="2" fill="#FBBF24" />
      <rect x="84" y="95" width="56" height="9" rx="2" fill="white" opacity="0.5" />
      <rect x="48" y="112" width="36" height="9" rx="2" fill="#F87171" />
      <rect x="88" y="112" width="62" height="9" rx="2" fill="white" opacity="0.5" />
      <rect x="48" y="129" width="34" height="9" rx="2" fill="#A78BFA" />
      <rect x="86" y="129" width="50" height="9" rx="2" fill="white" opacity="0.5" />
    </>
  );
}

function TracingLogo(): React.ReactElement {
  return (
    <>
      <polygon points="100,18 176,61 176,139 100,182 24,139 24,61" fill="#D97706" />
      <rect x="42" y="55" width="55" height="16" rx="4" fill="white" opacity="0.9" />
      <circle cx="42" cy="79" r="3" fill="white" opacity="0.7" />
      <rect x="58" y="82" width="72" height="16" rx="4" fill="white" opacity="0.75" />
      <circle cx="58" cy="106" r="3" fill="white" opacity="0.55" />
      <rect x="74" y="109" width="56" height="16" rx="4" fill="white" opacity="0.6" />
      <circle cx="74" cy="133" r="3" fill="white" opacity="0.4" />
      <rect x="58" y="136" width="80" height="16" rx="4" fill="white" opacity="0.45" />
    </>
  );
}

/**
 * Get the library logo as an SVG `<g>` element for a given library kind.
 *
 * Returns `undefined` for `core` or unrecognized libraries.
 * The logo is scaled and positioned to render at the given (x, y) center.
 */
function getLibraryLogo(
  kind: LibraryAdapterKind | undefined,
  cx: number,
  cy: number
): React.ReactElement | undefined {
  if (kind === undefined) return undefined;
  if (kind.library === "core") return undefined;

  let content: React.ReactElement | undefined;
  switch (kind.library) {
    case "store":
      content = <StoreLogo />;
      break;
    case "query":
      content = <QueryLogo />;
      break;
    case "saga":
      content = <SagaLogo />;
      break;
    case "flow":
      content = <FlowLogo />;
      break;
    case "logger":
      content = <LoggerLogo />;
      break;
    case "tracing":
      content = <TracingLogo />;
      break;
  }

  if (content === undefined) return undefined;

  const offsetX = cx - LOGO_SIZE / 2;
  const offsetY = cy - LOGO_SIZE / 2;

  return (
    <g
      data-testid="library-logo"
      transform={`translate(${offsetX}, ${offsetY}) scale(${LOGO_SCALE})`}
    >
      {content}
    </g>
  );
}

export { getLibraryLogo, LOGO_SIZE };
