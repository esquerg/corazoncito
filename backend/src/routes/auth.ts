import { eq } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { db } from "../db/index.js";
import { users } from "../db/schema.js";
import { env } from "../lib/env.js";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../lib/jwt.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { requireAuth } from "../middleware/auth.js";

const REFRESH_COOKIE = "corazoncito_refresh";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "Mínimo 8 caracteres."),
});

function refreshCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "lax" as const,
    path: "/api/v1/auth",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  };
}

function publicUser(u: typeof users.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    active: u.active,
  };
}

export async function authRoutes(app: FastifyInstance) {
  // POST /api/v1/auth/login
  app.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }
    const { email, password } = parsed.data;

    const user = db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .get();

    if (!user || !user.active) {
      return reply.code(401).send({ error: "Credenciales inválidas." });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return reply.code(401).send({ error: "Credenciales inválidas." });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
    const refreshToken = signRefreshToken(user.id);

    reply.setCookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions());
    return reply.send({ accessToken, user: publicUser(user) });
  });

  // POST /api/v1/auth/refresh — usa el refresh token de la cookie httpOnly
  app.post("/refresh", async (req, reply) => {
    const token = req.cookies[REFRESH_COOKIE];
    if (!token) {
      return reply.code(401).send({ error: "Sesión expirada." });
    }

    let userId: number;
    try {
      userId = verifyRefreshToken(token).sub;
    } catch {
      reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
      return reply.code(401).send({ error: "Sesión inválida." });
    }

    const user = db.select().from(users).where(eq(users.id, userId)).get();
    if (!user || !user.active) {
      reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
      return reply.code(401).send({ error: "Sesión inválida." });
    }

    const accessToken = signAccessToken({
      sub: user.id,
      role: user.role,
      name: user.name,
      email: user.email,
    });
    // Rotación del refresh token
    reply.setCookie(REFRESH_COOKIE, signRefreshToken(user.id), refreshCookieOptions());
    return reply.send({ accessToken, user: publicUser(user) });
  });

  // POST /api/v1/auth/logout
  app.post("/logout", async (_req, reply) => {
    reply.clearCookie(REFRESH_COOKIE, { path: "/api/v1/auth" });
    return reply.send({ ok: true });
  });

  // GET /api/v1/auth/me — usuario autenticado actual
  app.get("/me", { preHandler: requireAuth }, async (req, reply) => {
    const user = db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.sub))
      .get();
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado." });
    }
    return reply.send({ user: publicUser(user) });
  });

  // POST /api/v1/auth/change-password — cualquier usuario, su propia contraseña
  app.post("/change-password", { preHandler: requireAuth }, async (req, reply) => {
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "Datos inválidos.", issues: parsed.error.flatten() });
    }

    const user = db
      .select()
      .from(users)
      .where(eq(users.id, req.user!.sub))
      .get();
    if (!user) {
      return reply.code(404).send({ error: "Usuario no encontrado." });
    }

    const ok = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
    if (!ok) {
      return reply.code(400).send({ error: "La contraseña actual no es correcta." });
    }

    const passwordHash = await hashPassword(parsed.data.newPassword);
    db.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run();

    return reply.send({ ok: true });
  });
}
