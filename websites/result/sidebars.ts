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
      items: ["concepts/result-type", "concepts/option-type", "concepts/error-patterns"],
    },
    {
      type: "category",
      label: "Guides",
      items: ["guides/transformations", "guides/async-results", "guides/generators"],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/api-reference"],
    },
    {
      type: "category",
      label: "Advanced",
      items: ["advanced/serialization"],
    },
  ],
};

export default sidebars;
