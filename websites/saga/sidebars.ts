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
      items: ["concepts/steps", "concepts/sagas", "concepts/compensation", "concepts/execution"],
    },
    {
      type: "category",
      label: "Guides",
      items: ["guides/building-sagas", "guides/persistence", "guides/di-integration"],
    },
    {
      type: "category",
      label: "API Reference",
      items: ["api/api-reference"],
    },
    { type: "doc", id: "testing", label: "Testing" },
    { type: "doc", id: "react", label: "React Integration" },
  ],
};

export default sidebars;
