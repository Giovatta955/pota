import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseEnv } from "./env";

export async function createClient() {
  const store = await cookies(); // prima di tutto: rende la pagina dinamica
  const { url, anon } = supabaseEnv();
  return createServerClient(url, anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll(list) {
        try {
          list.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // chiamato da un Server Component: il refresh lo fa proxy.ts
        }
      },
    },
  });
}
