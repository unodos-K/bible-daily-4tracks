"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        document.cookie = `is-logged-in=true; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
      } else {
        document.cookie = `is-logged-in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax`;
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return <>{children}</>;
}
