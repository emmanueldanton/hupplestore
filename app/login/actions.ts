"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  expectedCredentials,
  matches,
  REMEMBER_MAX_AGE,
  SESSION_COOKIE,
  sessionToken,
} from "@/lib/auth";

export async function login(formData: FormData) {
  const expected = expectedCredentials();
  if (!expected) redirect("/login?error=config");

  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const remember = formData.get("remember") === "on";

  if (!matches({ email, password }, expected)) {
    redirect("/login?error=invalid");
  }

  const store = await cookies();
  store.set(SESSION_COOKIE, await sessionToken(expected), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Sans « rester connecté », le cookie meurt à la fermeture du navigateur.
    ...(remember ? { maxAge: REMEMBER_MAX_AGE } : {}),
  });

  redirect("/");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
