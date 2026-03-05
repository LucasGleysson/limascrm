import React, { createContext, useContext, useState, ReactNode } from "react";
import { UserRole, Usuario, MOCK_USUARIOS } from "@/data/mockData";

interface RoleContextType {
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  currentUser: Usuario;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export const RoleProvider = ({ children }: { children: ReactNode }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>("agente");

  const currentUser = MOCK_USUARIOS.find((u) => u.cargo === currentRole) || MOCK_USUARIOS[0];

  return (
    <RoleContext.Provider value={{ currentRole, setCurrentRole, currentUser }}>
      {children}
    </RoleContext.Provider>
  );
};

export const useRole = () => {
  const context = useContext(RoleContext);
  if (!context) throw new Error("useRole must be used within RoleProvider");
  return context;
};
