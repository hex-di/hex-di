import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
  docs: [
    {
      type: "category",
      label: "Getting Started",
      collapsed: false,
      items: [{ type: "doc", id: "index" }],
    },
  ],
};

export default sidebars;
