import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para agenda por padrão
    navigate("/dashboard/agenda", { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Redirecionando...</p>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;