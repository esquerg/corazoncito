import { and, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { ingredients, inventoryEntries, recipeItems, sales } from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const querySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
});

export async function reportRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("owner", "manager"));

  /**
   * GET /api/v1/reports/variance?from&to
   * Varianza por insumo = entradas (compras) − consumo teórico (ventas × recetas).
   * El KPI central: revela merma, robo o error de receta.
   */
  app.get("/variance", async (req, reply) => {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "Parámetros inválidos." });
    const { from, to } = parsed.data;

    // Compras por insumo (entradas de inventario en el rango).
    const entryConds = [];
    if (from) entryConds.push(gte(inventoryEntries.receivedAt, from));
    if (to) entryConds.push(lte(inventoryEntries.receivedAt, to));
    const purchasedRows = db
      .select({
        ingredientId: inventoryEntries.ingredientId,
        purchased: sql<number>`sum(${inventoryEntries.quantity})`,
      })
      .from(inventoryEntries)
      .where(entryConds.length ? and(...entryConds) : undefined)
      .groupBy(inventoryEntries.ingredientId)
      .all();
    const purchasedMap = new Map(purchasedRows.map((r) => [r.ingredientId, Number(r.purchased)]));

    // Consumo teórico por insumo (ventas en el rango × cantidad de receta).
    const saleConds = [];
    if (from) saleConds.push(gte(sales.soldAt, from));
    if (to) saleConds.push(lte(sales.soldAt, to));
    const consumedRows = db
      .select({
        ingredientId: recipeItems.ingredientId,
        consumed: sql<number>`sum(${sales.quantity} * ${recipeItems.quantity})`,
      })
      .from(sales)
      .innerJoin(recipeItems, eq(recipeItems.productId, sales.productId))
      .where(saleConds.length ? and(...saleConds) : undefined)
      .groupBy(recipeItems.ingredientId)
      .all();
    const consumedMap = new Map(consumedRows.map((r) => [r.ingredientId, Number(r.consumed)]));

    const allIngredients = db.select().from(ingredients).orderBy(ingredients.name).all();

    const rows = allIngredients.map((ing) => {
      const purchased = purchasedMap.get(ing.id) ?? 0;
      const consumed = consumedMap.get(ing.id) ?? 0;
      return {
        ingredientId: ing.id,
        name: ing.name,
        unit: ing.unit,
        purchased,
        consumed,
        // Movimiento neto teórico esperado (compras − consumo).
        variance: purchased - consumed,
        currentStock: ing.currentStock,
        minStock: ing.minStock,
      };
    });

    return {
      from: from ?? null,
      to: to ?? null,
      rows,
    };
  });
}
