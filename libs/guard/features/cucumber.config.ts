export default {
  default: {
    paths: ["features/**/*.feature"],
    format: ["progress", "json:reports/cucumber-report.json"],
    strict: true,
    worldParameters: {},
  },
};
