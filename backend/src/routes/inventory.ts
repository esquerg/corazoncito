import { desc, eq, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { ingredients, inventoryEntries, suppliers, users } from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  ingredientId: z.number().int().positive(),
  supplierId: z.number().int().positive().nullable().optional(),
  quantity: z.number().positive(),
  unitCost: z.number().min(0).nullable().optional(),
  reference: z.string().optional().nullable(),
  receivedAt: z.coerce.date().optional(),
});

const listQuerySchema = z.object({
  ingredientId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(500).default(100),
});

export async function inventoryRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("owner", "manager"));

  // GET /api/v1/inventory — libro de entradas (más recientes primero)
  app.get("/", async (req, reply) => {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Parámetros inválidos." });
    }
    const { ingredientId, limit } = parsed.data;

    const base = db
      .select({
        id: inventoryEntries.id,
        ingredientId: inventoryEntries.ingredientId,
        ingredientName: ingredients.name,
        ingredientUnit: ingredients.unit,
        supplierId: inventoryEntries.supplierId,
        supplierName: suppliers.name,
        quantity: inventoryEntries.quantity,
        unitCost: inventoryEntries.unitCost,
        reference: inventoryEntries.reference,
        receivedAt: inventoryEntries.receivedAt,
        createdByName: users.name,
      })
      .from(inventoryEntries)
      .innerJoin(ingredients, eq(inventoryEntries.ingredientId, ingredients.id))
      .leftJoin(suppliers, eq(inventoryEntries.supplierId, suppliers.id))
      .innerJoin(users, eq(inventoryEntries.createdBy, users.id))
      .orderBy(desc(inventoryEntries.receivedAt), desc(inventoryEntries.id))
      .limit(limit);

    const rows = ingredientId
      ? base.where(eq(inventoryEntries.ingredientId, ingredientId)).all()
      : base.all();

    return { entries: rows };
  });

  // POST /api/v1/inventory — registra recepción y SUMA al stock del insumo (atómico)
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const data = parsed.data;

    const ingredient = db
      .select()
      .from(ingredients)
      .where(eq(ingredients.id, data.ingredientId))
      .get();
    if (!ingredient) {
      return reply.code(400).send({ error: "El insumo no existe." });
    }

    if (data.supplierId != null) {
      const supplier = db
        .select({ id: suppliers.id })
        .from(suppliers)
        .where(eq(suppliers.id, data.supplierId))
        .get();
      if (!supplier) {
        return reply.code(400).send({ error: "El proveedor no existe." });
      }
    }

    const created = db.transaction((tx) => {
      const entry = tx
        .insert(inventoryEntries)
        .values({
          ingredientId: data.ingredientId,
          supplierId: data.supplierId ?? null,
          quantity: data.quantity,
          unitCost: data.unitCost ?? null,
          reference: data.reference ?? null,
          receivedAt: data.receivedAt ?? new Date(),
          createdBy: req.user!.sub,
        })
        .returning()
        .get();

      tx.update(ingredients)
        .set({ currentStock: sql`${ingredients.currentStock} + ${data.quantity}` })
        .where(eq(ingredients.id, data.ingredientId))
        .run();

      return entry;
    });

    const updated = db
      .select({ currentStock: ingredients.currentStock })
      .from(ingredients)
      .where(eq(ingredients.id, data.ingredientId))
      .get();

    return reply.code(201).send({ entry: created, newStock: updated?.currentStock });
  });
}
