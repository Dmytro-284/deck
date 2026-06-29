import { requireUser } from "@/lib/auth/require-user";
import { SettingsClient } from "@/components/auth/SettingsClient";
import styles from "./settings.module.css";

export default async function SettingsPage() {
  const { supabase, user } = await requireUser();
  const { data: u } = await supabase
    .from("users")
    .select("display_name,email,provider,google_id,telegram_id,password_hash,photo_url")
    .eq("id", user.id)
    .maybeSingle();

  const initial = {
    displayName: u?.display_name ?? "Безіменний",
    email: u?.email ?? null,
    photoUrl: u?.photo_url ?? null,
    linkedGoogle: !!u?.google_id,
    linkedTelegram: !!u?.telegram_id,
    hasPassword: !!u?.password_hash,
    isSyntheticEmail: !!u?.email && u.email.endsWith("@telegram.user"),
  };

  return (
    <main className={styles.page}>
      <SettingsClient initial={initial} />
    </main>
  );
}
