/**
 * Middleware exports for @hex-di/devtools-server.
 *
 * @packageDocumentation
 */

export { attachDevTools as attachExpressDevTools, type ExpressDevToolsOptions } from "./express.js";
export { attachDevTools as attachFastifyDevTools, type FastifyDevToolsOptions } from "./fastify.js";
