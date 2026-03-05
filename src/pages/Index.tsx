import { useRole } from "@/contexts/RoleContext";
import AgentDashboard from "@/pages/AgentDashboard";
import ReceptionistDashboard from "@/pages/ReceptionistDashboard";
import SupervisorDashboard from "@/pages/SupervisorDashboard";
import ManagerDashboard from "@/pages/ManagerDashboard";
import LoginPage from "@/pages/LoginPage";

const Index = () => {
  const { currentRole, loading, session } = useRole();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;

  if (!currentRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Perfil não encontrado. Contacte o gestor.</p>
      </div>
    );
  }

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
