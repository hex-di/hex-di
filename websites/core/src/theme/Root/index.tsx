/**
 * Custom Root component for HexDI documentation website.
 *
 * This component wraps the entire Docusaurus site and adds:
 * - CoreNav: custom navbar rendered on all pages (hidden on landing via CSS)
 * - Skip-to-main-content link for keyboard navigation
 *
 * @see https://www.w3.org/WAI/WCAG21/Techniques/general/G1
 */

import type { ReactNode } from "react";
import CoreNav from "../../components/CoreNav";

interface RootProps {
  children: ReactNode;
}

export default function Root({ children }: RootProps): ReactNode {
  return (
    <>
      {/* Skip to main content link for keyboard navigation */}
      <a href="#__docusaurus_skipToContent_fallback" className="skip-to-content">
        Skip to main content
      </a>
      <CoreNav />
      {children}
    </>
  );
}
