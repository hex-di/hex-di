/// <reference types="vite/client" />

/**
 * Vite `?worker` import declarations for Monaco Editor workers.
 *
 * Vite transforms `import X from "...?worker"` into a Worker constructor.
 * These declarations tell TypeScript about the resulting type.
 */

declare module "monaco-editor/esm/vs/editor/editor.worker?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module "monaco-editor/esm/vs/language/typescript/ts.worker?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}
