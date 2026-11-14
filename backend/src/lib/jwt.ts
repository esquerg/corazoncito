import jwt from "jsonwebtoken";
import { env } from "./env.js";
import type { Role } from "../db/schema.js";

export interface AccessTokenPayload {
  sub: number;
  role: Role;
  name: string;
  email: string;
}

export interface RefreshTokenPayload {
  sub: number;
  /** Token version / type discriminator. */
  typ: "refresh";
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.jwt.accessSecret, {
    expiresIn: env.jwt.accessTtl as jwt.SignOptions["expiresIn"],
  });
}

export function signRefreshToken(userId: number): string {
  const payload: RefreshTokenPayload = { sub: userId, typ: "refresh" };
  return jwt.sign(payload, env.jwt.refreshSecret, {
    expiresIn: env.jwt.refreshTtl as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.jwt.accessSecret) as unknown as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.jwt.refreshSecret) as unknown as RefreshTokenPayload;
}
