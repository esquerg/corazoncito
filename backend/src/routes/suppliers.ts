import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { suppliers } from "../db/schema.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  contact: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

const updateSchema = createSchema.partial();

export async function supplierRoutes(app: FastifyInstance) {
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("owner", "manager"));

  // GET /api/v1/suppliers
  app.get("/", async () => {
    const rows = db.select().from(suppliers).orderBy(suppliers.name).all();
    return { suppliers: rows };
  });

  // GET /api/v1/suppliers/:id
  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const row = db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    if (!row) return reply.code(404).send({ error: "Proveedor no encontrado." });
    return { supplier: row };
  });

  // POST /api/v1/suppliers
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const created = db.insert(suppliers).values(parsed.data).returning().get();
    return reply.code(201).send({ supplier: created });
  });

  // PATCH /api/v1/suppliers/:id
  app.patch("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const target = db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Proveedor no encontrado." });

    const updated = db
      .update(suppliers)
      .set(parsed.data)
      .where(eq(suppliers.id, id))
      .returning()
      .get();
    return { supplier: updated };
  });

  // DELETE /api/v1/suppliers/:id
  // Las entradas de inventario asociadas quedan con supplier_id = NULL (onDelete: set null).
  app.delete("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const target = db.select().from(suppliers).where(eq(suppliers.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Proveedor no encontrado." });

    db.delete(suppliers).where(eq(suppliers.id, id)).run();
    return { ok: true };
  });
}
