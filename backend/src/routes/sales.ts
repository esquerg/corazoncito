import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { ingredients, products, recipeItems, sales, users } from "../db/schema.js";
import { requireAuth } from "../middleware/auth.js";

const createSchema = z.object({
  productId: z.number().int().positive(),
  quantity: z.number().int().positive(),
  notes: z.string().optional().nullable(),
});

const listQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function salesRoutes(app: FastifyInstance) {
  // Cualquier usuario autenticado: el barista registra y ve su turno.
  app.addHook("preHandler", requireAuth);

  // GET /api/v1/sales — ventas recientes (joins a bebida y usuario)
  app.get("/", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: "Parámetros inválidos." });
    const { from, to, limit } = parsed.data;

    const conds = [];
    if (from) conds.push(gte(sales.soldAt, from));
    if (to) conds.push(lte(sales.soldAt, to));

    const rows = db
      .select({
        id: sales.id,
        productId: sales.productId,
        productName: products.name,
        quantity: sales.quantity,
        price: products.price,
        soldAt: sales.soldAt,
        notes: sales.notes,
        createdByName: users.name,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .innerJoin(users, eq(sales.createdBy, users.id))
      .where(conds.length ? and(...conds) : undefined)
      .orderBy(desc(sales.soldAt), desc(sales.id))
      .limit(limit)
      .all();

    return { sales: rows };
  });

  // GET /api/v1/sales/today — resumen del turno: agrupado por bebida
  app.get("/today", async () => {
    const rows = db
      .select({
        productId: sales.productId,
        productName: products.name,
        units: sql<number>`sum(${sales.quantity})`,
        revenue: sql<number>`coalesce(sum(${sales.quantity} * ${products.price}), 0)`,
      })
      .from(sales)
      .innerJoin(products, eq(sales.productId, products.id))
      .where(gte(sales.soldAt, startOfToday()))
      .groupBy(sales.productId, products.name)
      .orderBy(desc(sql`sum(${sales.quantity})`))
      .all();

    const totalUnits = rows.reduce((acc, r) => acc + Number(r.units), 0);
    const totalRevenue = rows.reduce((acc, r) => acc + Number(r.revenue), 0);
    return { summary: rows, totalUnits, totalRevenue };
  });

  // POST /api/v1/sales — registra venta y DESCUENTA insumos según receta (atómico)
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const { productId, quantity, notes } = parsed.data;

    const product = db.select().from(products).where(eq(products.id, productId)).get();
    if (!product) return reply.code(400).send({ error: "La bebida no existe." });
    if (!product.active) return reply.code(400).send({ error: "La bebida está inactiva." });

    const recipe = db
      .select()
      .from(recipeItems)
      .where(eq(recipeItems.productId, productId))
      .all();

    const sale = db.transaction((tx) => {
      const created = tx
        .insert(sales)
        .values({
          productId,
          quantity,
          notes: notes ?? null,
          createdBy: req.user!.sub,
          soldAt: new Date(),
        })
        .returning()
        .get();

      // Descontar cada insumo de la receta × unidades vendidas.
      for (const item of recipe) {
        tx.update(ingredients)
          .set({
            currentStock: sql`${ingredients.currentStock} - ${item.quantity * quantity}`,
          })
          .where(eq(ingredients.id, item.ingredientId))
          .run();
      }
      return created;
    });

    // Insumos de la receta que quedaron en o por debajo del mínimo.
    const alerts = recipe.length
      ? db
          .select({
            id: ingredients.id,
            name: ingredients.name,
            currentStock: ingredients.currentStock,
            minStock: ingredients.minStock,
            unit: ingredients.unit,
          })
          .from(ingredients)
          .where(
            and(
              sql`${ingredients.id} in (${sql.join(
                recipe.map((r) => sql`${r.ingredientId}`),
                sql`, `,
              )})`,
              lte(ingredients.currentStock, ingredients.minStock),
            ),
          )
          .all()
      : [];

    return reply.code(201).send({ sale, lowStock: alerts });
  });
}
