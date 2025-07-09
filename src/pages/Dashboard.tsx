import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent } from "@/components/ui/card";

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redirecionar para agenda por padrão
    navigate("/dashboard/agenda", { replace: true });
  }, [navigate]);

  return (
    <DashboardLayout>
      <div className="flex items-center justify-center h-64">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-muted-foreground text-lg">
              Bem-vindo ao seu dashboard!
            </p>
            <p className="text-muted-foreground text-sm mt-2">
              Cadastre serviços e receba agendamentos para começar.
            </p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;