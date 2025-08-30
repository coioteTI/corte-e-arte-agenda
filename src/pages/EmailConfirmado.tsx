import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { CheckCircle } from "lucide-react";
import logo from "@/assets/logo.png";

const EmailConfirmado = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Scroll to top when component mounts
    window.scrollTo(0, 0);
  }, []);

  const handleAccessPlatform = () => {
    navigate("/planos");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-lg shadow-2xl border-0 bg-card/95 backdrop-blur-sm">
        <CardHeader className="text-center space-y-6 pb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-success/20 rounded-full blur-2xl" />
            <img 
              src={logo} 
              alt="Corte & Arte" 
              className="relative h-12 w-auto mx-auto drop-shadow-sm"
            />
          </div>
          
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-success/20 rounded-full blur-xl animate-pulse" />
              <CheckCircle className="relative h-20 w-20 text-success drop-shadow-lg" />
            </div>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-2xl md:text-3xl text-success font-bold">
              🎉 E-mail confirmado!
            </CardTitle>
            <p className="text-muted-foreground text-sm">
              Plataforma de Agendamento
            </p>
          </div>
        </CardHeader>
        
        <CardContent className="text-center space-y-8 px-6 pb-8">
          <div className="space-y-4">
            <p className="text-lg font-medium text-foreground">
              <strong>Parabéns!</strong> Seu cadastro foi concluído com sucesso.
            </p>
            
            <div className="bg-success-muted dark:bg-success-muted rounded-lg p-6 border border-success/20">
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                ✨ Agora você tem acesso a:
              </h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center justify-start gap-3">
                  <span className="text-lg">📅</span>
                  <span>Sistema completo de agendamentos</span>
                </div>
                <div className="flex items-center justify-start gap-3">
                  <span className="text-lg">👥</span>
                  <span>Gestão de clientes e profissionais</span>
                </div>
                <div className="flex items-center justify-start gap-3">
                  <span className="text-lg">📊</span>
                  <span>Relatórios e análises detalhadas</span>
                </div>
                <div className="flex items-center justify-start gap-3">
                  <span className="text-lg">🎯</span>
                  <span>Planos premium disponíveis</span>
                </div>
              </div>
            </div>
            
            <p className="text-muted-foreground">
              Clique no botão abaixo para acessar sua nova plataforma e começar a gerenciar seus agendamentos.
            </p>
          </div>
          
          <Button 
            onClick={handleAccessPlatform}
            size="lg" 
            className="w-full bg-success hover:bg-success/90 text-success-foreground font-semibold py-4 px-8 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105"
          >
            🚀 Acessar Plataforma
          </Button>
          
          <div className="pt-4 border-t border-border/50">
            <p className="text-sm text-muted-foreground font-medium">
              Seja bem-vindo ao <strong className="text-foreground">Corte & Arte</strong>!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Transformando o agendamento em barbearias e salões
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmailConfirmado;