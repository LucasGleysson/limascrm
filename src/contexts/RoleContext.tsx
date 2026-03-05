import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserRole, Usuario, MOCK_USUARIOS } from "@/data/mockData";

interface RoleContextType {
  currentRole: UserRole | null;
  setCurrentRole: (role: UserRole | null) => void;
  currentUser: Usuario;
  logout: () => void;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  const currentUser = MOCK_USUARIOS.find((u) => u.cargo === (currentRole || "agente")) || MOCK_USUARIOS[0];

  const logout = () => setCurrentRole(null);

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, currentUser, logout }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
};
