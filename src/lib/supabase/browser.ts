"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseConfig } from "./config";

/** Browser client — used only for auth flows (magic link). Data goes through the API. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseConfig.url, supabaseConfig.publishableKey);
}
