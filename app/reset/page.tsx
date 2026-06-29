import { Suspense } from "react";
import { ResetForm } from "@/components/auth/ResetForm";
import styles from "../login/login.module.css";

export default function ResetPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card}>
        <p className={styles.kicker}>Deckforge</p>
        <h1 className={styles.title}>Reset password</h1>
        <Suspense fallback={null}>
          <ResetForm />
        </Suspense>
      </section>
    </main>
  );
}
