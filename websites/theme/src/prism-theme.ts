import type { PrismTheme } from "prism-react-renderer";

const theme: PrismTheme = {
  plain: {
    color: "#F8F8F2",
    backgroundColor: "#0a1420",
  },
  styles: [
    {
      types: ["keyword", "control-flow", "module", "imports", "exports"],
      style: { color: "#FF79C6" },
    },
    {
      types: ["class-name", "maybe-class-name", "builtin"],
      style: { color: "#8BE9FD" },
    },
    {
      types: ["string", "template-string", "attr-value", "char"],
      style: { color: "#F1FA8C" },
    },
    {
      types: ["comment", "prolog", "doctype", "cdata"],
      style: { color: "#6272A4", fontStyle: "italic" },
    },
    {
      types: ["function", "method"],
      style: { color: "#50FA7B" },
    },
    {
      types: ["number", "boolean", "constant"],
      style: { color: "#BD93F9" },
    },
    {
      types: ["punctuation"],
      style: { color: "#6272A4" },
    },
    {
      types: ["operator", "tag"],
      style: { color: "#F92672" },
    },
    {
      types: ["property", "attr-name"],
      style: { color: "#A6E22E" },
    },
    {
      types: ["regex"],
      style: { color: "#FF79C6" },
    },
  ],
};

export default theme;
