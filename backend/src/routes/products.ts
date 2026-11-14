import { and, eq, isNotNull, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import {
  PRODUCT_CATEGORIES,
  ingredients,
  inventoryEntries,
  products,
  recipeItems,
  sales,
} from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  category: z.enum(PRODUCT_CATEGORIES),
  price: z.number().min(0).nullable().optional(),
  active: z.boolean().optional().default(true),
  imageUrl: z.string().url().nullable().optional(),
});

const updateSchema = createSchema.partial();

const recipeSchema = z.object({
  items: z
    .array(
      z.object({
        ingredientId: z.number().int().positive(),
        quantity: z.number().positive(),
      }),
    )
    .max(50),
});

/** Costo unitario promedio del insumo, calculado desde las entradas de inventario. */
function avgUnitCostFor(ingredientId: number): number | null {
  const row = db
    .select({ a: sql<number | null>`avg(${inventoryEntries.unitCost})` })
    .from(inventoryEntries)
    .where(
      and(
        eq(inventoryEntries.ingredientId, ingredientId),
        isNotNull(inventoryEntries.unitCost),
      ),
    )
    .get();
  return row?.a ?? null;
}

function buildRecipe(productId: number) {
  const rows = db
    .select({
      id: recipeItems.id,
      ingredientId: recipeItems.ingredientId,
      ingredientName: ingredients.name,
      unit: ingredients.unit,
      quantity: recipeItems.quantity,
    })
    .from(recipeItems)
    .innerJoin(ingredients, eq(recipeItems.ingredientId, ingredients.id))
    .where(eq(recipeItems.productId, productId))
    .all();

  let theoreticalCost: number | null = null;
  const items = rows.map((r) => {
    const avgCost = avgUnitCostFor(r.ingredientId);
    const lineCost = avgCost != null ? avgCost * r.quantity : null;
    if (lineCost != null) theoreticalCost = (theoreticalCost ?? 0) + lineCost;
    return { ...r, avgUnitCost: avgCost, lineCost };
  });

  return { items, theoreticalCost };
}

export async function productRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  const ownerOnly = { preHandler: requireRole("owner") };

  // GET /api/v1/products — accesible por cualquier rol (el barista lo necesita para vender)
  app.get("/", async () => {
    const rows = db.select().from(products).orderBy(products.name).all();
    return { products: rows };
  });

  // GET /api/v1/products/:id — incluye receta y costo teórico
  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const product = db.select().from(products).where(eq(products.id, id)).get();
    if (!product) return reply.code(404).send({ error: "Bebida no encontrada." });
    const recipe = buildRecipe(id);
    return { product: { ...product, ...recipe } };
  });

  // POST /api/v1/products — solo owner (maneja precios)
  app.post("/", ownerOnly, async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const created = db.insert(products).values(parsed.data).returning().get();
    return reply.code(201).send({ product: created });
  });

  // PATCH /api/v1/products/:id — solo owner
  app.patch("/:id", ownerOnly, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const target = db.select().from(products).where(eq(products.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Bebida no encontrada." });

    const updated = db
      .update(products)
      .set(parsed.data)
      .where(eq(products.id, id))
      .returning()
      .get();
    return { product: updated };
  });

  // PUT /api/v1/products/:id/recipe — reemplaza la receta completa (solo owner)
  app.put("/:id/recipe", ownerOnly, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = recipeSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const product = db.select({ id: products.id }).from(products).where(eq(products.id, id)).get();
    if (!product) return reply.code(404).send({ error: "Bebida no encontrada." });

    // Validar que todos los insumos existen.
    for (const item of parsed.data.items) {
      const ing = db
        .select({ id: ingredients.id })
        .from(ingredients)
        .where(eq(ingredients.id, item.ingredientId))
        .get();
      if (!ing) {
        return reply.code(400).send({ error: `El insumo ${item.ingredientId} no existe.` });
      }
    }

    db.transaction((tx) => {
      tx.delete(recipeItems).where(eq(recipeItems.productId, id)).run();
      if (parsed.data.items.length > 0) {
        tx.insert(recipeItems)
          .values(parsed.data.items.map((i) => ({ ...i, productId: id })))
          .run();
      }
    });

    return { product: { id, ...buildRecipe(id) } };
  });

  // DELETE /api/v1/products/:id — solo owner; bloquea si tiene ventas
  app.delete("/:id", ownerOnly, async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const target = db.select({ id: products.id }).from(products).where(eq(products.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Bebida no encontrada." });

    const hasSales = db.select({ id: sales.id }).from(sales).where(eq(sales.productId, id)).get();
    if (hasSales) {
      return reply.code(409).send({
        error: "No se puede eliminar: la bebida tiene ventas registradas. Desactívala en su lugar.",
      });
    }

    db.transaction((tx) => {
      tx.delete(recipeItems).where(eq(recipeItems.productId, id)).run();
      tx.delete(products).where(eq(products.id, id)).run();
    });
    return { ok: true };
  });
}
