import { createClient } from "@supabase/supabase-js";

// Client admin avec service_role key - NE JAMAIS UTILISER CÔTÉ CLIENT
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
