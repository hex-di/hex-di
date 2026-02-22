export default {
  import: ["features/steps/*.ts"],
  paths: ["features/*.feature"],
  requireModule: ["tsx"],
  worldParameters: {},
  format: ["progress-bar", "html:cucumber-report.html"],
  publishQuiet: true,
};
