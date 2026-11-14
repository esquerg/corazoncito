import { and, eq, ne } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { ROLES, users } from "../db/schema.js";
import { hashPassword } from "../lib/password.js";
import { requireAuth, requireRole } from "../middleware/auth.js";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Mínimo 8 caracteres."),
  role: z.enum(ROLES),
  active: z.boolean().optional().default(true),
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(ROLES).optional(),
  active: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, "Mínimo 8 caracteres."),
});

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
    createdAt: u.createdAt,
  };
}

/** Cuenta cuántos dueños activos quedan, excluyendo opcionalmente un id. */
function activeOwnerCount(excludeId?: number): number {
  const rows = db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.role, "owner"), eq(users.active, true)))
    .all();
  return rows.filter((r) => r.id !== excludeId).length;
}

export async function userRoutes(app: FastifyInstance) {
  // Todas las rutas: autenticado + rol owner
  app.addHook("preHandler", requireAuth);
  app.addHook("preHandler", requireRole("owner"));

  // GET /api/v1/users
  app.get("/", async () => {
    const rows = db.select().from(users).orderBy(users.name).all();
    return { users: rows.map(publicUser) };
  });

  // GET /api/v1/users/:id
  app.get("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const user = db.select().from(users).where(eq(users.id, id)).get();
    if (!user) return reply.code(404).send({ error: "Usuario no encontrado." });
    return { user: publicUser(user) };
  });

  // POST /api/v1/users
  app.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const { name, email, password, role, active } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .get();
    if (existing) {
      return reply.code(409).send({ error: "Ya existe un usuario con ese correo." });
    }

    const passwordHash = await hashPassword(password);
    const created = db
      .insert(users)
      .values({ name, email: normalizedEmail, passwordHash, role, active })
      .returning()
      .get();

    return reply.code(201).send({ user: publicUser(created) });
  });

  // PATCH /api/v1/users/:id
  app.patch("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }

    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Usuario no encontrado." });

    const changes = parsed.data;
    const selfId = req.user!.sub;

    // No permitir que el dueño se quite a sí mismo el rol o se desactive (auto-bloqueo).
    if (id === selfId) {
      if (changes.role && changes.role !== "owner") {
        return reply.code(400).send({ error: "No puedes cambiar tu propio rol de dueño." });
      }
      if (changes.active === false) {
        return reply.code(400).send({ error: "No puedes desactivar tu propia cuenta." });
      }
    }

    // No dejar la cafetería sin ningún dueño activo.
    const losesOwner =
      (changes.role && changes.role !== "owner" && target.role === "owner") ||
      (changes.active === false && target.role === "owner");
    if (losesOwner && activeOwnerCount(id) === 0) {
      return reply.code(400).send({ error: "Debe quedar al menos un dueño activo." });
    }

    // Email único.
    if (changes.email) {
      const normalizedEmail = changes.email.toLowerCase();
      const clash = db
        .select({ id: users.id })
        .from(users)
        .where(and(eq(users.email, normalizedEmail), ne(users.id, id)))
        .get();
      if (clash) {
        return reply.code(409).send({ error: "Ya existe un usuario con ese correo." });
      }
      changes.email = normalizedEmail;
    }

    const updated = db
      .update(users)
      .set(changes)
      .where(eq(users.id, id))
      .returning()
      .get();

    return { user: publicUser(updated) };
  });

  // POST /api/v1/users/:id/reset-password — el dueño asigna una contraseña nueva
  app.post("/:id/reset-password", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const target = db.select({ id: users.id }).from(users).where(eq(users.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Usuario no encontrado." });

    const passwordHash = await hashPassword(parsed.data.newPassword);
    db.update(users).set({ passwordHash }).where(eq(users.id, id)).run();
    return { ok: true };
  });

  // DELETE /api/v1/users/:id
  app.delete("/:id", async (req, reply) => {
    const id = Number((req.params as { id: string }).id);
    if (id === req.user!.sub) {
      return reply.code(400).send({ error: "No puedes eliminar tu propia cuenta." });
    }
    const target = db.select().from(users).where(eq(users.id, id)).get();
    if (!target) return reply.code(404).send({ error: "Usuario no encontrado." });

    if (target.role === "owner" && activeOwnerCount(id) === 0) {
      return reply.code(400).send({ error: "Debe quedar al menos un dueño activo." });
    }

    db.delete(users).where(eq(users.id, id)).run();
    return { ok: true };
  });
}
