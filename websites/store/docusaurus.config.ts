import { createSiteConfig } from "@hex-di/website-theme/config";

interface PostCssOptions {
  plugins: unknown[];
  [key: string]: unknown;
}

function tailwindPlugin() {
  return {
    name: "docusaurus-tailwindcss",
    configurePostCss(postcssOptions: PostCssOptions): PostCssOptions {
      postcssOptions.plugins.push(require("@tailwindcss/postcss"));
      postcssOptions.plugins.push(require("autoprefixer"));
      return postcssOptions;
    },
  };
}

export default createSiteConfig({
  libraryId: "store",
  docsPath: "docs",
  blogPath: "blog",
  customCss: "./src/css/custom.css",
  tailwindPlugin,
});
