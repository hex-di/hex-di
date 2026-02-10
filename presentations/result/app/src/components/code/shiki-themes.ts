import type { ThemeRegistrationRaw } from "shiki";

export const sanofiDark: ThemeRegistrationRaw = {
  name: "sanofi-dark",
  type: "dark",
  colors: {
    "editor.background": "#1e1e2e",
    "editor.foreground": "#e4e4e4",
    "editor.lineHighlightBackground": "rgba(179, 168, 230, 0.12)",
    "editorLineNumber.foreground": "#434343",
    "editorGutter.background": "#181825",
  },
  settings: [
    {
      settings: {
        foreground: "#e4e4e4",
        background: "#1e1e2e",
      },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "#b3a8e6" },
    },
    {
      scope: ["string", "string.quoted"],
      settings: { foreground: "#47cd89" },
    },
    {
      scope: [
        "entity.name.type",
        "support.type",
        "entity.other.inherited-class",
        "meta.type.annotation",
      ],
      settings: { foreground: "#53b1fd" },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "#f97066" },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#757575", fontStyle: "italic" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#8966db" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#fdb022" },
    },
    {
      scope: ["variable", "variable.other"],
      settings: { foreground: "#e4e4e4" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "#e4e4e4", fontStyle: "italic" },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: { foreground: "#aeaeae" },
    },
    {
      scope: ["entity.name.tag"],
      settings: { foreground: "#f97066" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#fdb022" },
    },
    {
      scope: ["meta.object-literal.key"],
      settings: { foreground: "#53b1fd" },
    },
    {
      scope: ["keyword.operator"],
      settings: { foreground: "#aeaeae" },
    },
  ],
};

export const sanofiLight: ThemeRegistrationRaw = {
  name: "sanofi-light",
  type: "light",
  colors: {
    "editor.background": "#faf5ff",
    "editor.foreground": "#171717",
    "editor.lineHighlightBackground": "rgba(122, 0, 230, 0.08)",
    "editorLineNumber.foreground": "#c9c9c9",
    "editorGutter.background": "#f5f5f5",
  },
  settings: [
    {
      settings: {
        foreground: "#171717",
        background: "#faf5ff",
      },
    },
    {
      scope: ["keyword", "storage.type", "storage.modifier"],
      settings: { foreground: "#7a00e6" },
    },
    {
      scope: ["string", "string.quoted"],
      settings: { foreground: "#067647" },
    },
    {
      scope: [
        "entity.name.type",
        "support.type",
        "entity.other.inherited-class",
        "meta.type.annotation",
      ],
      settings: { foreground: "#1570ef" },
    },
    {
      scope: ["invalid", "invalid.illegal"],
      settings: { foreground: "#d72b3f" },
    },
    {
      scope: ["comment", "punctuation.definition.comment"],
      settings: { foreground: "#939393", fontStyle: "italic" },
    },
    {
      scope: ["entity.name.function", "support.function", "meta.function-call"],
      settings: { foreground: "#5718b0" },
    },
    {
      scope: ["constant.numeric", "constant.language"],
      settings: { foreground: "#b54708" },
    },
    {
      scope: ["variable", "variable.other"],
      settings: { foreground: "#171717" },
    },
    {
      scope: ["variable.parameter"],
      settings: { foreground: "#171717", fontStyle: "italic" },
    },
    {
      scope: ["punctuation", "meta.brace"],
      settings: { foreground: "#5d5d5d" },
    },
    {
      scope: ["entity.name.tag"],
      settings: { foreground: "#d72b3f" },
    },
    {
      scope: ["entity.other.attribute-name"],
      settings: { foreground: "#b54708" },
    },
    {
      scope: ["meta.object-literal.key"],
      settings: { foreground: "#1570ef" },
    },
    {
      scope: ["keyword.operator"],
      settings: { foreground: "#5d5d5d" },
    },
  ],
};
