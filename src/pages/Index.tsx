import { useRole } from "@/contexts/RoleContext";
import { Car, Users, LayoutDashboard, CalendarDays, LogOut } from "lucide-react";
import AgentDashboard from "@/pages/AgentDashboard";
import ReceptionistDashboard from "@/pages/ReceptionistDashboard";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import { UserRole } from "@/data/mockData";

const PROFILES: { role: UserRole; label: string; desc: string; icon: React.ElementType }[] = [
  { role: "agente", label: "Agente", desc: "Central de atendimento", icon: Users },
  { role: "supervisor", label: "Supervisor", desc: "Visão completa", icon: LayoutDashboard },
  { role: "recepcionista", label: "Recepcionista", desc: "Oficina", icon: CalendarDays },
  { role: "gestor", label: "Gestor", desc: "Visão financeira", icon: LayoutDashboard },
];

const ProfileSelector = () => {
  const { setCurrentRole } = useRole();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-2xl bg-primary p-4">
            <Car className="h-10 w-10 text-primary-foreground" />
          </div>
          <h1 className="text-3xl font-bold">AutoCRM</h1>
          <p className="text-muted-foreground">Centro Automotivo</p>
        </div>

        <p className="text-center text-muted-foreground text-sm">Selecione seu perfil</p>

        <div className="space-y-3">
          {PROFILES.map(({ role, label, desc, icon: Icon }) => (
            <button
              key={role}
              onClick={() => setCurrentRole(role)}
              className="w-full flex items-center gap-4 p-4 rounded-xl bg-card border border-border hover:border-primary/40 hover:shadow-md transition-all text-left"
            >
              <div className="rounded-xl bg-primary/10 p-3">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{label}</p>
                <p className="text-sm text-muted-foreground">{desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

const Index = () => {
  const { currentRole } = useRole();

  if (!currentRole) return <ProfileSelector />;

  return (
    <>
      {currentRole === "agente" && <AgentDashboard />}
      {currentRole === "recepcionista" && <ReceptionistDashboard />}
      {currentRole === "supervisor" && <SupervisorDashboard />}
      {currentRole === "gestor" && <ManagerDashboard />}
    </>
  );
};

export default Index;
