import { useRole } from "@/contexts/RoleContext";
import { RoleSelector } from "@/components/RoleSelector";
import AgentDashboard from "@/pages/AgentDashboard";
import ReceptionistDashboard from "@/pages/ReceptionistDashboard";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import { Car } from "lucide-react";

const Index = () => {
  const { currentRole } = useRole();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-primary p-1.5">
              <Car className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-sm font-bold leading-none">Lima's Centro Automotivo</h1>
              <p className="text-xs text-muted-foreground">CRM</p>
            </div>
          </div>
          <RoleSelector />
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {currentRole === "agente" && <AgentDashboard />}
        {currentRole === "recepcionista" && <ReceptionistDashboard />}
        {currentRole === "supervisor" && <SupervisorDashboard />}
        {currentRole === "gestor" && <ManagerDashboard />}
      </main>
    </div>
  );
};

export default Index;
