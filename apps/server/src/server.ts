/**
 * Bun server entry point.
 * This file is the runtime entry - starts the server.
 */

import { app } from "./app";

const PORT = Number(process.env.PORT) || 3000;

console.log(`Server starting on port ${PORT}...`);

export default {
  port: PORT,
  fetch: app.fetch,
};
