import { buildApp } from "./app.js";
import { env } from "./lib/env.js";

const app = buildApp();

app
  .listen({ port: env.port, host: env.host })
  .then((address) => {
    app.log.info(`Corazoncito API escuchando en ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
