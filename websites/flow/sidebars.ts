import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [{ type: "doc", id: "index" }],
    },
    {
      type: "category",
      label: "Core Concepts",
      collapsed: false,
      items: [
        "concepts/states-events",
        "concepts/transitions",
        "concepts/effects",
        "concepts/activities",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: ["guides/building-machines", "guides/running-machines", "guides/di-integration"],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/api-reference"],
    },
    { type: "doc", id: "testing", label: "Testing" },
    { type: "doc", id: "react", label: "React Integration" },
    {
      type: "category",
      label: "Advanced",
      items: ["advanced/patterns", "advanced/serialization", "advanced/tracing"],
    },
  ],
};

export default sidebars;
