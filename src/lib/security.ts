import { cookies } from "next/headers";
import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { prisma } from "@/lib/db";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE = "tshirt_session";
const SESSION_DAYS = 8;

export function normalizePhone(value: string): string {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("+880")) return `0${digits.slice(4)}`;
  if (digits.startsWith("880")) return `0${digits.slice(3)}`;
  return digits;
}

export function maskPhone(phone: string): string {
  return `${phone.slice(0, 3)}****${phone.slice(-2)}`;
}

export async function hashPassword(password: string) {
  return argon2.hash(password, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, password: string) {
  return argon2.verify(hash, password);
}

function digest(token: string) {
  // Session.id is a PostgreSQL UUID; retain 128 bits of the token digest.
  return createHash("sha256").update(token).digest("hex").slice(0, 32);
}

export async function createSession(userId: string, role: Role, ipAddress?: string) {
  const token = randomBytes(32).toString("base64url");
  await prisma.session.create({
    data: {
      id: digest(token),
      userId,
      expiresAt: new Date(Date.now() + SESSION_DAYS * 86400000),
      ipAddress,
    },
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: SESSION_DAYS * 86400,
  });
  return { role };
}

export async function getSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await prisma.session.findUnique({
    where: { id: digest(token) },
    include: { user: true },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return session;
}

export async function requireRole(role: Role) {
  const session = await getSession();
  if (!session || session.user.role !== role) throw new Error("UNAUTHORIZED");
  return session;
}

export async function destroySession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) await prisma.session.deleteMany({ where: { id: digest(token) } });
  (await cookies()).delete(SESSION_COOKIE);
}
