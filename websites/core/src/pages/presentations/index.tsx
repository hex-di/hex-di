import Layout from "@theme/Layout";
import useBaseUrl from "@docusaurus/useBaseUrl";
import presentations from "../../../presentations.json";

const published = presentations.filter(p => p.published);

function PresentationCard({
  id,
  name,
  description,
}: {
  id: string;
  name: string;
  description: string;
}) {
  const href = useBaseUrl(`/presentations/${id}/`);
  return (
    <a
      href={href}
      style={{
        display: "block",
        padding: "1.5rem",
        borderRadius: "0.75rem",
        border: "1px solid var(--hexdi-border)",
        background: "var(--hexdi-surface)",
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.2s, box-shadow 0.2s",
      }}
      className="presentation-card"
    >
      <h3
        style={{
          margin: "0 0 0.5rem",
          fontSize: "1.25rem",
          color: "var(--hexdi-text-primary)",
        }}
      >
        {name}
      </h3>
      <p
        style={{
          margin: 0,
          color: "var(--hexdi-text-secondary)",
          fontSize: "0.95rem",
        }}
      >
        {description}
      </p>
    </a>
  );
}

export default function PresentationsPage() {
  return (
    <Layout title="Presentations" description="Interactive presentations for HexDI libraries.">
      <main
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "3rem 1.5rem",
        }}
      >
        <h1 style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>Presentations</h1>
        <p
          style={{
            color: "var(--hexdi-text-secondary)",
            fontSize: "1.1rem",
            marginBottom: "2rem",
          }}
        >
          Interactive walkthroughs and slide decks for HexDI libraries.
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.25rem",
          }}
        >
          {published.map(p => (
            <PresentationCard key={p.id} id={p.id} name={p.name} description={p.description} />
          ))}
        </div>
      </main>

      <style>{`
        .presentation-card:hover {
          border-color: var(--hexdi-primary-400) !important;
          box-shadow: 0 2px 12px rgba(94, 53, 177, 0.12);
        }
      `}</style>
    </Layout>
  );
}
