import { useRole } from "@/contexts/RoleContext";
import { UserRole } from "@/data/mockData";
import { Headset, Building2, Eye, BarChart3 } from "lucide-react";

const roles: { value: UserRole; label: string; icon: React.ElementType }[] = [
  { value: "agente", label: "Agente", icon: Headset },
  { value: "recepcionista", label: "Recepcionista", icon: Building2 },
  { value: "supervisor", label: "Supervisor", icon: Eye },
  { value: "gestor", label: "Gestor", icon: BarChart3 },
];

export const RoleSelector = () => {
  const { currentRole, setCurrentRole, currentUser } = useRole();

  return (
    <div className="flex items-center gap-1 rounded-lg bg-muted p-1">
      {roles.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => setCurrentRole(value)}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-all ${
            currentRole === value
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-background"
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
      <span className="ml-2 text-xs text-muted-foreground hidden md:inline">
        ({currentUser.nome})
      </span>
    </div>
  );
};
