import { existsSync } from "node:fs";
import { resolve } from "node:path";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import Fastify from "fastify";
import { env } from "./lib/env.js";
import { authRoutes } from "./routes/auth.js";
import { ingredientRoutes } from "./routes/ingredients.js";
import { inventoryRoutes } from "./routes/inventory.js";
import { productRoutes } from "./routes/products.js";
import { reportRoutes } from "./routes/reports.js";
import { salesRoutes } from "./routes/sales.js";
import { supplierRoutes } from "./routes/suppliers.js";
import { userRoutes } from "./routes/users.js";

export function buildApp() {
  const app = Fastify({
    logger: {
      transport: env.isProd
        ? undefined
        : { target: "pino-pretty", options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" } },
    },
  });

  app.register(cors, {
    origin: env.corsOrigin,
    credentials: true,
  });

  app.register(cookie);

  // Healthcheck
  app.get("/api/v1/health", async () => ({
    status: "ok",
    service: "corazoncito-api",
    time: new Date().toISOString(),
  }));

  // Rutas públicas de autenticación
  app.register(authRoutes, { prefix: "/api/v1/auth" });

  // Módulo 2 — Usuarios (solo owner; guard interno por rol)
  app.register(userRoutes, { prefix: "/api/v1/users" });

  // Módulo 3 — Insumos (owner + manager)
  app.register(ingredientRoutes, { prefix: "/api/v1/ingredients" });

  // Módulo 4 — Proveedores (owner + manager)
  app.register(supplierRoutes, { prefix: "/api/v1/suppliers" });

  // Módulo 5 — Entradas de inventario (owner + manager); suma stock
  app.register(inventoryRoutes, { prefix: "/api/v1/inventory" });

  // Módulo 6/7 — Productos y recetas (lectura: todos; escritura: owner)
  app.register(productRoutes, { prefix: "/api/v1/products" });

  // Módulo 8 — Ventas (todos); descuenta stock según receta
  app.register(salesRoutes, { prefix: "/api/v1/sales" });

  // Módulo 9 — Reportes / varianza (owner + manager)
  app.register(reportRoutes, { prefix: "/api/v1/reports" });

  // Producción: servir el frontend compilado desde el mismo origen (single-origin).
  // Evita CORS/cookies cross-site y permite un solo proceso/servidor.
  const distDir = resolve(process.cwd(), process.env.FRONTEND_DIST ?? "../frontend/dist");
  if (existsSync(distDir)) {
    app.register(fastifyStatic, { root: distDir, prefix: "/" });

    // Fallback SPA: cualquier ruta que NO sea /api devuelve index.html
    app.setNotFoundHandler((req, reply) => {
      if (req.method === "GET" && !req.url.startsWith("/api")) {
        return reply.sendFile("index.html");
      }
      return reply.code(404).send({ error: "No encontrado." });
    });
  }

  return app;
}
