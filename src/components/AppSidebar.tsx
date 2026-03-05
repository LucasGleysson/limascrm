import { Car, LogOut } from "lucide-react";
import { useRole } from "@/contexts/RoleContext";
import { useLeads } from "@/contexts/LeadContext";

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs: { id: string; label: string; icon: React.ElementType }[];
}

export const AppSidebar = ({ activeTab, onTabChange, tabs }: AppSidebarProps) => {
  const { currentUser, logout } = useRole();
  const { unidades } = useLeads();

  if (!currentUser) return null;

  const unidadeNome = currentUser.unidade_padrao
    ? unidades.find((u) => u.id === currentUser.unidade_padrao)?.nome || ""
    : "";

  return (
    <aside className="w-64 min-h-screen bg-sidebar flex flex-col border-r border-sidebar-border shrink-0">
      <div className="p-5 flex items-center gap-3">
        <div className="rounded-lg bg-sidebar-primary p-2">
          <Car className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-bold text-sidebar-foreground">AutoCRM</p>
          <p className="text-xs text-sidebar-foreground/60">{unidadeNome}</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-2 space-y-1">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === id
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-9 w-9 rounded-full bg-sidebar-accent flex items-center justify-center text-sm font-semibold text-sidebar-foreground">
            {currentUser.nome.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-sidebar-foreground truncate">{currentUser.nome}</p>
            <p className="text-xs text-sidebar-foreground/60 capitalize">{currentUser.cargo}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </button>
      </div>
    </aside>
  );
};
