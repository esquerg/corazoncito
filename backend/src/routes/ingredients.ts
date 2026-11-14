import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  INGREDIENT_CATEGORIES,
  INGREDIENT_UNITS,
  ingredients,
  inventoryEntries,
  recipeItems,
} from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

export type StockStatus = "ok" | "low" | "critical";

/** Semáforo de stock: rojo <= mínimo, amarillo <= 1.5× mínimo, verde por encima. */
export function stockStatus(current: number, min: number): StockStatus {
  if (current <= min) return "critical";
  if (current <= min * 1.5) return "low";
  return "ok";
}

function withStatus(i: typeof ingredients.$inferSelect) {
  return { ...i, status: stockStatus(i.currentStock, i.minStock) };
}

const createSchema = z.object({
  name: z.string().min(1),
  unit: z.enum(INGREDIENT_UNITS),
  category: z.enum(INGREDIENT_CATEGORIES),
  minStock: z.number().min(0).default(0),
  // Saldo de apertura opcional; después el stock lo mueven entradas y ventas.
  currentStock: z.number().min(0).default(0),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  unit: z.enum(INGREDIENT_UNITS).optional(),
  category: z.enum(INGREDIENT_CATEGORIES).optional(),
  minStock: z.number().min(0).optional(),
});

export async function ingredientRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("owner", "manager"));

  // GET /api/v1/ingredients
  app.get("/", async () => {
    const rows = db.select().from(ingredients).orderBy(ingredients.name).all();
    return { ingredients: rows.map(withStatus) };
  });

  // GET /api/v1/ingredients/:id
  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const row = db.select().from(ingredients).where(eq(ingredients.id, id)).get();
    if (!row) return reply.code(404).send({ error: "Insumo no encontrado." });
    return { ingredient: withStatus(row) };
  });

  // POST /api/v1/ingredients
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const created = db.insert(ingredients).values(parsed.data).returning().get();
    return reply.code(201).send({ ingredient: withStatus(created) });
  });

  // PATCH /api/v1/ingredients/:id
  app.patch("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const target = db.select().from(ingredients).where(eq(ingredients.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Insumo no encontrado." });

    const updated = db
      .update(ingredients)
      .set(parsed.data)
      .where(eq(ingredients.id, id))
      .returning()
      .get();
    return { ingredient: withStatus(updated) };
  });

  // DELETE /api/v1/ingredients/:id
  app.delete("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const target = db.select().from(ingredients).where(eq(ingredients.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Insumo no encontrado." });

    // No permitir borrar si está referenciado por recetas o entradas de inventario.
    const usedInRecipe = db
      .select({ id: recipeItems.id })
      .from(recipeItems)
      .where(eq(recipeItems.ingredientId, id))
      .get();
    const usedInEntry = db
      .select({ id: inventoryEntries.id })
      .from(inventoryEntries)
      .where(eq(inventoryEntries.ingredientId, id))
      .get();
    if (usedInRecipe || usedInEntry) {
      return reply.code(409).send({
        error: "No se puede eliminar: el insumo está en uso en recetas o entradas de inventario.",
      });
    }

    db.delete(ingredients).where(eq(ingredients.id, id)).run();
    return { ok: true };
  });
}
