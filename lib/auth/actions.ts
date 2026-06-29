"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE } from "@/lib/auth/session";

/** Clear the session cookie and return to the home (sign-in) screen. */
export async function signOut() {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 0,
  });
  redirect("/");
}
