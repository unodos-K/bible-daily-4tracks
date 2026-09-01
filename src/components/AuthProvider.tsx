"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { AuthUser, getAuthUser, toAuthUser } from "@/lib/auth";

interface AuthContextValue {
  authUser: AuthUser | null;
  isAuthLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);

  useEffect(() => {
    let isActive = true;
    let receivedAuthEvent = false;
    const setAuthState = (user: AuthUser | null) => {
      if (!isActive) return;
      setAuthUser(user);
      setIsAuthLoading(false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      receivedAuthEvent = true;
      setAuthState(toAuthUser(session?.user));
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT') {
        router.refresh();
      }
    });

    getAuthUser().then((user) => {
      if (!receivedAuthEvent) setAuthState(user);
    }).catch((error) => {
      console.error("Failed to load auth session:", error);
      if (!receivedAuthEvent) setAuthState(null);
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, [router]);

  return (
    <AuthContext.Provider value={{ authUser, isAuthLoading }}>
      {children}
    </AuthContext.Provider>
  );
}
