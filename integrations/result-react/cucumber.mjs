export default {
  paths: ["features/**/*.feature"],
  import: ["features/steps/**/*.ts"],
  requireModule: ["tsx"],
  format: ["summary", "json:reports/cucumber.json"],
  publishQuiet: true,
};
