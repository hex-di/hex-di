import { serve } from "@hono/node-server";
import { createHonoApp } from "./adapters/inbound/hono/app.js";
import { createAppContainer } from "./di/container.js";

const container = createAppContainer();
const app = createHonoApp(container);

const port = 3000;
serve(
  {
    fetch: app.fetch,
    port,
  },
  (info) => {
    console.log(`✅ Hono + HexDI todo API running on http://localhost:${info.port}`);
    console.log(`   Try: curl -H "Authorization: Bearer user-token" http://localhost:${info.port}/todos`);
  }
);
