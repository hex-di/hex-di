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
        "concepts/permissions",
        "concepts/roles",
        "concepts/policies",
        "concepts/evaluation",
        "concepts/subjects",
      ],
    },
    {
      type: "category",
      label: "Guides",
      items: ["guides/di-integration", "guides/port-gates", "guides/serialization"],
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
      items: ["advanced/gxp", "advanced/architecture"],
    },
  ],
};

export default sidebars;
