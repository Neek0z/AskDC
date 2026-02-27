import { createClient } from "@supabase/supabase-js";
import type { Profile } from "../types";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.warn(
    "[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY n'est pas défini. Configurez le fichier .env.local."
  );
}

export const supabase = createClient(supabaseUrl || "", supabaseAnonKey || "");

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("is_active", true)
    .single();

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Erreur chargement profil", error);
    return null;
  }

  return data as Profile;
}

