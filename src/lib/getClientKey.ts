import { supabase } from "@/integrations/supabase/client";

export async function getClientKey() {
  const { data: { user } } = await supabase.auth.getUser();

  if (user?.id) return `user:${user.id}`;

  let key = localStorage.getItem("client_key");
  if (!key) {
    // garante uma chave estável por navegador
    key = `anon:${crypto.randomUUID()}`;
    localStorage.setItem("client_key", key);
  }
  return key;
}