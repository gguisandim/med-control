import "server-only";
import crypto from "crypto";
import { cookies } from "next/headers";

const COOKIE_NAME = "med_control_session";
const SESSION_VALUE = "family-access-v1";

function sessionSecret() {
  const value = process.env.SESSION_SECRET;
  if (!value) throw new Error("SESSION_SECRET não configurado.");
  return value;
}

function sign(value: string) {
  return crypto.createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function safeEqual(a: string, b: string) {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function verifyPassword(password: string) {
  const expected = process.env.APP_PASSWORD;
  if (!expected) throw new Error("APP_PASSWORD não configurada.");
  return safeEqual(password, expected);
}

export async function createSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, `${SESSION_VALUE}.${sign(SESSION_VALUE)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function hasSession() {
  const store = await cookies();
  const cookie = store.get(COOKIE_NAME)?.value;
  if (!cookie) return false;
  const [value, signature] = cookie.split(".");
  if (!value || !signature || value !== SESSION_VALUE) return false;
  return safeEqual(signature, sign(value));
}
