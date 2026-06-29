import { Suspense } from "react";
import { redirect } from "next/navigation";
import { readSession } from "@/lib/auth/require-user";
import { serviceClient } from "@/lib/supabase/service";
import { AuthForm } from "@/components/auth/AuthForm";
import styles from "./login/login.module.css";

// Reads the session cookie — must be evaluated per request, never prerendered.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  // Already signed in with a real account → straight to the game.
  const session = await readSession();
  if (session && process.env.SUPABASE_SERVICE_KEY) {
    const { data } = await serviceClient()
      .from("users")
      .select("id")
      .eq("id", session.id)
      .eq("status", "active")
      .maybeSingle();
    if (data) redirect("/play");
  }

  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Roguelike deckbuilder</p>
        <h1 className={styles.title}>⚔ Deckforge</h1>
        <p className={styles.lore}>
          Увійди, щоб грати, зберігати прогрес у хмарі й змагатися в рейтингу.
        </p>
        <Suspense fallback={null}>
          <AuthForm />
        </Suspense>
      </section>
    </main>
  );
}
