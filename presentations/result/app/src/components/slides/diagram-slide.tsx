import type { SlideDefinition } from "../../content/types.js";
import { ErrorTaxonomy } from "../diagrams/error-taxonomy.js";
import { RailwayDiagram } from "../diagrams/railway-diagram.js";
import { EcosystemDiagram } from "../diagrams/ecosystem-diagram.js";
import { FailureCascade } from "../diagrams/failure-cascade.js";
import { TypeBoundary } from "../diagrams/type-boundary.js";
import { LanguageComparison } from "../diagrams/language-comparison.js";
import { TwoKingdoms } from "../diagrams/two-kingdoms.js";
import styles from "./diagram-slide.module.css";

interface DiagramSlideProps {
  readonly slide: SlideDefinition;
}

function DiagramContent({ diagramId }: { readonly diagramId: string }): React.JSX.Element {
  switch (diagramId) {
    case "error-taxonomy":
      return <ErrorTaxonomy />;
    case "railway":
      return <RailwayDiagram />;
    case "ecosystem":
      return <EcosystemDiagram />;
    case "failure-cascade":
      return <FailureCascade />;
    case "type-boundary":
      return <TypeBoundary />;
    case "language-comparison":
      return <LanguageComparison />;
    case "two-kingdoms":
      return <TwoKingdoms />;
    default:
      return <p className={styles.placeholder}>[{diagramId} placeholder]</p>;
  }
}

export function DiagramSlide({ slide }: DiagramSlideProps): React.JSX.Element {
  const diagramId = slide.content?._tag === "diagram" ? slide.content.diagramId : "unknown";

  return (
    <div className={styles.container}>
      <div className={styles.inner}>
        <h2 className={styles.title}>{slide.title}</h2>
        <div className={styles.diagramArea}>
          <DiagramContent diagramId={diagramId} />
        </div>
      </div>
    </div>
  );
}
