// Hand-trimmed Supabase types for Deckforge — only the tables/functions the
// auth + cloud-save layer touches (full euroutes schema is much larger). Keep
// in sync with migrations under the Supabase project ikicfkfscigshglvtpws.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string | null;
          role: string;
          created_at: string;
          last_login: string | null;
          password_hash: string | null;
          status: string;
          provider: string;
          google_id: string | null;
          telegram_id: string | null;
          photo_url: string | null;
          display_name: string;
          deleted_at: string | null;
          reset_token_hash: string | null;
          reset_token_expires: string | null;
        };
        Insert: {
          id: string;
          email?: string | null;
          role?: string;
          created_at?: string;
          last_login?: string | null;
          password_hash?: string | null;
          status?: string;
          provider?: string;
          google_id?: string | null;
          telegram_id?: string | null;
          photo_url?: string | null;
          display_name?: string;
          deleted_at?: string | null;
          reset_token_hash?: string | null;
          reset_token_expires?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
        Relationships: [];
      };
      deckforge_saves: {
        Row: { user_id: string; run: Json | null; meta: Json; updated_at: string };
        Insert: { user_id: string; run?: Json | null; meta?: Json; updated_at?: string };
        Update: Partial<Database["public"]["Tables"]["deckforge_saves"]["Insert"]>;
        Relationships: [];
      };
      deckforge_scores: {
        Row: {
          id: number;
          user_id: string;
          name: string;
          hero: string;
          act: number;
          won: boolean;
          score: number;
          daily_date: string | null;
          seed: number | null;
          created_at: string;
        };
        Insert: {
          user_id: string;
          name?: string;
          hero: string;
          act: number;
          won?: boolean;
          score: number;
          daily_date?: string | null;
          seed?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["deckforge_scores"]["Insert"]>;
        Relationships: [];
      };
      rate_limits: {
        Row: { key: string; count: number; window_start: string };
        Insert: { key: string; count?: number; window_start?: string };
        Update: Partial<Database["public"]["Tables"]["rate_limits"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_ms: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
