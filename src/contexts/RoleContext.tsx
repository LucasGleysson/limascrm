import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export type UserRole = "agente" | "recepcionista" | "supervisor" | "gestor";

export interface AppUser {
  id: string;
  nome: string;
  email: string;
  cargo: UserRole;
  unidade_padrao?: string | null;
}

interface RoleContextType {
  currentRole: UserRole | null;
  currentUser: AppUser | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Defer profile fetch to avoid deadlock with auth state
        setTimeout(() => fetchProfile(session.user), 0);
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (user: User) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (data) {
      setCurrentUser({
        id: data.id,
        nome: data.nome,
        email: data.email,
        cargo: data.cargo as UserRole,
        unidade_padrao: data.unidade_padrao,
      });
    }
    setLoading(false);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setCurrentUser(null);
    setSession(null);
  };

  const currentRole = currentUser?.cargo || null;

  return (
    <RoleContext.Provider value={{ currentRole, currentUser, session, loading, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
};
