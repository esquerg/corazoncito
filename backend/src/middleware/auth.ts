import type { FastifyReply, FastifyRequest } from "fastify";
import type { Role } from "../db/schema.js";
import { verifyAccessToken, type AccessTokenPayload } from "../lib/jwt.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: AccessTokenPayload;
  }
}

/**
 * Verifica el Bearer JWT y adjunta el usuario al request.
 * Se usa como `preHandler` en rutas protegidas.
 */
export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return reply.code(401).send({ error: "Token de acceso requerido." });
  }

  const token = header.slice("Bearer ".length).trim();
  try {
    req.user = verifyAccessToken(token);
  } catch {
    return reply.code(401).send({ error: "Token inválido o expirado." });
  }
}

/**
 * Genera un preHandler que exige que el usuario tenga uno de los roles dados.
 * Debe encadenarse DESPUÉS de requireAuth.
 */
export function requireRole(...roles: Role[]) {
  return async function (req: FastifyRequest, reply: FastifyReply) {
    if (!req.user) {
      return reply.code(401).send({ error: "No autenticado." });
    }
    if (!roles.includes(req.user.role)) {
      return reply
        .code(403)
        .send({ error: "No tienes permiso para esta acción." });
    }
  };
}
